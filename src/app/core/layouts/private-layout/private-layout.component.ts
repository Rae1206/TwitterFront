import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { SessionService } from '../../auth/session.service';
import { adminRoles } from '../../auth/session.model';
import { FeedbackService } from '../../ui/feedback.service';
import { AccentPickerComponent } from '../../ui/accent-picker.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle.component';
import { UserAvatarComponent } from '../../../features/users/components/user-avatar.component';
import { UserStoreService } from '../../../features/users/services/user-store.service';
import { PostsApiService } from '../../../features/posts/services/posts-api.service';
import { PostDto } from '../../../features/posts/models/posts.models';

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
  private readonly postsApi = inject(PostsApiService);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly trendingPosts = signal<PostDto[]>([]);
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
    void this.loadTrending();
  }

  private async loadTrending(): Promise<void> {
    try {
      const posts = await firstValueFrom(this.postsApi.listPosts({ limit: 50, offset: 0 }));
      const sorted = posts
        .map(p => ({ ...p, engagement: (p.likesCount ?? 0) + (p.retweetsCount ?? 0) + (p.repliesCount ?? 0) }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 5);
      this.trendingPosts.set(sorted);
    } catch { /* silent */ }
  }

  protected async logout(): Promise<void> {
    this.userStore.clearCurrentUser();
    this.sessionService.clearSession();
    this.feedback.info('Tu sesión se cerró. ¡Hasta pronto!', { title: 'Sesión cerrada' });
    await this.router.navigate(['/login']);
  }
}
