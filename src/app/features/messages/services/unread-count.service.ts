import { Injectable, effect, inject, signal } from '@angular/core';

import { SessionService } from '../../../core/auth/session.service';
import { SignalRService } from '../../../core/realtime/signalr.service';
import { MessagesApiService } from './messages-api.service';

/**
 * Estado centralizado del contador de mensajes no leídos.
 *
 * Reemplaza el polling cada 10s al endpoint /messages/unread/count por un
 * patrón event-driven sobre SignalR:
 *   - 1 sola llamada al backend cuando se establece la conexión SignalR
 *   - +1 local cuando llega un onMessageReceived dirigido al usuario actual
 *   - decrement(N) o refresh() cuando el componente marca mensajes como leídos
 *
 * Se provee en root para que tanto PrivateLayout como MessagesPage lean del
 * mismo signal y la UI se mantenga consistente sin tráfico de red redundante.
 */
@Injectable({ providedIn: 'root' })
export class UnreadCountService {
  private readonly api = inject(MessagesApiService);
  private readonly signalR = inject(SignalRService);
  private readonly session = inject(SessionService);

  /** Contador reactivo. Cualquier componente lo consume con `unreadCount()`. */
  readonly count = signal(0);

  constructor() {
    // Refrescar cuando hay conexión SignalR + usuario autenticado.
    // Si se desautentica, resetear a 0.
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

    // Auto-incrementar cuando llega un mensaje no leído dirigido al usuario actual.
    // Si el componente que tiene la conversación abierta lo marca como leído
    // inmediatamente (vía markAsRead → decrement), el contador queda correcto.
    this.signalR.onMessageReceived.subscribe((message) => {
      const myUserId = this.session.userId();
      if (myUserId && message.receiverId === myUserId && !message.isRead) {
        this.count.update((c) => c + 1);
      }
    });
  }

  /**
   * Pide al backend el conteo actualizado y actualiza el signal.
   * Debe llamarse:
   *   - Al conectar (lo hace el effect del constructor)
   *   - Cuando se sospecha que el local state diverge del servidor
   */
  refresh(): void {
    this.api.getUnreadCount().subscribe({
      next: (count) => this.count.set(count),
      error: (err) => console.warn('UnreadCountService: no se pudo cargar el contador', err),
    });
  }

  /**
   * Resta una cantidad conocida del contador local sin tocar la red.
   * Útil cuando el componente acaba de marcar como leídos N mensajes
   * y conoce N localmente (evita una llamada extra a /unread/count).
   */
  decrement(amount: number): void {
    if (amount <= 0) return;
    this.count.update((c) => Math.max(0, c - amount));
  }

  /** Forzar a 0 (ej. al cerrar sesión). */
  reset(): void {
    this.count.set(0);
  }
}
