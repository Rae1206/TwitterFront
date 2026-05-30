import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, LoginRequest, RenewRequest } from './auth.models';

/**
 * @description Servicio encargado de comunicarse con el endpoint de autenticación de la API.
 * Proporciona métodos para iniciar sesión y renovar el token de acceso.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly authBaseUrl = `${environment.apiBaseUrl}/api/auth`;

  /**
   * @description Envía las credenciales del usuario para iniciar sesión.
   * @param payload Objeto con las credenciales de inicio de sesión.
   * @returns Un Observable con la respuesta de autenticación.
   */
  login(payload: LoginRequest) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.authBaseUrl}/login`, payload)
      .pipe(map((response) => response.data));
  }

  /**
   * @description Solicita la renovación del token de acceso utilizando el token de refresco.
   * @param payload Objeto con el token de refresco.
   * @returns Un Observable con los nuevos tokens de autenticación.
   */
  renew(payload: RenewRequest) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.authBaseUrl}/renew`, payload)
      .pipe(map((response) => response.data));
  }
}
