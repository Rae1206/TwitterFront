import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const accentColorStorageKey = 'twitter.accent-color';

export interface AccentSwatch {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly accentColor = signal<string | null>(null);
  readonly hasAccent = computed(() => this.accentColor() !== null);

  readonly palette: ReadonlyArray<AccentSwatch> = [
    { id: 'red', label: 'Rojo', value: '#ef4444' },
    { id: 'pink', label: 'Rosa', value: '#ec4899' },
    { id: 'orange', label: 'Naranja', value: '#f97316' },
    { id: 'yellow', label: 'Amarillo', value: '#facc15' },
    { id: 'green', label: 'Verde', value: '#22c55e' },
    { id: 'teal', label: 'Turquesa', value: '#14b8a6' },
    { id: 'blue', label: 'Azul', value: '#3b82f6' },
    { id: 'purple', label: 'Violeta', value: '#a855f7' },
  ];

  constructor() {
    this.accentColor.set(this.loadStored());

    effect(() => {
      const accent = this.accentColor();
      this.applyAccent(accent);
      this.persist(accent);
    });
  }

  setAccent(color: string | null): void {
    if (color === null) {
      this.accentColor.set(null);
      return;
    }

    const normalized = this.normalizeHex(color);
    if (normalized) {
      this.accentColor.set(normalized);
    }
  }

  reset(): void {
    this.accentColor.set(null);
  }

  /**
   * Convert a hex color (e.g. `#ef4444` or `#fff`) to an `rgba(...)` string with the given alpha.
   * Returns the original input untouched if it cannot be parsed, so callers stay safe.
   */
  toRgba(hex: string, alpha: number): string {
    const normalized = this.normalizeHex(hex);
    if (!normalized) {
      return hex;
    }

    const stripped = normalized.slice(1);
    const r = parseInt(stripped.slice(0, 2), 16);
    const g = parseInt(stripped.slice(2, 4), 16);
    const b = parseInt(stripped.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private applyAccent(accent: string | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // We write the override on `<body>` (not `<html>`) on purpose: `styles.scss`
    // declares the light-mode tokens via `body.light-theme { ... }`. Variables
    // defined on `<body>` are closer in the cascade than ones on `<html>`, so an
    // inline `<html>` style would lose to the light-theme rule. Writing on
    // `<body>` puts the override on the SAME element as the light-theme rule,
    // and inline always wins over a selector for the same element — so the
    // accent now overrides borders in BOTH dark and light modes.
    const target = this.document.body;
    if (!target) {
      return;
    }

    if (!accent) {
      target.style.removeProperty('--accent-color');
      target.style.removeProperty('--border-color');
      target.style.removeProperty('--border-strong');
      return;
    }

    target.style.setProperty('--accent-color', accent);
    target.style.setProperty('--border-color', this.toRgba(accent, 0.32));
    target.style.setProperty('--border-strong', this.toRgba(accent, 0.6));
  }

  private persist(accent: string | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      if (accent) {
        this.document.defaultView?.localStorage.setItem(accentColorStorageKey, accent);
      } else {
        this.document.defaultView?.localStorage.removeItem(accentColorStorageKey);
      }
    } catch {
      // Ignore storage write failures so theming never breaks the app.
    }
  }

  private loadStored(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return this.document.defaultView?.localStorage.getItem(accentColorStorageKey) ?? null;
    } catch {
      return null;
    }
  }

  private normalizeHex(value: string): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
    if (!match) {
      return null;
    }

    const stripped = match[1];
    const expanded =
      stripped.length === 3
        ? stripped
            .split('')
            .map((c) => c + c)
            .join('')
        : stripped;

    return `#${expanded.toLowerCase()}`;
  }
}
