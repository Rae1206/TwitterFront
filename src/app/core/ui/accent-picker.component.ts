import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';

import { BrandService } from './brand.service';

@Component({
  selector: 'app-accent-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="accent-picker" [class.is-open]="open()">
      <button
        type="button"
        class="accent-trigger"
        [style.background]="triggerBackground()"
        [attr.aria-label]="'Personalizar color de bordes'"
        [attr.aria-expanded]="open()"
        [attr.aria-haspopup]="'dialog'"
        title="Personalizar color de bordes"
        (click)="toggle()"
      >
        <span class="visually-hidden">Personalizar color</span>
      </button>

      @if (open()) {
        <div class="accent-popover" role="dialog" aria-label="Selector de color de bordes">
          <div class="accent-popover-head">
            <strong>Color de bordes</strong>
            <p>Aplica el color a todos los bordes de la app sin tocar el fondo.</p>
          </div>

          <div class="accent-swatches" role="group" aria-label="Colores predefinidos">
            @for (entry of palette; track entry.id) {
              <button
                type="button"
                class="accent-swatch"
                [class.selected]="currentColor() === entry.value"
                [style.background-color]="entry.value"
                [attr.aria-label]="entry.label"
                [attr.aria-pressed]="currentColor() === entry.value"
                [title]="entry.label"
                (click)="apply(entry.value)"
              ></button>
            }
          </div>

          <label class="accent-custom">
            <span>Personalizado</span>
            <input
              type="color"
              [value]="currentColor() || '#1d9bf0'"
              (input)="apply($any($event.target).value)"
            />
          </label>

          <button type="button" class="accent-reset" (click)="reset()">
            Restablecer al tema
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .accent-picker {
        position: relative;
        display: inline-flex;
      }

      .accent-trigger {
        width: 1.85rem;
        height: 1.85rem;
        border-radius: 999px;
        border: 2px solid var(--border-strong, var(--border-color));
        cursor: pointer;
        padding: 0;
        background: var(--accent-color, conic-gradient(from 180deg, #ef4444, #f97316, #facc15, #22c55e, #3b82f6, #a855f7, #ef4444));
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .accent-trigger:hover {
        transform: scale(1.08);
      }

      .accent-trigger:focus-visible {
        outline: 2px solid var(--accent-color, var(--brand-color));
        outline-offset: 3px;
      }

      .accent-popover {
        position: absolute;
        top: calc(100% + 0.65rem);
        left: 0;
        z-index: 200;
        min-width: 16rem;
        padding: 1rem;
        border-radius: 1rem;
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        backdrop-filter: blur(18px);
        box-shadow: var(--card-shadow);
        display: grid;
        gap: 0.85rem;
        color: var(--text-primary);
      }

      .accent-popover-head strong {
        display: block;
        margin-bottom: 0.25rem;
        color: var(--text-primary);
      }

      .accent-popover-head p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.85rem;
        line-height: 1.4;
      }

      .accent-swatches {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .accent-swatch {
        appearance: none;
        width: 100%;
        aspect-ratio: 1;
        border-radius: 999px;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }

      .accent-swatch:hover {
        transform: scale(1.08);
      }

      .accent-swatch.selected {
        border-color: var(--text-primary);
      }

      .accent-custom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.55rem 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
      }

      .accent-custom span {
        color: var(--text-primary);
        font-size: 0.9rem;
        font-weight: 600;
      }

      .accent-custom input[type='color'] {
        width: 2.4rem;
        height: 2rem;
        border: 0;
        background: transparent;
        cursor: pointer;
        padding: 0;
      }

      .accent-custom input[type='color']::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      .accent-custom input[type='color']::-webkit-color-swatch {
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
      }

      .accent-reset {
        appearance: none;
        width: 100%;
        padding: 0.6rem 0.9rem;
        border-radius: 999px;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
      }

      .accent-reset:hover {
        background: var(--brand-light);
        border-color: var(--brand-color);
        color: var(--brand-color);
      }

      @media (width <= 720px) {
        .accent-popover {
          left: auto;
          right: 0;
        }
      }
    `,
  ],
})
export class AccentPickerComponent {
  protected readonly brandService = inject(BrandService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly palette = this.brandService.palette;
  protected readonly currentColor = computed(() => this.brandService.accentColor());
  protected readonly triggerBackground = computed(
    () =>
      this.currentColor() ??
      'conic-gradient(from 180deg, #ef4444, #f97316, #facc15, #22c55e, #3b82f6, #a855f7, #ef4444)',
  );

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected apply(color: string): void {
    this.brandService.setAccent(color);
  }

  protected reset(): void {
    this.brandService.reset();
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
