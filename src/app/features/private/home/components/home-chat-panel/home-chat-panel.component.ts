import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, output, resource, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../../../core/api/api.utils';
import { SessionService } from '../../../../../core/auth/session.service';
import { SignalRService } from '../../../../../core/realtime/signalr.service';
import { FeedbackService } from '../../../../../core/ui/feedback.service';
import { StateCardComponent } from '../../../../../shared/components/state-card/state-card.component';
import { ChatbotMessageDto } from '../../../../messages/models/chatbot.models';
import { MessageDto } from '../../../../messages/models/messages.models';
import { ChatbotService, GROQ_BOT_DISPLAY_NAME, GROQ_BOT_USER_ID } from '../../../../messages/services/chatbot.service';
import { MessagesApiService } from '../../../../messages/services/messages-api.service';
import { UnreadCountService } from '../../../../messages/services/unread-count.service';
import { UserAvatarComponent } from '../../../../users/components/user-avatar.component';
import { UserDto } from '../../../../users/models/users.models';

@Component({
  selector: 'app-home-chat-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, StateCardComponent, UserAvatarComponent],
  templateUrl: './home-chat-panel.component.html',
  styleUrl: './home-chat-panel.component.scss',
})
export class HomeChatPanelComponent {
  private readonly messagesApi = inject(MessagesApiService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly signalRService = inject(SignalRService);
  private readonly feedback = inject(FeedbackService);
  private readonly unreadCountService = inject(UnreadCountService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly chatbotService = inject(ChatbotService);

  readonly closeRequested = output<void>();
  readonly currentUserId = computed(() => this.sessionService.userId());
  readonly threadContainer = viewChild<ElementRef<HTMLDivElement>>('threadContainer');

  readonly conversationsResource = resource({
    loader: async () => firstValueFrom(this.messagesApi.getConversationsList({ limit: 20 })),
  });

  readonly conversationsState = signal<MessageDto[]>([]);
  readonly selectedUserId = signal<string | null>(null);
  readonly selectedUserInfo = signal<{ name: string; avatar?: string } | null>(null);
  readonly threadMessages = signal<MessageDto[]>([]);
  readonly threadLoading = signal(false);
  readonly threadError = signal<string | null>(null);
  readonly sendError = signal<string | null>(null);
  readonly sending = signal(false);

  readonly messageForm = this.formBuilder.group({
    content: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly hasActiveConversation = computed(() => this.selectedUserId() !== null);
  readonly isChatbotSelected = computed(() => this.selectedUserId() === GROQ_BOT_USER_ID);
  readonly conversations = computed(() => this.conversationsState());
  readonly errorMessage = computed(() => {
    const error = this.conversationsResource.error();
    return error ? getErrorMessage(error, 'No pudimos cargar tus conversaciones.') : null;
  });
  readonly selectedUserName = computed(() => {
    if (this.isChatbotSelected()) {
      return GROQ_BOT_DISPLAY_NAME;
    }

    const userInfo = this.selectedUserInfo();
    if (userInfo) {
      return userInfo.name;
    }

    const selectedUserId = this.selectedUserId();
    if (!selectedUserId) {
      return '';
    }

    const conversation = this.conversations().find(
      (message) => this.getOtherUserId(message) === selectedUserId,
    );

    return conversation ? this.getOtherUserName(conversation) : 'Conversación';
  });
  readonly selectedUserAvatar = computed(() => {
    if (this.isChatbotSelected()) {
      return undefined;
    }

    const userInfo = this.selectedUserInfo();
    if (userInfo) {
      return userInfo.avatar;
    }

    const selectedUserId = this.selectedUserId();
    if (!selectedUserId) {
      return undefined;
    }

    const conversation = this.conversations().find(
      (message) => this.getOtherUserId(message) === selectedUserId,
    );

    return conversation ? this.toUserDto(conversation).profilePhotoUrl : undefined;
  });
  readonly isSelectedUserOnline = computed(() =>
    this.isChatbotSelected() ? false : this.signalRService.isUserOnline(this.selectedUserId()),
  );

  constructor() {
    effect(() => {
      const conversations = this.conversationsResource.value();
      if (conversations) {
        this.conversationsState.set(conversations);
      }
    });

    effect(() => {
      const selectedUserId = this.selectedUserId();
      const messages = this.threadMessages();

      if (!selectedUserId || messages.length === 0) {
        return;
      }

      globalThis.setTimeout(() => this.scrollThreadToBottom(), 0);
    });

    // Scroll automático cuando llegan mensajes del chatbot
    effect(() => {
      if (!this.isChatbotSelected()) {
        return;
      }

      const chatbotMessages = this.chatbotService.messages();
      if (chatbotMessages.length > 0) {
        globalThis.setTimeout(() => this.scrollThreadToBottom(), 0);
      }
    });

    void this.ensureRealtimeConnection();
    this.listenToIncomingMessages();
  }

  protected closePanel(): void {
    this.closeRequested.emit();
  }

  protected reloadConversations(): void {
    this.conversationsResource.reload();
  }

  protected async openConversation(message: MessageDto): Promise<void> {
    const userId = this.getOtherUserId(message);
    if (!userId) {
      return;
    }

    this.selectedUserId.set(userId);
    this.selectedUserInfo.set({
      name: this.getOtherUserName(message),
      avatar: this.toUserDto(message).profilePhotoUrl ?? undefined,
    });

    this.markConversationAsReadLocally(userId);
    await this.loadConversationThread(userId);
  }

  protected async openChatbotConversation(): Promise<void> {
    this.selectedUserId.set(GROQ_BOT_USER_ID);
    this.selectedUserInfo.set({
      name: 'Groq',
      avatar: undefined,
    });
    await this.chatbotService.loadHistory();
  }

  protected async openInbox(): Promise<void> {
    await this.router.navigate(['/messages']);
    this.closeRequested.emit();
  }

  protected async openActiveConversationInInbox(): Promise<void> {
    const userId = this.selectedUserId();
    await this.router.navigate(['/messages'], {
      queryParams: userId ? { userId } : undefined,
    });
    this.closeRequested.emit();
  }

  protected closeConversation(): void {
    this.selectedUserId.set(null);
    this.selectedUserInfo.set(null);
    this.threadMessages.set([]);
    this.threadError.set(null);
    this.sendError.set(null);
    this.chatbotService.reset();
    this.messageForm.reset();
  }

  /** Send on Enter (without Shift), allow Shift+Enter for newline. */
  protected onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = this.messageForm;
      if (form.valid) {
        if (this.isChatbotSelected()) {
          void this.sendChatbotMessage();
        } else {
          void this.sendMessage();
        }
      }
    }
  }

  protected async retryThread(): Promise<void> {
    const userId = this.selectedUserId();
    if (!userId) {
      return;
    }

    await this.loadConversationThread(userId);
  }

  protected async sendMessage(): Promise<void> {
    if (this.isChatbotSelected()) {
      await this.sendChatbotMessage();
      return;
    }

    if (this.messageForm.invalid || this.sending()) {
      return;
    }

    const receiverId = this.selectedUserId();
    if (!receiverId) {
      return;
    }

    const { content } = this.messageForm.getRawValue();
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    this.sending.set(true);
    this.sendError.set(null);

    try {
      const sentMessage = await firstValueFrom(
        this.messagesApi.sendMessage({ receiverId, content: trimmedContent }),
      );

      this.appendThreadMessage(sentMessage);
      this.upsertConversationPreview(sentMessage);
      this.messageForm.reset();
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos enviar tu respuesta.');
      this.sendError.set(message);
      this.feedback.error(message, { title: 'Error al enviar mensaje' });
    } finally {
      this.sending.set(false);
    }
  }

  protected async sendChatbotMessage(): Promise<void> {
    if (this.messageForm.invalid || this.chatbotService.sending()) {
      return;
    }

    const { content } = this.messageForm.getRawValue();
    await this.chatbotService.sendMessage(content ?? '');

    const error = this.chatbotService.error();
    if (error) {
      this.feedback.error(error, { title: 'Error al enviar mensaje' });
      return;
    }

    this.messageForm.reset();
  }

  private async loadConversationThread(otherUserId: string): Promise<void> {
    this.threadLoading.set(true);
    this.threadError.set(null);
    this.sendError.set(null);
    this.threadMessages.set([]);

    try {
      const messages = await firstValueFrom(this.messagesApi.getConversation(otherUserId, { limit: 50 }));
      this.threadMessages.set([...messages].reverse());
      this.markConversationAsReadLocally(otherUserId);
      await this.markConversationAsReadOnServer(otherUserId);
    } catch (error) {
      this.threadError.set(getErrorMessage(error, 'No pudimos cargar esta conversación.'));
    } finally {
      this.threadLoading.set(false);
    }
  }

  private async ensureRealtimeConnection(): Promise<void> {
    try {
      await this.signalRService.startConnection();
    } catch (error) {
      console.warn('No se pudo iniciar SignalR para el panel de chat.', error);
    }
  }

  private listenToIncomingMessages(): void {
    this.signalRService.onMessageReceived.pipe(takeUntilDestroyed()).subscribe((message) => {
      const currentUserId = this.currentUserId();
      const activeUserId = this.selectedUserId();
      if (!currentUserId) {
        return;
      }

      const otherUserId = this.resolveOtherUserId(message, currentUserId);
      const isActiveConversation = activeUserId !== null && otherUserId === activeUserId;
      const shouldMarkReadNow =
        isActiveConversation &&
        message.receiverId === currentUserId &&
        message.senderId === activeUserId;

      const normalizedMessage = shouldMarkReadNow ? { ...message, isRead: true } : message;

      if (isActiveConversation) {
        this.appendThreadMessage(normalizedMessage);
      }

      this.upsertConversationPreview(normalizedMessage);

      if (shouldMarkReadNow) {
        this.unreadCountService.decrement(1);
        this.threadMessages.update((messages) =>
          messages.map((item) =>
            item.messageId === normalizedMessage.messageId ? { ...item, isRead: true } : item,
          ),
        );
        void firstValueFrom(this.messagesApi.markAsRead(message.messageId)).catch((error: unknown) => {
          console.warn('No se pudo marcar el mensaje del panel como leído.', error);
        });
      }
    });
  }

  private appendThreadMessage(message: MessageDto): void {
    this.threadMessages.update((messages) => {
      if (messages.some((item) => item.messageId === message.messageId)) {
        return messages;
      }

      return [...messages, message];
    });
  }

  private upsertConversationPreview(message: MessageDto): void {
    const currentUserId = this.currentUserId();
    if (!currentUserId) {
      return;
    }

    const otherUserId = this.resolveOtherUserId(message, currentUserId);

    this.conversationsState.update((conversations) => {
      const existingIndex = conversations.findIndex(
        (conversation) => this.resolveOtherUserId(conversation, currentUserId) === otherUserId,
      );

      if (existingIndex === -1) {
        return [message, ...conversations];
      }

      const next = [...conversations];
      next.splice(existingIndex, 1);
      next.unshift(message);
      return next;
    });
  }

  private markConversationAsReadLocally(otherUserId: string): void {
    const currentUserId = this.currentUserId();
    if (!currentUserId) {
      return;
    }

    const unreadMessageIds = new Set<string>();
    const isUnreadFromConversation = (message: MessageDto) =>
      message.receiverId === currentUserId &&
      message.senderId === otherUserId &&
      !message.isRead;

    for (const message of [...this.conversationsState(), ...this.threadMessages()]) {
      if (isUnreadFromConversation(message)) {
        unreadMessageIds.add(message.messageId);
      }
    }

    if (unreadMessageIds.size === 0) {
      return;
    }

    this.conversationsState.update((conversations) =>
      conversations.map((message) =>
        unreadMessageIds.has(message.messageId) ? { ...message, isRead: true } : message,
      ),
    );
    this.threadMessages.update((messages) =>
      messages.map((message) =>
        unreadMessageIds.has(message.messageId) ? { ...message, isRead: true } : message,
      ),
    );
    this.unreadCountService.decrement(unreadMessageIds.size);
  }

  private async markConversationAsReadOnServer(otherUserId: string): Promise<void> {
    try {
      await firstValueFrom(this.messagesApi.markConversationAsRead(otherUserId));
    } catch (error) {
      console.warn('No se pudo confirmar la lectura de la conversación del panel.', error);
    }
  }

  private resolveOtherUserId(message: MessageDto, currentUserId: string): string {
    return message.senderId === currentUserId ? message.receiverId : message.senderId;
  }

  protected isSentByMe(message: MessageDto): boolean {
    return message.senderId === this.currentUserId();
  }

  private scrollThreadToBottom(): void {
    const container = this.threadContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  protected getOtherUserId(message: MessageDto): string {
    const currentUserId = this.currentUserId();
    return message.senderId === currentUserId ? message.receiverId : message.senderId;
  }

  protected getOtherUserName(message: MessageDto): string {
    const currentUserId = this.currentUserId();
    return message.senderId === currentUserId ? message.receiverUsername : message.senderUsername;
  }

  protected isUnread(message: MessageDto): boolean {
    const currentUserId = this.currentUserId();
    return message.receiverId === currentUserId && !message.isRead;
  }

  protected toUserDto(message: MessageDto): UserDto {
    const isOtherUserSender = message.senderId !== this.currentUserId();

    return {
      userId: isOtherUserSender ? message.senderId : message.receiverId,
      nickname: isOtherUserSender ? message.senderUsername : message.receiverUsername,
      email: isOtherUserSender ? message.senderUsername : message.receiverUsername,
      profilePhotoUrl: isOtherUserSender ? message.senderAvatar : message.receiverAvatar,
    };
  }

  protected trackConversation(_index: number, conversation: MessageDto): string {
    return conversation.messageId;
  }

  protected trackChatbotMessage(_index: number, message: ChatbotMessageDto): string {
    return message.chatbotMessageId;
  }
}
