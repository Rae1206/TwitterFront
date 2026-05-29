import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { getMediaKind, MediaKind } from '../../utils/media-type.util';

/**
 * Compact media preview used inside the "Qué está pasando" trending panel.
 *
 * Renders a 48×48 thumbnail for images and videos (first frame, no playback)
 * and a labeled chip with duration for audio. Audio duration is read via the
 * native <audio> metadata event so the API does not need to provide it.
 */
@Component({
  selector: 'app-trending-media-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  template: `
    @switch (kind()) {
      @case ('image') {
        <img
          class="thumb"
          [src]="url()"
          [alt]="alt()"
          loading="lazy"
          decoding="async"
        />
      }
      @case ('video') {
        <!--
          preload="metadata" + #t=0.5 forces the browser to pull the first
          decoded frame as a poster without ever entering playback state.
        -->
        <video
          class="thumb"
          [src]="videoPosterUrl()"
          preload="metadata"
          muted
          playsinline
          [attr.aria-label]="alt()"
        ></video>
      }
      @case ('audio') {
        <span class="audio-chip" [attr.aria-label]="alt()">
          <span class="audio-icon" aria-hidden="true">🎵</span>
          <span class="audio-text">
            <strong>Audio</strong>
            <small>{{ formattedDuration() }}</small>
          </span>
          <audio
            [src]="url()"
            preload="metadata"
            (loadedmetadata)="onAudioMetadata($event)"
            class="visually-hidden"
          ></audio>
        </span>
      }
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }

    .thumb {
      width: 48px;
      height: 48px;
      border-radius: 0.6rem;
      object-fit: cover;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      display: block;
    }

    .audio-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.7rem;
      border-radius: 0.75rem;
      background: var(--brand-light, rgba(29, 155, 240, 0.12));
      border: 1px solid var(--border-color);
      font-size: 0.85rem;
      line-height: 1.1;
    }

    .audio-icon {
      font-size: 1.1rem;
    }

    .audio-text {
      display: inline-flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .audio-text strong {
      font-size: 0.8rem;
      color: var(--text-primary);
      font-weight: 600;
    }

    .audio-text small {
      font-size: 0.7rem;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `],
})
export class TrendingMediaThumbComponent {
  readonly url = input.required<string>();
  readonly alt = input<string>('Vista previa de publicación');

  protected readonly kind = computed<MediaKind>(() => getMediaKind(this.url()));

  /** Duration in seconds, populated when <audio> metadata loads. */
  private readonly durationSeconds = signal<number | null>(null);

  protected readonly formattedDuration = computed(() => {
    const seconds = this.durationSeconds();
    if (seconds === null || !Number.isFinite(seconds)) {
      return '--:--';
    }
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  /** Append a tiny seek so the browser produces a visible first frame. */
  protected readonly videoPosterUrl = computed(() => {
    const raw = this.url();
    return raw.includes('#') ? raw : `${raw}#t=0.5`;
  });

  protected onAudioMetadata(event: Event): void {
    const audio = event.target as HTMLAudioElement;
    if (audio && Number.isFinite(audio.duration)) {
      this.durationSeconds.set(audio.duration);
    }
  }
}
