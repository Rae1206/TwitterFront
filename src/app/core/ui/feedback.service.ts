import { Injectable, signal } from '@angular/core';

export type FeedbackTone = 'success' | 'error' | 'info';

/**
 * Define en qué parte de la pantalla se renderiza la notificación emergente (toast).
 * - `bottom-right` (por defecto): confirmación de acciones, errores, resultados de guardado.
 * - `top-right`: notificaciones ambientales que no deben congestionar el área de acción
 *   (por ejemplo: "usuario conectado", "nuevo seguidor").
 */
export type FeedbackPosition = 'bottom-right' | 'top-right';

export interface FeedbackItem {
  id: number;
  tone: FeedbackTone;
  message: string;
  title?: string;
  position: FeedbackPosition;
}

interface FeedbackOptions {
  duration?: number;
  title?: string;
  position?: FeedbackPosition;
}

/**
 * @description Servicio encargado de gestionar las notificaciones emergentes (toasts) de la aplicación.
 * Permite emitir mensajes de éxito, error o informativos en distintas posiciones de la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly itemsState = signal<FeedbackItem[]>([]);
  private nextId = 1;

  /** Señal de solo lectura que expone la lista de notificaciones activas. */
  readonly items = this.itemsState.asReadonly();

  /**
   * @description Muestra una notificación de éxito.
   * @param message Mensaje explicativo del suceso.
   * @param options Configuración adicional (duración, título, posición).
   */
  success(message: string, options?: FeedbackOptions): void {
    this.show('success', message, options);
  }

  /**
   * @description Muestra una notificación de error.
   * @param message Mensaje descriptivo del error.
   * @param options Configuración adicional (duración, título, posición).
   */
  error(message: string, options?: FeedbackOptions): void {
    this.show('error', message, { duration: 5200, ...options });
  }

  /**
   * @description Muestra una notificación informativa.
   * @param message Mensaje de la notificación.
   * @param options Configuración adicional (duración, título, posición).
   */
  info(message: string, options?: FeedbackOptions): void {
    this.show('info', message, options);
  }

  /**
   * @description Oculta o descarta una notificación activa según su ID.
   * @param id Identificador de la notificación a descartar.
   */
  dismiss(id: number): void {
    this.itemsState.update((items) => items.filter((item) => item.id !== id));
  }

  /**
   * Construye y encola la notificación, programando su descarte automático.
   */
  private show(tone: FeedbackTone, message: string, options?: FeedbackOptions): void {
    const item: FeedbackItem = {
      id: this.nextId++,
      tone,
      message,
      title: options?.title,
      position: options?.position ?? 'bottom-right',
    };

    this.itemsState.update((items) => [...items, item]);

    const duration = options?.duration ?? 3600;

    globalThis.setTimeout(() => this.dismiss(item.id), duration);
  }
}
