import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild, ElementRef } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { SessionService } from '../../../core/auth/session.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { SignalRService } from '../../../core/realtime/signalr.service';
import { StateCardComponent } from '../../../shared/components/state-card/state-card.component';
import { MessagesApiService } from '../services/messages-api.service';
import { UnreadCountService } from '../services/unread-count.service';
import { MessageDto } from '../models/messages.models';
import { ChatbotService, GROQ_BOT_DISPLAY_NAME, GROQ_BOT_USER_ID } from '../services/chatbot.service';
import { ChatbotMessageDto } from '../models/chatbot.models';
import { UserAvatarComponent } from '../../users/components/user-avatar.component';
import { UserDto } from '../../users/models/users.models';


@Component({
    selector: 'app-messages-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [DatePipe, FormsModule, ReactiveFormsModule, StateCardComponent, UserAvatarComponent],
    templateUrl: './messages.page.html',
    styleUrl: './messages.page.scss',
})
export class MessagesPage {
    private readonly messagesApi = inject(MessagesApiService);
    private readonly feedback = inject(FeedbackService);
    private readonly sessionService = inject(SessionService);
    private readonly formBuilder = inject(NonNullableFormBuilder);
    private readonly route = inject(ActivatedRoute);
    readonly signalRService = inject(SignalRService);
    private readonly unreadCountService = inject(UnreadCountService);
    readonly chatbotService = inject(ChatbotService);

    readonly conversations = signal<MessageDto[]>([]);
    readonly selectedConversation = signal<MessageDto[]>([]);
    readonly selectedUserId = signal<string | null>(null);
    readonly selectedUserInfo = signal<{ name: string; avatar?: string } | null>(null);
    readonly loading = signal(false);
    readonly sending = signal(false);
    readonly error = signal<string | null>(null);

    /** Conjunto de IDs que están escribiendo. Mantenido localmente porque
     *  typing es un estado transiente, no requiere snapshot inicial. */
    readonly typingUsers = signal<Set<string>>(new Set());
    private typingTimeout: ReturnType<typeof setTimeout> | null = null;

    // Referencia al contenedor de mensajes para scroll automático
    readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
    readonly chatbotMessagesContainer = viewChild<ElementRef<HTMLDivElement>>('chatbotMessagesContainer');

    /** Contador global de mensajes no leídos (state-driven, sin polling). */
    readonly unreadCount = this.unreadCountService.count;

    readonly messageForm = this.formBuilder.group({
        content: ['', [Validators.required, Validators.maxLength(2000)]],
    });

    readonly currentUserId = computed(() => this.sessionService.userId());
    readonly hasSelectedConversation = computed(() => this.selectedUserId() !== null);
    readonly isChatbotSelected = computed(() => this.selectedUserId() === GROQ_BOT_USER_ID);

    readonly selectedUserName = computed(() => {
        const userInfo = this.selectedUserInfo();
        if (userInfo) return userInfo.name;

        const userId = this.selectedUserId();
        if (!userId) return '';

        const conv = this.conversations().find(
            (m) => m.senderId === userId || m.receiverId === userId
        );

        if (!conv) return 'Usuario';

        const isSender = conv.senderId === userId;
        return isSender ? conv.senderUsername : conv.receiverUsername;
    });

    readonly selectedUserAvatar = computed(() => {
        const userInfo = this.selectedUserInfo();
        if (userInfo) return userInfo.avatar;

        const userId = this.selectedUserId();
        if (!userId) return undefined;

        const conv = this.conversations().find(
            (m) => m.senderId === userId || m.receiverId === userId
        );

        if (!conv) return undefined;

        const isSender = conv.senderId === userId;
        return isSender ? conv.senderAvatar : conv.receiverAvatar;
    });

    readonly isSelectedUserOnline = computed(() => {
        const userId = this.selectedUserId();
        return this.signalRService.isUserOnline(userId);
    });

    readonly isSelectedUserTyping = computed(() => {
        const userId = this.selectedUserId();
        return userId ? this.typingUsers().has(userId) : false;
    });

    constructor() {
        void this.loadConversations();

        // Conectar a SignalR
        this.connectToSignalR();

        // Escuchar mensajes en tiempo real
        this.listenToNewMessages();

        // Escuchar eventos de estado de usuarios
        this.listenToUserStatus();

        // Verificar si hay un userId en los query params para iniciar conversación
        this.checkForNewConversation();

        // Hacer scroll automático cuando cambian los mensajes
        effect(() => {
            const messages = this.selectedConversation();
            if (messages.length > 0) {
                setTimeout(() => this.scrollToBottom(), 100);
            }
        });

        // Hacer scroll automático cuando llegan mensajes del chatbot
        effect(() => {
            const chatbotMessages = this.chatbotService.messages();
            if (chatbotMessages.length > 0) {
                setTimeout(() => this.scrollToBottom(), 100);
            }
        });
    }

    /**
     * Conecta a SignalR para recibir mensajes en tiempo real
     */
    private async connectToSignalR(): Promise<void> {
        try {
            await this.signalRService.startConnection();
        } catch (error) {
            console.error('Error al conectar a SignalR:', error);
        }
    }

    /**
     * Escucha nuevos mensajes en tiempo real
     */
    private listenToNewMessages(): void {
        this.signalRService.onMessageReceived.subscribe((message) => {
            console.log('Nuevo mensaje recibido:', message);

            const currentUserId = this.currentUserId();
            const selectedUserId = this.selectedUserId();
            const isForMe = message.receiverId === currentUserId;
            const isFromActiveConversation =
                selectedUserId !== null &&
                (message.senderId === selectedUserId || message.receiverId === selectedUserId);

            // Si es de la conversación actual, agregarlo
            if (isFromActiveConversation) {
                // Verificar que no exista ya en la lista
                this.selectedConversation.update(messages => {
                    const exists = messages.some(m => m.messageId === message.messageId);
                    if (exists) {
                        return messages;
                    }
                    return [...messages, message];
                });

                // Actualizar info del usuario si no existe
                if (!this.selectedUserInfo()) {
                    const isOtherUserSender = message.senderId !== currentUserId;
                    this.selectedUserInfo.set({
                        name: isOtherUserSender ? message.senderUsername : message.receiverUsername,
                        avatar: isOtherUserSender ? message.senderAvatar : message.receiverAvatar
                    });
                }
            }

            // Si llegó dirigido a mí Y estoy mirando esa conversación → marcar leído
            // inmediatamente. Esto evita que aparezca el puntito azul fugaz.
            // El UnreadCountService ya hizo +1 al recibir el evento; lo compensamos
            // restando 1 acá para que el contador global no sume mensajes que el
            // usuario YA está viendo.
            if (isForMe && isFromActiveConversation && message.senderId === selectedUserId) {
                this.messagesApi.markAsRead(message.messageId).subscribe({
                    error: (err) => console.warn('No se pudo marcar mensaje como leído', err),
                });
                this.unreadCountService.decrement(1);
            }

            // Actualizar la lista de conversaciones
            this.updateConversationsList(message);
        });
    }

    /**
     * Actualiza la lista de conversaciones con un nuevo mensaje
     * Evita duplicados y mantiene la conversación más reciente arriba
     */
    private updateConversationsList(message: MessageDto): void {
        const currentConversations = this.conversations();
        const currentUserId = this.currentUserId();

        // Encontrar si ya existe una conversación con este usuario
        const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
        const existingIndex = currentConversations.findIndex(
            c => {
                const convOtherUserId = c.senderId === currentUserId ? c.receiverId : c.senderId;
                return convOtherUserId === otherUserId;
            }
        );

        if (existingIndex >= 0) {
            // Actualizar conversación existente
            const updated = [...currentConversations];
            updated[existingIndex] = message;
            // Mover al inicio
            const [movedConv] = updated.splice(existingIndex, 1);
            updated.unshift(movedConv);
            this.conversations.set(updated);
        } else {
            // Agregar nueva conversación al inicio
            this.conversations.set([message, ...currentConversations]);
        }
    }

    /**
     * Escucha eventos de typing.
     * NOTA: presencia online/offline se maneja centralmente en SignalRService
     * (signal compartido `onlineUsers`). Este componente la lee vía
     * `signalRService.isUserOnline()` — no hay suscripción duplicada acá.
     */
    private listenToUserStatus(): void {
        // Usuario está escribiendo
        this.signalRService.onUserTyping.subscribe((userId) => {
            this.typingUsers.update(users => {
                const newSet = new Set(users);
                newSet.add(userId);
                return newSet;
            });
        });

        // Usuario dejó de escribir
        this.signalRService.onUserStopTyping.subscribe((userId) => {
            this.typingUsers.update(users => {
                const newSet = new Set(users);
                newSet.delete(userId);
                return newSet;
            });
        });
    }

    /**
     * Verifica si hay un userId en los query params para iniciar una nueva conversación
     */
    private checkForNewConversation(): void {
        this.route.queryParams.subscribe(params => {
            const userId = params['userId'];
            if (userId && userId !== this.currentUserId()) {
                // Iniciar conversación con este usuario
                void this.startNewConversation(userId);
            }
        });
    }

    /**
     * Inicia una nueva conversación con un usuario
     */
    async startNewConversation(userId: string): Promise<void> {
        this.selectedUserId.set(userId);

        // OPTIMISTIC: si entramos a una conversación con no-leídos (vía click,
        // queryParam o navegación directa), el puntito azul desaparece YA.
        // Idempotente: si selectConversation ya lo hizo, esta llamada no hace nada.
        this.markConversationAsReadLocally(userId);

        try {
            // Intentar cargar mensajes existentes
            const messages = await firstValueFrom(
                this.messagesApi.getConversation(userId, { limit: 50 })
            );
            this.selectedConversation.set(messages.reverse());

            // Guardar info del usuario desde el primer mensaje
            if (messages.length > 0) {
                const firstMsg = messages[0];
                const currentUserId = this.currentUserId();
                const isOtherUserSender = firstMsg.senderId !== currentUserId;

                this.selectedUserInfo.set({
                    name: isOtherUserSender ? firstMsg.senderUsername : firstMsg.receiverUsername,
                    avatar: isOtherUserSender ? firstMsg.senderAvatar : firstMsg.receiverAvatar
                });

                // Marcar como leído + actualizar local state
                await this.markConversationAsReadAndSync(userId);
            } else {
                // Si no hay mensajes, intentar obtener info de conversations
                const conv = this.conversations().find(
                    (m) => m.senderId === userId || m.receiverId === userId
                );
                if (conv) {
                    const isSender = conv.senderId === userId;
                    this.selectedUserInfo.set({
                        name: isSender ? conv.senderUsername : conv.receiverUsername,
                        avatar: isSender ? conv.senderAvatar : conv.receiverAvatar
                    });
                }
            }
        } catch {
            // Si no hay mensajes, simplemente iniciar una conversación vacía
            this.selectedConversation.set([]);

            // Intentar obtener info de conversations
            const conv = this.conversations().find(
                (m) => m.senderId === userId || m.receiverId === userId
            );
            if (conv) {
                const isSender = conv.senderId === userId;
                this.selectedUserInfo.set({
                    name: isSender ? conv.senderUsername : conv.receiverUsername,
                    avatar: isSender ? conv.senderAvatar : conv.receiverAvatar
                });
            }
        }
    }

    /**
     * Update LOCAL inmediato (sin tocar la red).
     * Marca isRead=true en todos los mensajes de la conversación con `otherUserId`
     * que el usuario actual aún tenía como no leídos, y decrementa el contador
     * global por esa cantidad exacta.
     *
     * Esto es lo que hace que el puntito azul desaparezca AL INSTANTE en cuanto
     * el usuario interactúa con la conversación (click o typing), sin esperar
     * la respuesta del servidor.
     *
     * Es idempotente: llamarlo dos veces seguidas no decrementa de más.
     *
     * @returns cantidad de mensajes que pasaron de no-leído a leído.
     */
    private markConversationAsReadLocally(otherUserId: string): number {
        const currentUserId = this.currentUserId();
        if (!currentUserId) return 0;

        const isUnreadFromOther = (m: MessageDto) =>
            m.receiverId === currentUserId &&
            m.senderId === otherUserId &&
            !m.isRead;

        const unreadInConv =
            this.conversations().filter(isUnreadFromOther).length +
            this.selectedConversation().filter(isUnreadFromOther).length;

        if (unreadInConv === 0) {
            return 0; // Nada que marcar, evita updates innecesarios al signal
        }

        this.conversations.update((convs) =>
            convs.map((c) =>
                isUnreadFromOther(c) ? { ...c, isRead: true } : c
            )
        );
        this.selectedConversation.update((msgs) =>
            msgs.map((m) =>
                isUnreadFromOther(m) ? { ...m, isRead: true } : m
            )
        );
        this.unreadCountService.decrement(unreadInConv);

        return unreadInConv;
    }

    /**
     * Marca la conversación con `otherUserId` como leída en el backend Y
     * sincroniza el estado local: pone isRead=true en todos los mensajes
     * de esa conversación que el usuario actual aún tenía como no leídos,
     * y decrementa el contador global de no leídos en esa cantidad.
     *
     * Hace el local update PRIMERO (optimistic) para que el puntito azul
     * desaparezca instantáneamente; luego confirma con el backend.
     */
    private async markConversationAsReadAndSync(otherUserId: string): Promise<void> {
        // 1. Optimistic local update — puntito azul fuera al instante
        this.markConversationAsReadLocally(otherUserId);

        // 2. Confirmación con el backend
        try {
            await firstValueFrom(this.messagesApi.markConversationAsRead(otherUserId));
        } catch (err) {
            console.warn('No se pudo marcar la conversación como leída en el servidor', err);
            // El optimistic ya quedó. Si el servidor falla, en el próximo
            // load el estado se reconcilia con el real.
        }
    }

    async loadConversations(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            const data = await firstValueFrom(this.messagesApi.getConversationsList({ limit: 50 }));
            this.conversations.set(data);
        } catch (err) {
            this.error.set(getErrorMessage(err, 'No se pudieron cargar las conversaciones'));
        } finally {
            this.loading.set(false);
        }
    }

    async selectConversation(message: MessageDto): Promise<void> {
        const currentUserId = this.currentUserId();
        if (!currentUserId) return;

        const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;

        // OPTIMISTIC: el puntito azul tiene que desaparecer en el milisegundo del click,
        // antes de cualquier llamada de red. Marcamos local primero. La confirmación
        // con el server la hace después markConversationAsReadAndSync (idempotente).
        this.markConversationAsReadLocally(otherUserId);

        // Guardar info del usuario antes de cargar la conversación
        const isSender = message.senderId !== currentUserId;
        this.selectedUserInfo.set({
            name: isSender ? message.senderUsername : message.receiverUsername,
            avatar: isSender ? message.senderAvatar : message.receiverAvatar
        });

        await this.startNewConversation(otherUserId);
    }

    async selectChatbotConversation(): Promise<void> {
        this.selectedUserId.set(GROQ_BOT_USER_ID);
        this.selectedUserInfo.set({ name: GROQ_BOT_DISPLAY_NAME, avatar: undefined });
        this.selectedConversation.set([]);
        await this.chatbotService.loadHistory();
    }

    async sendMessage(): Promise<void> {
        if (this.isChatbotSelected()) {
            await this.sendChatbotMessage();
            return;
        }

        if (this.messageForm.invalid || this.sending()) {
            return;
        }

        const userId = this.selectedUserId();
        if (!userId) return;

        this.sending.set(true);

        try {
            const { content } = this.messageForm.getRawValue();
            const newMessage = await firstValueFrom(
                this.messagesApi.sendMessage({ receiverId: userId, content })
            );

            // Verificar que no exista ya en la lista antes de agregar
            this.selectedConversation.update((messages) => {
                const exists = messages.some(m => m.messageId === newMessage.messageId);
                if (exists) {
                    return messages;
                }
                return [...messages, newMessage];
            });

            this.messageForm.reset();

            // Notificar que dejó de escribir
            await this.signalRService.notifyStopTyping(userId);

            // Actualizar la lista de conversaciones
            this.updateConversationsList(newMessage);
        } catch (err) {
            this.feedback.error(getErrorMessage(err, 'No se pudo enviar el mensaje'));
        } finally {
            this.sending.set(false);
        }
    }

    async sendChatbotMessage(): Promise<void> {
        if (this.messageForm.invalid || this.chatbotService.sending()) {
            return;
        }

        const { content } = this.messageForm.getRawValue();
        await this.chatbotService.sendMessage(content ?? '');

        if (this.chatbotService.error()) {
            this.feedback.error(this.chatbotService.error()!);
            return;
        }

        this.messageForm.reset();
    }

    /**
     * Maneja el evento de escritura en el input.
     * - Si todavía quedaba algún mensaje no-leído en la conversación abierta,
     *   lo marca como leído al instante (el puntito azul desaparece apenas
     *   el usuario empieza a escribir).
     * - Notifica al otro usuario que estoy escribiendo.
     */
    onInputChange(): void {
        const userId = this.selectedUserId();
        if (!userId) return;

        // Empezar a escribir es señal clara de que el usuario VIO la conversación.
        // Idempotente con el optimistic ya hecho al click.
        const marked = this.markConversationAsReadLocally(userId);
        if (marked > 0) {
            // Si efectivamente había mensajes que pasaron a leído, confirmar al server
            // de forma asíncrona y silenciosa.
            this.messagesApi.markConversationAsRead(userId).subscribe({
                error: (err) => console.warn('No se pudo confirmar lectura al servidor', err),
            });
        }

        // Notificar typing
        void this.signalRService.notifyTyping(userId);

        // Limpiar timeout anterior
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Después de 2 segundos sin escribir, notificar que dejó de escribir
        this.typingTimeout = setTimeout(() => {
            void this.signalRService.notifyStopTyping(userId);
        }, 2000);
    }

    closeConversation(): void {
        this.selectedUserId.set(null);
        this.selectedConversation.set([]);
        this.selectedUserInfo.set(null);
        this.messageForm.reset();
        this.chatbotService.reset();
    }

    getOtherUserId(message: MessageDto): string {
        const currentUserId = this.currentUserId();
        return message.senderId === currentUserId ? message.receiverId : message.senderId;
    }

    getOtherUserName(message: MessageDto): string {
        const currentUserId = this.currentUserId();
        return message.senderId === currentUserId ? message.receiverUsername : message.senderUsername;
    }

    getOtherUserAvatar(message: MessageDto): string | undefined {
        const currentUserId = this.currentUserId();
        return message.senderId === currentUserId ? message.receiverAvatar : message.senderAvatar;
    }

    isUnread(message: MessageDto): boolean {
        const currentUserId = this.currentUserId();
        return message.receiverId === currentUserId && !message.isRead;
    }

    isUserOnline(userId: string): boolean {
        return this.signalRService.isUserOnline(userId);
    }

    isSentByMe(message: MessageDto): boolean {
        return message.senderId === this.currentUserId();
    }

    toUserDto(message: MessageDto, isSender: boolean): UserDto {
        return {
            userId: isSender ? message.senderId : message.receiverId,
            nickname: isSender ? message.senderUsername : message.receiverUsername,
            email: isSender ? message.senderUsername : message.receiverUsername,
            profilePhotoUrl: isSender ? message.senderAvatar : message.receiverAvatar,
        };
    }

    trackMessage(_index: number, message: MessageDto): string {
        return message.messageId;
    }

    trackChatbotMessage(_index: number, message: ChatbotMessageDto): string {
        return message.chatbotMessageId;
    }

    /**
     * Hace scroll automático al final del contenedor de mensajes
     */
    private scrollToBottom(): void {
        if (this.isChatbotSelected()) {
            const container = this.chatbotMessagesContainer()?.nativeElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        } else {
            const container = this.messagesContainer()?.nativeElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }
}
