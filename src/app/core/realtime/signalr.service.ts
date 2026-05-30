import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';
import { MessageDto } from '../../features/messages/models/messages.models';

/**
 * @description Servicio de SignalR para la comunicación en tiempo real.
 * Gestiona la conexión WebSocket con el backend para la mensajería instantánea.
 */
@Injectable({ providedIn: 'root' })
export class SignalRService {
    private readonly sessionService = inject(SessionService);
    private hubConnection: HubConnection | null = null;

    /** Señales para el estado de la conexión */
    readonly connectionState = signal<HubConnectionState>(HubConnectionState.Disconnected);
    readonly isConnected = signal(false);

    /**
     * @description Conjunto reactivo de IDs de usuarios actualmente en línea.
     * Cualquier componente puede leer esta señal y derivar si un usuario está en línea
     * sin necesidad de suscribirse manualmente a los eventos del hub.
     */
    readonly onlineUsers = signal<ReadonlySet<string>>(new Set());

    /**
     * @description Comprueba si un usuario en específico está en línea.
     * Muy útil para usar directamente en plantillas HTML.
     * @param userId ID del usuario a consultar.
     * @returns `true` si el usuario está en línea, `false` de lo contrario.
     */
    isUserOnline(userId: string | null | undefined): boolean {
        if (!userId) return false;
        return this.onlineUsers().has(userId);
    }

    /** Emisores internos para los eventos recibidos desde el servidor */
    private readonly messageReceived$ = new Subject<MessageDto>();
    private readonly userOnline$ = new Subject<{ userId: string; nickname: string }>();
    private readonly userOffline$ = new Subject<string>();
    private readonly userTyping$ = new Subject<string>();
    private readonly userStopTyping$ = new Subject<string>();

    /** Observables públicos a los que los componentes pueden suscribirse */
    readonly onMessageReceived: Observable<MessageDto> = this.messageReceived$.asObservable();
    readonly onUserOnline: Observable<{ userId: string; nickname: string }> = this.userOnline$.asObservable();
    readonly onUserOffline: Observable<string> = this.userOffline$.asObservable();
    readonly onUserTyping: Observable<string> = this.userTyping$.asObservable();
    readonly onUserStopTyping: Observable<string> = this.userStopTyping$.asObservable();

    /**
     * @description Inicia la conexión con el hub de SignalR.
     * Se conecta automáticamente al endpoint `/hubs/message` en el backend.
     */
    async startConnection(): Promise<void> {
        // Si ya está conectado, no hace nada
        if (this.hubConnection && this.hubConnection.state === HubConnectionState.Connected) {
            console.log(' SignalR: Ya conectado');
            return;
        }

        // Obtener el token de autenticación
        const token = this.sessionService.getAccessToken();
        if (!token) {
            console.warn(' SignalR: No hay token de autenticación, no se puede conectar');
            return;
        }

        try {
            console.log(' SignalR: Iniciando conexión...');
            console.log('SignalR: Token presente:', !!token);
            console.log('SignalR: URL:', `${environment.apiBaseUrl}/hubs/message`);
            console.log('SignalR: Producción:', environment.production);

            // Construir la conexión al Hub con las opciones adecuadas
            this.hubConnection = new HubConnectionBuilder()
                .withUrl(`${environment.apiBaseUrl}/hubs/message`, {
                    accessTokenFactory: () => token, // Adjuntar el token JWT
                    skipNegotiation: false, // Permitir negociación de transporte
                    withCredentials: true, // Enviar credenciales y cookies
                    // Configuración del transporte: priorizar WebSockets, Long Polling como respaldo
                    transport: environment.production
                        ? HttpTransportType.LongPolling | HttpTransportType.ServerSentEvents // Sin WebSockets directos en producción
                        : HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling // Todos activos en desarrollo
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Intervalos de reintento automático
                .configureLogging(LogLevel.Information) // Nivel de log para depuración
                .build();

            // Configurar los manejadores de eventos antes de iniciar
            this.setupEventHandlers();

            // Iniciar la conexión de manera asíncrona
            await this.hubConnection.start();

            // Actualizar el estado interno de la conexión
            this.connectionState.set(this.hubConnection.state);
            this.isConnected.set(true);

            console.log(' SignalR: Conectado exitosamente al hub de mensajes');

            // Solicitar snapshot inicial de usuarios en línea si el backend lo soporta
            await this.requestOnlineUsersSnapshot();
        } catch (error) {
            console.error(' SignalR: Error al conectar', error);
            this.connectionState.set(HubConnectionState.Disconnected);
            this.isConnected.set(false);
            throw error;
        }
    }

    /**
     * @description Detiene de forma segura la conexión con el hub de SignalR.
     * Se recomienda invocarlo al cerrar la sesión o destruir la aplicación.
     */
    async stopConnection(): Promise<void> {
        if (this.hubConnection) {
            try {
                await this.hubConnection.stop();
                this.connectionState.set(HubConnectionState.Disconnected);
                this.isConnected.set(false);
                this.onlineUsers.set(new Set()); // Limpiar la lista de presencia al desconectar
                console.log(' SignalR: Desconectado correctamente');
            } catch (error) {
                console.error(' SignalR: Error al desconectar', error);
            }
        }
    }

    /**
     * Solicita al hub la lista inicial de usuarios conectados para poblar el estado.
     */
    private async requestOnlineUsersSnapshot(): Promise<void> {
        if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
            return;
        }

        try {
            const snapshot = await this.hubConnection.invoke<unknown>('GetOnlineUsers');
            const myUserId = this.sessionService.userId();
            const ids = this.normalizeOnlineSnapshot(snapshot)
                .filter((id) => id !== myUserId); // Evitar agregarse a uno mismo en la lista
            if (ids.length) {
                this.onlineUsers.set(new Set(ids));
                console.log(`SignalR: Snapshot inicial recibido (${ids.length} usuarios en línea)`);
            }
        } catch (error) {
            // Se ignora si el backend no expone el método; la lista se poblará dinámicamente con los eventos.
            console.info('SignalR: GetOnlineUsers no disponible en el hub. La presencia se construirá mediante eventos.', error);
        }
    }

    /**
     * Normaliza la respuesta recibida convirtiéndola en un array de strings limpio.
     */
    private normalizeOnlineSnapshot(raw: unknown): string[] {
        if (!Array.isArray(raw)) return [];
        return raw
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && 'userId' in item) {
                    const id = (item as { userId: unknown }).userId;
                    return typeof id === 'string' ? id : null;
                }
                return null;
            })
            .filter((id): id is string => Boolean(id));
    }

    /**
     * @description Notifica al servidor que el usuario está escribiendo un mensaje.
     * @param receiverId ID del usuario destinatario de la notificación.
     */
    async notifyTyping(receiverId: string): Promise<void> {
        if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
            console.warn(' SignalR: No hay conexión activa para notificar la escritura');
            return;
        }

        try {
            await this.hubConnection.invoke('NotifyTyping', receiverId);
        } catch (error) {
            console.error(' SignalR: Error al notificar la escritura', error);
        }
    }

    /**
     * @description Notifica al servidor que el usuario ha dejado de escribir.
     * @param receiverId ID del usuario destinatario de la notificación.
     */
    async notifyStopTyping(receiverId: string): Promise<void> {
        if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
            return;
        }

        try {
            await this.hubConnection.invoke('NotifyStopTyping', receiverId);
        } catch (error) {
            console.error(' SignalR: Error al notificar el cese de escritura', error);
        }
    }

    /**
     * @description Verifica si la conexión con el Hub se encuentra activa.
     * @returns `true` si está conectado, `false` de lo contrario.
     */
    isConnectionActive(): boolean {
        return this.hubConnection?.state === HubConnectionState.Connected;
    }

    /**
     * @description Obtiene el estado actual de la conexión de SignalR.
     * @returns El estado actual de tipo `HubConnectionState`.
     */
    getConnectionState(): HubConnectionState {
        return this.hubConnection?.state ?? HubConnectionState.Disconnected;
    }

    /**
     * Configura los escuchas de eventos (listeners) para los mensajes y eventos provenientes de la API.
     */
    private setupEventHandlers(): void {
        if (!this.hubConnection) return;

        // ========================================
        // EVENTO: ReceiveMessage
        // Se dispara al recibir un nuevo mensaje instantáneo de otro usuario
        // ========================================
        this.hubConnection.on('ReceiveMessage', (message: MessageDto) => {
            console.log('SignalR: Mensaje recibido', message);
            this.messageReceived$.next(message);
        });

        // ========================================
        // EVENTO: UserOnline
        // Se dispara cuando un usuario inicia sesión o se conecta
        // ========================================
        this.hubConnection.on('UserOnline', (userInfo: { userId: string; nickname: string }) => {
            // Evitar agregarse a uno mismo en la lista si ocurre reconexión
            const myUserId = this.sessionService.userId();
            if (myUserId && userInfo.userId === myUserId) {
                return;
            }
            console.log('SignalR: Usuario en línea', userInfo);
            // Actualizar el conjunto reactivo creando una nueva referencia para disparar cambios
            this.onlineUsers.update((current) => {
                const next = new Set(current);
                next.add(userInfo.userId);
                return next;
            });
            this.userOnline$.next(userInfo);
        });

        // ========================================
        // EVENTO: UserOffline
        // Se dispara cuando un usuario cierra sesión o se desconecta
        // ========================================
        this.hubConnection.on('UserOffline', (userId: string) => {
            // Evitar procesar eventos para uno mismo
            const myUserId = this.sessionService.userId();
            if (myUserId && userId === myUserId) {
                return;
            }
            console.log('SignalR: Usuario fuera de línea', userId);
            this.onlineUsers.update((current) => {
                if (!current.has(userId)) return current;
                const next = new Set(current);
                next.delete(userId);
                return next;
            });
            this.userOffline$.next(userId);
        });

        // ========================================
        // EVENTO: UserTyping
        // Se dispara cuando un usuario está escribiendo un mensaje
        // ========================================
        this.hubConnection.on('UserTyping', (userId: string) => {
            console.log('SignalR: Usuario escribiendo', userId);
            this.userTyping$.next(userId);
        });

        // ========================================
        // EVENTO: UserStopTyping
        // Se dispara cuando un usuario deja de escribir un mensaje
        // ========================================
        this.hubConnection.on('UserStopTyping', (userId: string) => {
            console.log('SignalR: Usuario dejó de escribir', userId);
            this.userStopTyping$.next(userId);
        });

        // ========================================
        // EVENTOS PROPIOS DE LA CONEXIÓN
        // ========================================

        // Cuando la conexión se pierde e intenta reconectarse automáticamente
        this.hubConnection.onreconnecting((error) => {
            console.warn(' SignalR: Reconectando...', error);
            this.connectionState.set(HubConnectionState.Reconnecting);
            this.isConnected.set(false);
        });

        // Cuando la reconexión automática es exitosa
        this.hubConnection.onreconnected((connectionId) => {
            console.log('SignalR: Reconectado exitosamente', connectionId);
            this.connectionState.set(HubConnectionState.Connected);
            this.isConnected.set(true);
            // Sincronizar la lista de presencia ya que pudo haber cambiado durante la desconexión
            void this.requestOnlineUsersSnapshot();
        });

        // Cuando la conexión finaliza o se cierra del todo
        this.hubConnection.onclose((error) => {
            console.error('SignalR: Conexión cerrada', error);
            this.connectionState.set(HubConnectionState.Disconnected);
            this.isConnected.set(false);
        });
    }
}
