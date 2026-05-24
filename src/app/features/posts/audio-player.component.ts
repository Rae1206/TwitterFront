import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Reproductor de audio custom con play/pause, barra de progreso interactiva
 * y tiempo. Reemplaza al `<audio controls>` nativo para una UX consistente
 * con el resto de la app (estilo píldora, color de marca).
 */
@Component({
  selector: 'app-audio-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="play-btn"
      (click)="toggle($event)"
      [attr.aria-label]="isPlaying() ? 'Pausar' : 'Reproducir'"
    >
      @if (isPlaying()) {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M8 5h3v14H8zM13 5h3v14h-3z" />
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
      }
    </button>

    <div
      class="track"
      role="slider"
      tabindex="0"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="duration() || 0"
      [attr.aria-valuenow]="currentTime()"
      (click)="seek($event)"
      (keydown)="onKeydown($event)"
    >
      <div class="track-fill" [style.width.%]="progressPercent()"></div>
      <span class="track-thumb" [style.left.%]="progressPercent()" aria-hidden="true"></span>
    </div>

    <span class="time">{{ timeLabel() }}</span>

    <audio
      #audio
      [src]="src()"
      preload="metadata"
      (timeupdate)="onTimeUpdate()"
      (loadedmetadata)="onLoadedMetadata()"
      (durationchange)="onLoadedMetadata()"
      (ended)="onEnded()"
      (play)="isPlaying.set(true)"
      (pause)="isPlaying.set(false)"
    ></audio>
  `,
  styles: [
    `
      :host {
        display: inline-grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.75rem;
        padding: 0.4rem 0.85rem 0.4rem 0.4rem;
        border-radius: 999px;
        background: var(--brand-light, rgb(29 155 240 / 0.12));
        border: 1px solid var(--border-color);
        width: 100%;
        max-width: 24rem;
        min-width: 16rem;
        font-size: 0.85rem;
        color: var(--text-primary);
      }

      .play-btn {
        width: 2.4rem;
        height: 2.4rem;
        border: 0;
        border-radius: 999px;
        background: var(--brand-color, #1d9bf0);
        color: #fff;
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.15s ease;
      }

      .play-btn:hover {
        transform: scale(1.05);
        background: var(--brand-hover, #1a8cd8);
      }

      .play-btn:active {
        transform: scale(0.96);
      }

      .play-btn svg {
        width: 1.05rem;
        height: 1.05rem;
      }

      .track {
        position: relative;
        height: 0.4rem;
        border-radius: 999px;
        background: rgb(148 163 184 / 0.25);
        cursor: pointer;
        outline: none;
      }

      .track:focus-visible {
        box-shadow: 0 0 0 3px rgb(29 155 240 / 0.3);
      }

      .track-fill {
        position: absolute;
        inset: 0;
        background: var(--brand-color, #1d9bf0);
        border-radius: 999px;
        width: 0%;
        transition: width 0.08s linear;
      }

      .track-thumb {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 0.85rem;
        height: 0.85rem;
        border-radius: 999px;
        background: var(--brand-color, #1d9bf0);
        opacity: 0;
        transition: opacity 0.15s ease;
        pointer-events: none;
      }

      .track:hover .track-thumb,
      .track:focus-visible .track-thumb {
        opacity: 1;
      }

      .time {
        color: var(--text-secondary);
        font-variant-numeric: tabular-nums;
        font-size: 0.78rem;
        white-space: nowrap;
      }

      audio {
        display: none;
      }
    `,
  ],
})
export class AudioPlayerComponent {
  readonly src = input.required<string>();

  private readonly audioRef = viewChild.required<ElementRef<HTMLAudioElement>>('audio');

  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);

  readonly progressPercent = computed(() => {
    const dur = this.duration();
    if (!dur || !Number.isFinite(dur)) {
      return 0;
    }
    return Math.min(100, (this.currentTime() / dur) * 100);
  });

  readonly timeLabel = computed(() => {
    const total = this.duration();
    const current = this.currentTime();

    if (!total || !Number.isFinite(total)) {
      return formatSeconds(current);
    }

    return `${formatSeconds(current)} / ${formatSeconds(total)}`;
  });

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    const audio = this.audioRef().nativeElement;

    if (audio.paused) {
      void audio.play().catch(() => {
        // Ignored: el play puede fallar si el src todavía no se cargó.
      });
    } else {
      audio.pause();
    }
  }

  protected seek(event: MouseEvent): void {
    event.stopPropagation();
    const audio = this.audioRef().nativeElement;
    const total = audio.duration;

    if (!total || !Number.isFinite(total)) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ratio = clamp01((event.clientX - rect.left) / rect.width);
    audio.currentTime = ratio * total;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const audio = this.audioRef().nativeElement;
    const total = audio.duration;
    if (!total || !Number.isFinite(total)) {
      return;
    }

    const STEP_SECONDS = 5;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      audio.currentTime = Math.min(total, audio.currentTime + STEP_SECONDS);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - STEP_SECONDS);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle(new MouseEvent('click'));
    }
  }

  protected onTimeUpdate(): void {
    this.currentTime.set(this.audioRef().nativeElement.currentTime);
  }

  protected onLoadedMetadata(): void {
    const dur = this.audioRef().nativeElement.duration;
    this.duration.set(Number.isFinite(dur) ? dur : 0);
  }

  protected onEnded(): void {
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0:00';
  }
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
