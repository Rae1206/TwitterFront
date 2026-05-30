import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PostDto } from '../../features/posts/models/posts.models';
import { PostsApiService } from '../../features/posts/services/posts-api.service';

@Injectable({ providedIn: 'root' })
export class TrendingService {
  private readonly postsApi = inject(PostsApiService);

  readonly posts = signal<PostDto[]>([]);

  async refresh(): Promise<void> {
    try {
      const all = await firstValueFrom(this.postsApi.listPosts({ limit: 50, offset: 0 }));
      const sorted = all
        .map(p => ({ ...p, _eng: (p.likesCount ?? 0) + (p.retweetsCount ?? 0) + (p.repliesCount ?? 0) }))
        .sort((a, b) => b._eng - a._eng)
        .slice(0, 5);
      this.posts.set(sorted);
    } catch { /* ignorar error */ }
  }
}
