import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { AuthResponse } from './auth.models';
import { readJwtClaims } from './jwt-session.utils';
import { AppRole, UserSession } from './session.model';

const accessTokenStorageKey = 'twitter.access_token';
const refreshTokenStorageKey = 'twitter.refresh_token';

/**
 * @description Servicio encargado de gestionar la sesión del usuario en la aplicación.
 * Se encarga de almacenar y recuperar los tokens de acceso y refresco, así como de
 * exponer señales reactivas con el estado de autenticación, el ID de usuario y su rol.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionState = signal<UserSession>(this.createEmptySession());
  private hydrated = false;

  /** Señal de solo lectura que expone el estado actual de la sesión. */
  readonly session = this.sessionState.asReadonly();
  /** Señal computada para obtener el token de acceso actual. */
  readonly accessToken = computed(() => this.sessionState().accessToken);
  /** Señal computada para obtener el token de refresco actual. */
  readonly refreshToken = computed(() => this.sessionState().refreshToken);
  /** Señal computada para obtener el rol del usuario actual. */
  readonly role = computed(() => this.sessionState().role);
  /** Señal computada para obtener el ID del usuario actual. */
  readonly userId = computed(() => this.sessionState().userId);
  /** Señal computada que indica si el usuario está autenticado. */
  readonly authenticated = computed(() => Boolean(this.accessToken() && this.refreshToken()));

  constructor() {
    this.hydrate();
  }

  /**
   * @description Restaura la sesión del usuario desde el almacenamiento local (localStorage)
   * si existe y si estamos en el entorno del navegador.
   */
  hydrate(): void {
    if (this.hydrated) {
      return;
    }

    this.hydrated = true;

    const accessToken = this.readStorage(accessTokenStorageKey);
    const refreshToken = this.readStorage(refreshTokenStorageKey);

    if (!accessToken || !refreshToken) {
      this.clearSession();
      return;
    }

    this.replaceSession({ accessToken, refreshToken });
  }

  /**
   * @description Indica si el usuario actual está autenticado.
   * @returns `true` si el usuario está autenticado, `false` en caso contrario.
   */
  isAuthenticated(): boolean {
    return this.authenticated();
  }

  /**
   * @description Obtiene el token de acceso actual.
   * @returns El token de acceso como cadena, o `null` si no hay sesión activa.
   */
  getAccessToken(): string | null {
    return this.accessToken();
  }

  /**
   * @description Obtiene el token de refresco actual.
   * @returns El token de refresco como cadena, o `null` si no hay sesión activa.
   */
  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  /**
   * @description Obtiene el rol del usuario de la sesión actual.
   * @returns El rol del usuario o `null` si no hay sesión activa.
   */
  getRole(): AppRole | null {
    return this.role();
  }

  /**
   * @description Obtiene el estado completo de la sesión actual.
   * @returns Un objeto `UserSession` con la información del usuario autenticado.
   */
  getSession(): UserSession {
    return this.sessionState();
  }

  /**
   * @description Verifica si el usuario actual posee alguno de los roles permitidos.
   * @param allowedRoles Lista de roles permitidos para acceder al recurso.
   * @returns `true` si el usuario tiene al menos uno de los roles, `false` de lo contrario.
   */
  hasRole(allowedRoles: readonly AppRole[]): boolean {
    const role = this.role();

    return role !== null && allowedRoles.includes(role);
  }

  /**
   * @description Inicia una nueva sesión a partir de la respuesta de autenticación de la API.
   * @param response Objeto con los tokens retornados por el servidor.
   */
  startSession(response: AuthResponse): void {
    this.replaceSession({
      accessToken: response.token,
      refreshToken: response.refreshToken,
    });
  }

  /**
   * @description Limpia la sesión actual del estado reactivo y remueve los tokens del almacenamiento.
   */
  clearSession(): void {
    this.sessionState.set(this.createEmptySession());
    this.removeStorage(accessTokenStorageKey);
    this.removeStorage(refreshTokenStorageKey);
  }

  /**
   * Actualiza el estado reactivo de la sesión y persiste los nuevos tokens en el almacenamiento.
   */
  private replaceSession(tokens: { accessToken: string; refreshToken: string }): void {
    const claims = readJwtClaims(tokens.accessToken);

    this.sessionState.set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      role: claims.role,
      userId: claims.userId,
    });

    this.writeStorage(accessTokenStorageKey, tokens.accessToken);
    this.writeStorage(refreshTokenStorageKey, tokens.refreshToken);
  }

  /**
   * Genera un objeto de sesión vacío por defecto.
   */
  private createEmptySession(): UserSession {
    return {
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
    };
  }

  /**
   * Lee un valor de localStorage de manera segura, previniendo errores en entornos SSR.
   */
  private readStorage(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Escribe un valor en localStorage de manera segura, previniendo errores en entornos SSR.
   */
  private writeStorage(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem(key, value);
    } catch {
      // Ignorar fallos de escritura en almacenamiento para mantener la resiliencia del flujo de autenticación.
    }
  }

  /**
   * Elimina una clave de localStorage de manera segura, previniendo errores en entornos SSR.
   */
  private removeStorage(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.removeItem(key);
    } catch {
      // Ignorar fallos de eliminación en almacenamiento para mantener la resiliencia del flujo de autenticación.
    }
  }
}
