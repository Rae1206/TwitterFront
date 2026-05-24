import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FeedbackService } from './feedback.service';

@Component({
  selector: 'app-feedback-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="feedback-stack" aria-live="polite" aria-atomic="true">
      @for (item of feedback.items(); track item.id) {
        <article
          class="toast"
          [class.tone-success]="item.tone === 'success'"
          [class.tone-error]="item.tone === 'error'"
          [class.tone-info]="item.tone === 'info'"
          role="status"
        >
          <div class="toast-copy">
            @if (item.title) {
              <strong>{{ item.title }}</strong>
            }
            <p>{{ item.message }}</p>
          </div>

          <button type="button" class="toast-close" (click)="feedback.dismiss(item.id)" aria-label="Dismiss message">
            ×
          </button>
        </article>
      }
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: auto 1rem 1rem auto;
      z-index: 1000;
      pointer-events: none;
    }

    .feedback-stack {
      display: grid;
      gap: 0.75rem;
      width: min(24rem, calc(100vw - 2rem));
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.95rem 1rem;
      border-radius: 1rem;
      border: 1px solid var(--toast-border, var(--border-color));
      background: var(--toast-background, var(--bg-card));
      color: var(--text-primary);
      box-shadow: var(--card-shadow);
      backdrop-filter: blur(16px);
    }

    .tone-success {
      --toast-background: var(--success-bg);
      --toast-border: var(--success-border);
    }

    .tone-error {
      --toast-background: var(--danger-bg);
      --toast-border: var(--danger-border);
    }

    .tone-info {
      --toast-background: var(--bg-card);
      --toast-border: var(--border-color);
    }

    .toast-copy {
      display: grid;
      gap: 0.2rem;
    }

    .toast-copy strong,
    .toast-copy p {
      margin: 0;
    }

    .toast-copy strong {
      color: var(--text-primary);
    }

    .toast-copy p {
      color: var(--text-muted);
      line-height: 1.45;
    }

    .toast-close {
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: 999px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
    }

    @media (width <= 480px) {
      :host {
        inset: auto 0.5rem 0.5rem 0.5rem;
      }

      .feedback-stack {
        width: calc(100vw - 1rem);
      }
    }
  `,
})
export class FeedbackOutletComponent {
  protected readonly feedback = inject(FeedbackService);
}
