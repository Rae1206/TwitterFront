import { Injectable, effect, inject, signal } from '@angular/core';

import { SessionService } from '../../../core/auth/session.service';
import { SignalRService } from '../../../core/realtime/signalr.service';
import { MessagesApiService } from './messages-api.service';

/**
 * @description Estado centralizado del contador de mensajes no leídos.
 *
 * Reemplaza el sondeo constante (polling) cada 10 segundos al endpoint `/messages/unread/count`
 * por un patrón guiado por eventos sobre SignalR:
 *   - Realiza una sola llamada al backend cuando se establece la conexión de SignalR.
 *   - Incrementa localmente (+1) cuando llega un evento `onMessageReceived` para el usuario en sesión.
 *   - Decrementa (`decrement`) o refresca (`refresh`) cuando el componente correspondiente marca los mensajes como leídos.
 *
 * Se provee en la raíz para que tanto el diseño privado (`PrivateLayout`) como la página de mensajes
 * utilicen la misma señal reactiva, manteniendo la interfaz consistente sin tráfico de red redundante.
 */
@Injectable({ providedIn: 'root' })
export class UnreadCountService {
  private readonly api = inject(MessagesApiService);
  private readonly signalR = inject(SignalRService);
  private readonly session = inject(SessionService);

  /** Contador reactivo expuesto para su lectura directa por los componentes. */
  readonly count = signal(0);

  constructor() {
    // Refrescar automáticamente cuando hay conexión activa y el usuario está autenticado.
    // Si la sesión finaliza, el contador se restablece a 0.
    effect(() => {
      const isConnected = this.signalR.isConnected();
      const userId = this.session.userId();

      if (!userId) {
        this.count.set(0);
        return;
      }

      if (isConnected) {
        this.refresh();
      }
    });

    // Auto-incrementar el contador local al recibir un mensaje no leído destinado a nosotros.
    // Si el componente de chat abierto marca de inmediato el mensaje como leído (usando decrement),
    // el contador reflejará la cifra correcta de manera instantánea.
    this.signalR.onMessageReceived.subscribe((message) => {
      const myUserId = this.session.userId();
      if (myUserId && message.receiverId === myUserId && !message.isRead) {
        this.count.update((c) => c + 1);
      }
    });
  }

  /**
   * @description Solicita al servidor el conteo de mensajes sin leer actualizado y refresca la señal.
   * Se invoca automáticamente al establecer conexión o si se requiere sincronizar el estado.
   */
  refresh(): void {
    this.api.getUnreadCount().subscribe({
      next: (count) => this.count.set(count),
      error: (err) => console.warn('UnreadCountService: no se pudo cargar el contador', err),
    });
  }

  /**
   * @description Resta una cantidad específica al contador local de forma optimista sin realizar peticiones de red.
   * Útil tras marcar un conjunto conocido de mensajes como leídos para evitar llamadas redundantes.
   * @param amount Cantidad de mensajes marcados como leídos.
   */
  decrement(amount: number): void {
    if (amount <= 0) return;
    this.count.update((c) => Math.max(0, c - amount));
  }

  /**
   * @description Restablece por completo el contador a 0 (por ejemplo, al cerrar la sesión).
   */
  reset(): void {
    this.count.set(0);
  }
}
