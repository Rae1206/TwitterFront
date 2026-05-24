import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'confirm.cancel()',
  },
  template: `
    @if (confirm.dialog(); as dialog) {
      <div class="confirm-backdrop" (click)="confirm.cancel()" aria-hidden="true"></div>

      <section class="confirm-shell" aria-labelledby="confirm-title" aria-describedby="confirm-message" role="alertdialog" aria-modal="true">
        <article class="confirm-card" [class.tone-danger]="dialog.tone === 'danger'">
          <div class="confirm-badge" aria-hidden="true">{{ dialog.tone === 'danger' ? '!' : '?' }}</div>

          <div class="confirm-copy">
            <p class="confirm-eyebrow">Confirmar acción</p>
            <h2 id="confirm-title">{{ dialog.title }}</h2>
            <p id="confirm-message">{{ dialog.message }}</p>

            @if (dialog.details) {
              <p class="confirm-details">{{ dialog.details }}</p>
            }
          </div>

          <div class="confirm-actions">
            <button type="button" class="secondary-action" (click)="confirm.cancel()">{{ dialog.cancelLabel }}</button>
            <button
              type="button"
              class="primary-action"
              [class.danger-primary]="dialog.tone === 'danger'"
              (click)="confirm.approve()"
            >
              {{ dialog.confirmLabel }}
            </button>
          </div>
        </article>
      </section>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 1100;
      pointer-events: none;
    }

    .confirm-backdrop,
    .confirm-shell {
      position: absolute;
      inset: 0;
    }

    .confirm-backdrop {
      pointer-events: auto;
      background: rgb(2 6 23 / 0.72);
      backdrop-filter: blur(10px);
    }

    .confirm-shell {
      pointer-events: none;
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .confirm-card {
      pointer-events: auto;
      width: min(32rem, 100%);
      display: grid;
      gap: 1rem;
      padding: 1.35rem;
      border-radius: 1.6rem;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-primary);
      box-shadow: var(--card-shadow);
      backdrop-filter: blur(18px);
    }

    .confirm-card.tone-danger {
      border-color: var(--danger-border);
      background: linear-gradient(180deg, var(--danger-bg), var(--bg-card));
    }

    .confirm-badge {
      width: 3rem;
      height: 3rem;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--bg-secondary);
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .confirm-copy {
      display: grid;
      gap: 0.45rem;
    }

    .confirm-eyebrow,
    .confirm-copy h2,
    .confirm-copy p {
      margin: 0;
    }

    .confirm-eyebrow {
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75rem;
    }

    .confirm-copy h2 {
      font-size: 1.3rem;
      color: var(--text-primary);
    }

    .confirm-copy p,
    .confirm-details {
      color: var(--text-muted);
      line-height: 1.6;
    }

    .confirm-details {
      padding: 0.85rem 1rem;
      border-radius: 1rem;
      background: var(--bg-secondary);
    }

    .confirm-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .danger-primary {
      background: var(--danger-color);
      border-color: var(--danger-border);
      color: #fff;
    }

    @media (width <= 720px) {
      .confirm-actions {
        flex-direction: column-reverse;
      }

      .confirm-card {
        padding: 1.1rem;
        border-radius: 1.25rem;
      }
    }
  `,
})
export class ConfirmOutletComponent {
  protected readonly confirm = inject(ConfirmService);
}
