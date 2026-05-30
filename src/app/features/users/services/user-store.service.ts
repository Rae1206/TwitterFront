import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { SessionService } from '../../../core/auth/session.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { UserAvatarRevisionService } from './user-avatar-revision.service';
import { UsersApiService } from './users-api.service';
import { UpdateUserRequest, UserDto } from '../models/users.models';
import { PostStoreService } from '../../posts/services/post-store.service';

/**
 * @description Almacén central de datos (Store) para la gestión del estado de usuarios.
 * Controla el usuario actual logueado, la lista de usuarios del sistema, los estados
 * de carga, los mensajes de error y las acciones de actualización del perfil y avatar.
 */
@Injectable({ providedIn: 'root' })
export class UserStoreService {
  private readonly usersApi = inject(UsersApiService);
  private readonly sessionService = inject(SessionService);
  private readonly feedback = inject(FeedbackService);
  private readonly avatarRevisions = inject(UserAvatarRevisionService);
  private readonly postStore = inject(PostStoreService);

  private readonly currentUserState = signal<UserDto | null>(null);
  private readonly usersState = signal<UserDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  /** Señal que contiene los datos del usuario actualmente autenticado. */
  readonly currentUser = this.currentUserState.asReadonly();
  /** Señal que expone la lista completa de usuarios registrados. */
  readonly users = this.usersState.asReadonly();
  /** Señal indicadora de procesos asíncronos en curso. */
  readonly loading = this.loadingState.asReadonly();
  /** Señal con el mensaje de error del último proceso fallido. */
  readonly error = this.errorState.asReadonly();
  /** Señal computada para obtener el ID del usuario en sesión actual. */
  readonly currentUserId = computed(() => this.currentUserState()?.userId ?? this.sessionService.userId());

  /**
   * @description Carga la información detallada del usuario actual desde el servidor.
   * @param force Determina si se debe forzar una nueva petición HTTP ignorando el estado en caché.
   */
  async loadCurrentUser(force = false): Promise<void> {
    if (this.currentUserState() && !force) {
      return;
    }

    await this.run(async () => {
      this.currentUserState.set(await firstValueFrom(this.usersApi.getCurrentUser()));
    }, 'No pudimos cargar el usuario actual.');
  }

  /**
   * @description Limpia la información del usuario actual en el almacén del cliente.
   */
  clearCurrentUser(): void {
    this.currentUserState.set(null);
  }

  /**
   * @description Carga la lista completa de usuarios registrados en el sistema.
   */
  async loadUsers(): Promise<void> {
    await this.run(async () => {
      this.usersState.set(await firstValueFrom(this.usersApi.listUsers()));
    }, 'No pudimos cargar la lista de usuarios.');
  }

  /**
   * @description Actualiza los datos de perfil (nombre, apodo, biografía, etc.) del usuario autenticado.
   * @param payload Datos del perfil a actualizar.
   * @returns Un objeto `UserDto` con los datos actualizados, o `null` si falló el proceso.
   */
  async updateCurrentUser(payload: UpdateUserRequest): Promise<UserDto | null> {
    if (!this.currentUserId()) {
      this.errorState.set('No se encontró una sesión de usuario activa.');
      this.feedback.error('No se encontró una sesión de usuario activa.', { title: 'Error al actualizar perfil' });
      return null;
    }

    try {
      this.loadingState.set(true);
      this.errorState.set(null);
      const user = await firstValueFrom(this.usersApi.updateUser(payload));
      this.currentUserState.set(user);
      this.usersState.update((users) => users.map((item) => (item.userId === user.userId ? user : item)));
      if (user.userId && user.nickname) {
        this.postStore.updateUserInPosts(user.userId, user.nickname, user.profilePhotoUrl ?? null);
      }
      this.feedback.success('Tu perfil se actualizó.', { title: 'Perfil guardado' });
      return user;
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos actualizar el perfil.');
      this.errorState.set(message);
      this.feedback.error(message, { title: 'Error al actualizar perfil' });
      return null;
    } finally {
      this.loadingState.set(false);
    }
  }

  /**
   * @description Sube y actualiza la foto de perfil (avatar) del usuario actual.
   * @param file El archivo binario de la imagen a subir.
   * @returns Un objeto `UserDto` con el perfil actualizado del usuario, o `null` en caso de fallo.
   */
  async uploadCurrentUserAvatar(file: File): Promise<UserDto | null> {
    if (!this.currentUserId()) {
      this.errorState.set('No se encontró una sesión de usuario activa.');
      this.feedback.error('No se encontró una sesión de usuario activa.', { title: 'Error al subir el avatar' });
      return null;
    }

    try {
      this.loadingState.set(true);
      this.errorState.set(null);
      const user = await firstValueFrom(this.usersApi.uploadAvatar(file));
      this.currentUserState.set(user);
      this.usersState.update((users) => users.map((item) => (item.userId === user.userId ? user : item)));
      if (user.userId) {
        this.avatarRevisions.bump(user.userId);
        if (user.nickname) {
          this.postStore.updateUserInPosts(user.userId, user.nickname, user.profilePhotoUrl ?? null);
        }
      }
      this.feedback.success('Tu foto de perfil se actualizó.', { title: 'Avatar actualizado' });
      return user;
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos subir la foto de perfil.');
      this.errorState.set(message);
      this.feedback.error(message, { title: 'Error al subir el avatar' });
      return null;
    } finally {
      this.loadingState.set(false);
    }
  }

  /**
   * Ejecutor auxiliar para peticiones asíncronas con manejo unificado de estados de error y carga.
   */
  private async run(task: () => Promise<void>, fallbackMessage: string): Promise<void> {
    try {
      this.loadingState.set(true);
      this.errorState.set(null);
      await task();
    } catch (error) {
      this.errorState.set(getErrorMessage(error, fallbackMessage));
    } finally {
      this.loadingState.set(false);
    }
  }
}
