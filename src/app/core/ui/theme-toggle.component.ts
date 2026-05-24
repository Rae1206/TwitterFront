import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="theme-toggle"
      role="switch"
      [attr.aria-checked]="!themeService.isDark()"
      [attr.aria-label]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      [title]="themeService.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      (click)="themeService.toggleTheme()"
    >
      <span class="track" [class.is-light]="!themeService.isDark()">
        <span class="track-icon track-icon-moon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
        <span class="track-icon track-icon-sun" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
        <span class="thumb" aria-hidden="true"></span>
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .theme-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: transparent;
        border: 0;
        cursor: pointer;
        outline-offset: 4px;
        border-radius: 999px;
      }

      .theme-toggle:focus-visible .track {
        box-shadow: 0 0 0 2px var(--accent-color, var(--brand-color));
      }

      .track {
        position: relative;
        width: 3.5rem;
        height: 1.85rem;
        border-radius: 999px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        display: inline-flex;
        align-items: center;
        transition: background 0.25s ease, border-color 0.25s ease;
      }

      .track-icon {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 0.95rem;
        height: 0.95rem;
        display: grid;
        place-items: center;
        pointer-events: none;
        transition: opacity 0.25s ease;
      }

      .track-icon svg {
        width: 100%;
        height: 100%;
      }

      .track-icon-moon {
        left: 0.45rem;
        color: var(--text-primary);
        opacity: 1;
      }

      .track-icon-sun {
        right: 0.45rem;
        color: #f59e0b;
        opacity: 0.45;
      }

      .track.is-light .track-icon-moon {
        color: var(--text-secondary);
        opacity: 0.7;
      }

      .track.is-light .track-icon-sun {
        opacity: 1;
      }

      .thumb {
        position: absolute;
        top: 50%;
        left: 0.18rem;
        transform: translateY(-50%);
        width: 1.45rem;
        height: 1.45rem;
        border-radius: 999px;
        background: var(--text-primary);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
        transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease;
      }

      .track.is-light .thumb {
        left: calc(100% - 1.63rem);
        background: var(--brand-color);
      }
    `,
  ],
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);
}
