import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

type StateCardTone = 'loading' | 'error' | 'empty' | 'info';

@Component({
  selector: 'app-state-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'state-card-host',
  },
  template: `
    <article
      class="state-card"
      [class.tone-loading]="tone() === 'loading'"
      [class.tone-error]="tone() === 'error'"
      [class.tone-empty]="tone() === 'empty'"
      [class.tone-info]="tone() === 'info'"
    >
      <span class="state-icon" aria-hidden="true">{{ icon() }}</span>

      <div class="state-copy">
        <h2>{{ title() }}</h2>
        <p>{{ message() }}</p>
      </div>

      @if (actionLabel()) {
        <button type="button" class="secondary-action small-action" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .state-card {
      display: grid;
      gap: 1rem;
      justify-items: start;
      padding: 1.35rem;
      border-radius: 1.5rem;
      border: 1px solid var(--border-color);
      background: var(--bg-card-inner);
      color: var(--text-primary);
    }

    .state-icon {
      width: 3rem;
      height: 3rem;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 1.2rem;
    }

    .state-copy {
      display: grid;
      gap: 0.35rem;
    }

    .state-copy h2,
    .state-copy p {
      margin: 0;
    }

    .state-copy h2 {
      font-size: 1.05rem;
      color: var(--text-primary);
    }

    .state-copy p {
      color: var(--text-muted);
      line-height: 1.55;
    }

    .tone-error {
      border-color: var(--danger-border);
      background: var(--danger-bg);
    }

    .tone-error .state-icon {
      background: var(--danger-bg);
      color: var(--danger-color);
    }

    .tone-empty {
      border-style: dashed;
    }
  `,
})
export class StateCardComponent {
  readonly tone = input<StateCardTone>('info');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();

  protected icon(): string {
    switch (this.tone()) {
      case 'loading':
        return '◌';
      case 'error':
        return '!';
      case 'empty':
        return '·';
      default:
        return 'i';
    }
  }
}
