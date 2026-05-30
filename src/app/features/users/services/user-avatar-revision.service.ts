import { Injectable, Signal, signal, WritableSignal } from '@angular/core';

/**
 * @description Rastrea un contador de revisión de avatares por usuario.
 * Permite a los consumidores adjuntarlo como parámetro de consulta (query param)
 * para evadir la caché del navegador tras subir una nueva foto de perfil.
 *
 * Sin este contador, la URL del avatar es idéntica antes y después de subirlo
 * (siempre es `/api/user/{id}/avatar`), por lo que el navegador podría seguir
 * sirviendo la imagen antigua almacenada en caché.
 *
 * Uso:
 *   bump(userId)    -> Invocar tras una subida de avatar exitosa.
 *   getRevision(id) -> Obtener señal de solo lectura; 0 significa "sin cambios en esta sesión".
 */
@Injectable({ providedIn: 'root' })
export class UserAvatarRevisionService {
  private readonly revisions = new Map<string, WritableSignal<number>>();

  /**
   * @description Obtiene el número de revisión actual del avatar de un usuario específico.
   * @param userId ID del usuario.
   * @returns Una Signal con la revisión actual.
   */
  getRevision(userId: string): Signal<number> {
    return this.entry(userId).asReadonly();
  }

  /**
   * @description Incrementa el contador de revisión para forzar la recarga del avatar del usuario.
   * @param userId ID del usuario.
   */
  bump(userId: string): void {
    this.entry(userId).update((value) => value + 1);
  }

  /**
   * Obtiene o inicializa la señal de revisión para un usuario.
   */
  private entry(userId: string): WritableSignal<number> {
    let entry = this.revisions.get(userId);

    if (!entry) {
      entry = signal(0);
      this.revisions.set(userId, entry);
    }

    return entry;
  }
}
