import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { environment } from '../../../../environments/environment';
import { GenericResponse, JsonRecord } from '../../../core/api/api.models';
import { ChangePasswordRequest, RegisterUserRequest, TestEmailRequest, UpdateUserRequest, UserDto, UserListQuery } from '../models/users.models';

/**
 * @description Servicio de API encargado de realizar las peticiones HTTP para el módulo de usuarios.
 * Interactúa directamente con los endpoints del backend para el registro, consulta, actualización de perfil,
 * subida de avatar, cambio de contraseña y envío de correos de prueba.
 */
@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);

  /**
   * @description Registra un nuevo usuario en la plataforma.
   * @param payload Datos del nuevo usuario.
   * @returns Un Observable con el DTO del usuario creado.
   */
  register(payload: RegisterUserRequest): Observable<UserDto> {
    return this.api.post<UserDto, RegisterUserRequest>('/api/user/create', payload);
  }

  /**
   * @description Obtiene la lista completa de usuarios registrados.
   * @param query Parámetros opcionales de búsqueda y filtrado.
   * @returns Un Observable con el listado de usuarios.
   */
  listUsers(query?: UserListQuery): Observable<UserDto[]> {
    return this.api.get<UserDto[], UserListQuery>('/api/user/list', query);
  }

  /**
   * @description Obtiene la información detallada de un usuario por su identificador único.
   * @param id ID único del usuario a consultar.
   * @returns Un Observable con los datos del usuario.
   */
  getUserById(id: string): Observable<UserDto> {
    return this.api.get<UserDto>(`/api/user/${id}`);
  }

  /**
   * @description Actualiza la información de perfil del usuario logueado actualmente.
   * @param payload Campos del perfil a modificar.
   * @returns Un Observable con la información de usuario actualizada.
   */
  updateUser(payload: UpdateUserRequest): Observable<UserDto> {
    return this.api.put<UserDto, UpdateUserRequest>('/api/user/me', payload);
  }

  /**
   * @description Sube una imagen de avatar para el usuario actual y la asocia a su perfil.
   * @param file El archivo binario de la foto de perfil.
   * @returns Un Observable con el usuario actualizado.
   */
  uploadAvatar(file: File): Observable<UserDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<GenericResponse<UserDto>>(`${environment.apiBaseUrl}/api/user/me/avatar`, formData)
      .pipe(map((response) => response.data));
  }

  /**
   * @description Cambia la contraseña del usuario logueado en la aplicación.
   * @param payload Objeto que contiene la contraseña actual y la nueva.
   * @returns Un Observable con un registro JSON de confirmación.
   */
  changePassword(payload: ChangePasswordRequest): Observable<JsonRecord> {
    return this.api.patch<JsonRecord, ChangePasswordRequest>('/api/user/change-password', payload);
  }

  /**
   * @description Elimina físicamente la cuenta de un usuario por su ID.
   * @param id ID único del usuario a eliminar.
   * @returns Un Observable con un registro JSON de confirmación.
   */
  deleteUser(id: string): Observable<JsonRecord> {
    return this.api.delete<JsonRecord>(`/api/user/${id}/delete`);
  }

  /**
   * @description Obtiene los datos del perfil del usuario actualmente autenticado.
   * @returns Un Observable con los datos del usuario actual.
   */
  getCurrentUser(): Observable<UserDto> {
    return this.api.get<UserDto>('/api/user/me');
  }

  /**
   * @description Envía un correo electrónico de prueba a la dirección provista.
   * @param payload Contenido del correo y dirección destinataria.
   * @returns Un Observable con un registro JSON de confirmación de envío.
   */
  sendTestEmail(payload: TestEmailRequest): Observable<JsonRecord> {
    const emailPayload = {
      to: payload.to,
      email: payload.to,
      recipient: payload.to,
      toEmail: payload.to,
      subject: payload.subject,
      body: payload.body,
      message: payload.body,
    };

    return this.api.post<JsonRecord, typeof emailPayload>('/api/user/test-email', emailPayload);
  }
}
