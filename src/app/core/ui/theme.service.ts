import { Injectable, signal, effect } from '@angular/core';

/**
 * @description Servicio encargado de gestionar el tema visual (claro/oscuro) de la aplicación.
 * Mantiene el estado en localStorage para recordar la preferencia del usuario.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  /** Señal reactiva que indica si el tema oscuro está activo. */
  readonly isDark = signal<boolean>(true);

  constructor() {
    // Cargar preferencia guardada desde localStorage
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme) {
      this.isDark.set(savedTheme === 'dark');
    } else {
      // Usar tema oscuro por defecto para alinearse con el estilo predeterminado de la app
      this.isDark.set(true);
    }

    // Aplicar la clase CSS correspondiente en el body del documento ante cualquier cambio
    effect(() => {
      const dark = this.isDark();
      if (dark) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme-preference', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme-preference', 'light');
      }
    });
  }

  /**
   * @description Alterna entre el tema claro y el tema oscuro.
   */
  toggleTheme(): void {
    this.isDark.update((dark) => !dark);
  }
}
