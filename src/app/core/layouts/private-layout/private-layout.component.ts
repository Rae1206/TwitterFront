import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { SessionService } from '../../auth/session.service';
import { adminRoles } from '../../auth/session.model';
import { FeedbackService } from '../../ui/feedback.service';
import { TrendingService } from '../../ui/trending.service';
import { AccentPickerComponent } from '../../ui/accent-picker.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle.component';
import { UserAvatarComponent } from '../../../features/users/components/user-avatar.component';
import { UserStoreService } from '../../../features/users/services/user-store.service';
import { SignalRService } from '../../realtime/signalr.service';
import { UnreadCountService } from '../../../features/messages/services/unread-count.service';
import { FollowsApiService } from '../../../features/follows/services/follows-api.service';
import { TrendingMediaThumbComponent } from '../../../shared/components/trending-media-thumb/trending-media-thumb.component';

@Component({
  selector: 'app-private-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    UserAvatarComponent,
    ThemeToggleComponent,
    AccentPickerComponent,
    TrendingMediaThumbComponent,
  ],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.scss',
})
export class PrivateLayoutComponent {
  private readonly sessionService = inject(SessionService);
  private readonly userStore = inject(UserStoreService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  private readonly trending = inject(TrendingService);
  private readonly signalRService = inject(SignalRService);
  private readonly unreadCountService = inject(UnreadCountService);
  private readonly followsApi = inject(FollowsApiService);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly trendingPosts = this.trending.posts;
  protected readonly hashtag = '#VMTDEV';
  protected readonly profileLink = computed(() => ['/profile', this.sessionService.userId() ?? 'me']);
  protected readonly currentUser = this.userStore.currentUser;
  protected readonly isAdmin = computed(() => {
    const role = this.sessionService.role();
    return role !== null && adminRoles.includes(role as (typeof adminRoles)[number]);
  });
  protected readonly currentRole = this.sessionService.role;
  protected readonly accountName = computed(() => this.currentUser()?.nickname || this.currentUser()?.email || this.sessionService.userId() || 'Miembro');
  protected readonly accountBiography = computed(() => this.currentUser()?.biography?.trim() || 'Aún no has agregado una biografía.');
  protected readonly accountMeta = computed(() => this.currentUser()?.email || this.sessionService.userId() || 'Sin identificador de sesión');

  // Contador de mensajes no leídos (gestionado por estado, sin sondeos/polling).
  // El UnreadCountService se sincroniza mediante SignalR con onMessageReceived.
  protected readonly unreadMessagesCount = this.unreadCountService.count;

  /**
   * Rastrea la URL actual para poder ocultar la columna derecha (panel de tendencias)
   * en aquellas rutas que se benefician de ocupar el ancho completo — como la de mensajes.
   */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly hideRightRail = computed(() => this.currentUrl().startsWith('/messages'));

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  constructor() {
    effect(() => {
      const userId = this.sessionService.userId();
      const loadedUserId = this.currentUser()?.userId;

      // Carga (o vuelve a cargar) los datos cada vez que cambia el userId autenticado
      if (userId && userId !== loadedUserId) {
        void this.userStore.loadCurrentUser(true);
      }
    });
    void this.trending.refresh();

    // Escuchar notificaciones de SignalR en tiempo real
    this.listenToSignalRNotifications();
  }

  /**
   * @description Escucha notificaciones en tiempo real desde SignalR para mostrar avisos emergentes (toasts).
   */
  private listenToSignalRNotifications(): void {
    // Avisar cuando un usuario de interés se conecta (online)
    this.signalRService.onUserOnline.subscribe((userInfo) => {
      const currentUserId = this.sessionService.userId();

      // Solo avisar si el evento no corresponde al propio usuario en sesión
      if (userInfo.userId !== currentUserId) {
        // Verificar si sigues a ese usuario antes de lanzar la notificación
        this.followsApi.isFollowing(userInfo.userId).subscribe({
          next: (response) => {
            if (response.isFollowing) {
              // Solo mostrar el aviso si el usuario actual sigue a quien se conectó
              this.feedback.success(`🟢 ${userInfo.nickname}`, {
                duration: 3000
              });
            }
          },
          error: (err) => {
            console.error('Error al verificar seguimiento del usuario:', err);
          }
        });
      }
    });

    // Avisar cuando ingresa un mensaje nuevo
    this.signalRService.onMessageReceived.subscribe((message) => {
      // Solo lanzar aviso emergente si no nos encontramos en la pantalla de mensajes
      if (!this.router.url.includes('/messages')) {
        this.feedback.info(`💬 ${message.senderUsername}`, {
          duration: 5000
        });
      }
    });
  }

  protected async logout(): Promise<void> {
    this.userStore.clearCurrentUser();
    this.sessionService.clearSession();
    this.feedback.info('Tu sesión se cerró. ¡Hasta pronto!', { title: 'Sesión cerrada' });
    await this.router.navigate(['/login']);
  }
}
