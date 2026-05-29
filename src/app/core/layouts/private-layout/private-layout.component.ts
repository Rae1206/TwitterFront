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

  /**
   * Tracks the current URL so we can hide the right rail (trending panel)
   * on routes that benefit from full width — like the messages page.
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

      // Load (or reload) whenever authenticated userId changes
      if (userId && userId !== loadedUserId) {
        void this.userStore.loadCurrentUser(true);
      }
    });
    void this.trending.refresh();
  }

  protected async logout(): Promise<void> {
    this.userStore.clearCurrentUser();
    this.sessionService.clearSession();
    this.feedback.info('Tu sesión se cerró. ¡Hasta pronto!', { title: 'Sesión cerrada' });
    await this.router.navigate(['/login']);
  }
}
