import { ChangeDetectionStrategy, Component, OnDestroy, inject, output } from '@angular/core';

import { AudioPlayerComponent } from './audio-player.component';
import { AudioRecorderService } from './audio-recorder.service';

/**
 * Modal de grabación de audio. Maneja todo el ciclo de vida del recorder
 * y emite el `File` final cuando el usuario confirma.
 *
 * El padre debe envolverlo en un `@if (isOpen())` y reaccionar a los outputs:
 *   - `audioReady`: el usuario aprobó la grabación
 *   - `closed`:     el usuario cerró el modal sin guardar
 */
@Component({
  selector: 'app-audio-recorder-modal',
  standalone: true,
  imports: [AudioPlayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AudioRecorderService],
  template: `
    <div class="modal-backdrop" (click)="cancel()">
      <section
        class="modal-container surface-card audio-recorder-modal"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-recorder-title"
      >
        <header class="modal-header">
          <div>
            <p class="eyebrow">Audio</p>
            <h3 id="audio-recorder-title">Grabar audio</h3>
          </div>
          <button type="button" class="close-modal-btn" (click)="cancel()" aria-label="Cerrar">&times;</button>
        </header>

        <div class="recorder-body">
          @switch (recorder.state()) {
            @case ('idle') {
              <div class="recorder-stage idle-stage">
                <p class="recorder-hint">Toca el micrófono para empezar a grabar.</p>
                <button type="button" class="record-btn" (click)="start()" aria-label="Empezar a grabar">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
                  </svg>
                </button>
                <span class="recorder-meta">Hasta {{ maxLabel }}</span>
              </div>
            }

            @case ('requesting') {
              <div class="recorder-stage">
                <p class="recorder-status">Esperando permiso del micrófono...</p>
              </div>
            }

            @case ('recording') {
              <div class="recorder-stage recording-stage">
                <span class="recorder-pulse" aria-hidden="true"></span>
                <p class="recorder-elapsed">{{ recorder.elapsedLabel() }}</p>
                <p class="recorder-meta">Quedan {{ recorder.remainingLabel() }}</p>
                <button type="button" class="stop-btn" (click)="stop()" aria-label="Detener grabación">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                  </svg>
                </button>
              </div>
            }

            @case ('recorded') {
              <div class="recorder-stage recorded-stage">
                @if (recorder.recordedUrl(); as url) {
                  <app-audio-player [src]="url" />
                }
                <p class="recorder-meta">Duración: {{ recorder.elapsedLabel() }}</p>
              </div>
            }

            @case ('denied') {
              <div class="recorder-stage error-stage">
                <p class="recorder-status">{{ recorder.errorMessage() || 'Permiso de micrófono denegado.' }}</p>
                <p class="recorder-meta">Habilita el micrófono en la configuración del navegador y vuelve a intentar.</p>
              </div>
            }

            @case ('error') {
              <div class="recorder-stage error-stage">
                <p class="recorder-status">{{ recorder.errorMessage() || 'No pudimos acceder al micrófono.' }}</p>
              </div>
            }
          }
        </div>

        <div class="button-row recorder-actions">
          @if (recorder.state() === 'recorded') {
            <button type="button" class="primary-action" (click)="confirm()">Usar grabación</button>
            <button type="button" class="secondary-action" (click)="reset()">Volver a grabar</button>
          } @else if (recorder.state() === 'denied' || recorder.state() === 'error') {
            <button type="button" class="primary-action" (click)="reset()">Reintentar</button>
            <button type="button" class="secondary-action" (click)="cancel()">Cancelar</button>
          } @else if (recorder.state() === 'recording') {
            <button type="button" class="secondary-action" (click)="cancel()">Cancelar</button>
          } @else {
            <button type="button" class="secondary-action" (click)="cancel()">Cancelar</button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: block;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: rgba(15, 23, 42, 0.66);
        backdrop-filter: blur(12px);
        z-index: 1200;
      }

      .modal-container {
        position: relative;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 1.5rem;
        padding: 1.25rem;
        box-shadow: var(--card-shadow);
        backdrop-filter: blur(16px);
        max-height: min(92dvh, 800px);
        overflow: auto;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 1rem;
        margin-bottom: 0.5rem;
      }

      .modal-header h3 {
        margin: 0.25rem 0 0;
        color: var(--text-primary);
      }

      .modal-header .eyebrow {
        margin: 0;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
      }

      .close-modal-btn {
        border: 0;
        background: transparent;
        color: var(--text-secondary);
        font-size: 2rem;
        line-height: 1;
        cursor: pointer;
        padding: 0;
      }

      .audio-recorder-modal {
        width: min(440px, 100%);
        display: grid;
        gap: 1rem;
      }

      .recorder-body {
        display: grid;
        place-items: center;
        min-height: 14rem;
        padding: 1rem 0;
      }

      .recorder-stage {
        display: grid;
        gap: 0.75rem;
        place-items: center;
        text-align: center;
      }

      .recorder-hint,
      .recorder-status,
      .recorder-meta,
      .recorder-elapsed {
        margin: 0;
      }

      .recorder-hint,
      .recorder-meta {
        color: var(--text-secondary);
      }

      .recorder-status {
        color: var(--text-primary);
        font-weight: 600;
      }

      .recorder-elapsed {
        font-size: 2.5rem;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: 0.05em;
      }

      .record-btn,
      .stop-btn {
        width: 5rem;
        height: 5rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        border: 0;
        cursor: pointer;
        color: #fff;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .record-btn {
        background: #ef4444;
        box-shadow: 0 6px 24px rgb(239 68 68 / 0.32);
      }

      .record-btn:hover {
        transform: scale(1.04);
      }

      .stop-btn {
        background: #1d9bf0;
        box-shadow: 0 6px 24px rgb(29 155 240 / 0.32);
      }

      .stop-btn:hover {
        transform: scale(1.04);
      }

      .record-btn svg,
      .stop-btn svg {
        width: 2rem;
        height: 2rem;
      }

      .recorder-pulse {
        width: 1rem;
        height: 1rem;
        border-radius: 999px;
        background: #ef4444;
        animation: pulse 1.2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.4;
          transform: scale(1.4);
        }
      }

      .recorder-audio {
        width: 100%;
        max-width: 100%;
      }

      .recording-stage,
      .recorded-stage {
        gap: 1rem;
      }

      .error-stage .recorder-status {
        color: #ef4444;
      }

      .recorder-actions {
        justify-content: flex-end;
      }
    `,
  ],
})
export class AudioRecorderModalComponent implements OnDestroy {
  protected readonly recorder = inject(AudioRecorderService);

  readonly audioReady = output<File>();
  readonly closed = output<void>();

  protected readonly maxLabel = formatMax(this.recorder.maxDurationSeconds);

  ngOnDestroy(): void {
    this.recorder.destroy();
  }

  protected start(): void {
    void this.recorder.start();
  }

  protected stop(): void {
    this.recorder.stop();
  }

  protected reset(): void {
    this.recorder.reset();
  }

  protected confirm(): void {
    const file = this.recorder.toFile();
    if (!file) {
      return;
    }
    this.audioReady.emit(file);
    this.recorder.destroy();
    this.closed.emit();
  }

  protected cancel(): void {
    this.recorder.destroy();
    this.closed.emit();
  }
}

function formatMax(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes && remaining) {
    return `${minutes} min ${remaining} s`;
  }
  if (minutes) {
    return `${minutes} min`;
  }
  return `${remaining} s`;
}
