import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const accentColorStorageKey = 'twitter.accent-color';

export interface AccentSwatch {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/**
 * @description Servicio encargado de gestionar el color de acento de la aplicación.
 * Permite cambiar dinámicamente el tono principal de la interfaz y lo persiste en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  /** Señal reactiva que contiene el color de acento actual en formato hexadecimal. */
  readonly accentColor = signal<string | null>(null);
  /** Señal computada para verificar si hay un color de acento personalizado activo. */
  readonly hasAccent = computed(() => this.accentColor() !== null);

  /** Paleta de colores predefinidos disponibles para que el usuario elija. */
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

    // Efecto reactivo para aplicar y persistir el color de acento ante cualquier cambio.
    effect(() => {
      const accent = this.accentColor();
      this.applyAccent(accent);
      this.persist(accent);
    });
  }

  /**
   * @description Establece un nuevo color de acento para la interfaz.
   * @param color El código hexadecimal del color (por ejemplo, `#ef4444`), o `null` para restablecer al de fábrica.
   */
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

  /**
   * @description Restablece el color de acento por defecto de la aplicación.
   */
  reset(): void {
    this.accentColor.set(null);
  }

  /**
   * @description Convierte un color hexadecimal (ej. `#ef4444` o `#fff`) a formato `rgba(...)`
   * aplicando el nivel de transparencia (alfa) solicitado.
   * Devuelve el color de entrada intacto si no se puede analizar correctamente.
   * @param hex Color en hexadecimal.
   * @param alpha Nivel de opacidad (valor de 0 a 1).
   * @returns El string en formato `rgba(r, g, b, alpha)`.
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

  /**
   * Aplica los estilos CSS personalizados sobreescribiendo las variables del sistema.
   */
  private applyAccent(accent: string | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Escribimos la anulación directamente en `<body>` (no en `<html>`) con un propósito: `styles.scss`
    // declara los tokens de tema claro mediante `body.light-theme { ... }`. Las variables
    // definidas en `<body>` están más cerca en la cascada que las de `<html>`, por lo que un estilo
    // inline en `<html>` perdería contra la regla light-theme. Escribir en `<body>` coloca la anulación
    // en el MISMO elemento que la regla del tema, y el estilo inline siempre gana frente a un selector
    // para el mismo elemento. De este modo, el acento sobrescribe los bordes tanto en modo claro como oscuro.
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

  /**
   * Persiste el color de acento actual en localStorage.
   */
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
      // Ignorar fallos de almacenamiento para que la personalización nunca rompa el inicio de la app.
    }
  }

  /**
   * Recupera el color de acento guardado en localStorage.
   */
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

  /**
   * Limpia y normaliza un string para asegurar que sea un hexadecimal de 6 dígitos válido.
   */
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
