import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  details?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
}

/**
 * @description Servicio encargado de gestionar y mostrar diálogos de confirmación modales
 * de manera programática en la aplicación, devolviendo promesas para manejar las respuestas.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialogState = signal<ConfirmDialogState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  /** Señal de solo lectura que expone el estado actual del diálogo de confirmación. */
  readonly dialog = this.dialogState.asReadonly();

  /**
   * @description Muestra un diálogo de confirmación al usuario con las opciones provistas.
   * @param options Configuración del diálogo (título, mensaje, etiquetas de botones y tono).
   * @returns Una Promesa que se resuelve con `true` si el usuario confirma, o `false` si cancela.
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    this.resolve(false);

    this.dialogState.set({
      title: options.title,
      message: options.message,
      details: options.details,
      confirmLabel: options.confirmLabel ?? 'Confirmar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      tone: options.tone ?? 'default',
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /**
   * @description Aprueba la confirmación activa, resolviendo la promesa pendiente como `true`.
   */
  approve(): void {
    this.resolve(true);
  }

  /**
   * @description Cancela el diálogo activo, resolviendo la promesa pendiente como `false`.
   */
  cancel(): void {
    this.resolve(false);
  }

  /**
   * Resuelve el diálogo actual de manera segura con el valor booleano dado y limpia el estado.
   */
  private resolve(value: boolean): void {
    const resolve = this.resolver;

    this.resolver = null;
    this.dialogState.set(null);
    resolve?.(value);
  }
}
