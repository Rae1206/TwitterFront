import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, switchMap } from 'rxjs';

import { SessionService } from '../../auth/session.service';
import { adminRoles } from '../../auth/session.model';
import { FeedbackService } from '../../ui/feedback.service';
import { TrendingService } from '../../ui/trending.service';
import { AccentPickerComponent } from '../../ui/accent-picker.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle.component';
import { UserAvatarComponent } from '../../../features/users/components/user-avatar.component';
import { UserStoreService } from '../../../features/users/services/user-store.service';
import { SignalRService } from '../../realtime/signalr.service';
import { MessagesApiService } from '../../../features/messages/services/messages-api.service';
import { FollowsApiService } from '../../../features/follows/services/follows-api.service';

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
  private readonly messagesApi = inject(MessagesApiService);
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

  // Contador de mensajes no leídos
  protected readonly unreadMessagesCount = toSignal(
    interval(10000).pipe(
      switchMap(() => this.messagesApi.getUnreadCount())
    ),
    { initialValue: 0 }
  );

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

      // Load (or reload) whenever authenticated userId changes
      if (userId && userId !== loadedUserId) {
        void this.userStore.loadCurrentUser(true);
      }
    });
    void this.trending.refresh();

    // Escuchar notificaciones de SignalR
    this.listenToSignalRNotifications();
  }

  /**
   * Escucha notificaciones de SignalR para mostrar toasts
   */
  private listenToSignalRNotifications(): void {
    // Notificar cuando un usuario se conecta
    this.signalRService.onUserOnline.subscribe((userInfo) => {
      const currentUserId = this.sessionService.userId();

      // Solo notificar si no es el usuario actual
      if (userInfo.userId !== currentUserId) {
        // Verificar si sigues a ese usuario
        this.followsApi.isFollowing(userInfo.userId).subscribe({
          next: (response) => {
            if (response.isFollowing) {
              // Solo mostrar notificación si sigues al usuario
              this.feedback.success(`🟢 ${userInfo.nickname}`, {
                duration: 3000
              });
            }
          },
          error: (err) => {
            console.error('Error al verificar si sigues al usuario:', err);
          }
        });
      }
    });

    // Notificar cuando llega un mensaje nuevo
    this.signalRService.onMessageReceived.subscribe((message) => {
      // Solo notificar si no estamos en la página de mensajes
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
