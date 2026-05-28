import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { SessionService } from '../../../core/auth/session.service';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { StateCardComponent } from '../../../shared/components/state-card/state-card.component';

import { AdminUserRecord, RoleDto } from '../models/admin.models';
import { AdminApiService } from '../services/admin-api.service';

@Component({
  selector: 'app-admin-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StateCardComponent],
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.scss',
})
export class AdminUsersPage {
  private readonly adminApi = inject(AdminApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly confirm = inject(ConfirmService);
  private readonly sessionService = inject(SessionService);

  readonly users = signal<AdminUserRecord[]>([]);
  readonly loading = signal(false);
  readonly actingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly selected = signal<AdminUserRecord | null>(null);
  readonly currentUserId = computed(() => this.sessionService.userId());

  readonly activeUsers = computed(() => this.users().filter(u => !u.deletedAt && u.isActive !== false));
  readonly inactiveUsers = computed(() => this.users().filter(u => u.deletedAt || u.isActive === false));
  readonly roleForm = this.formBuilder.group({
    userId: ['', [Validators.required]],
    roleId: ['', [Validators.required]],
  });

  readonly roles = signal<RoleDto[]>([]);

  protected isSelf(userId: string | undefined | null): boolean {
    const current = this.currentUserId();
    return Boolean(userId && current && userId === current);
  }

  constructor() {
    void this.load();
    void this.loadRoles();
  }

  protected async load(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      this.users.set(await firstValueFrom(this.adminApi.listUsers()));
    } catch (error) {
      this.error.set(getErrorMessage(error, 'No pudimos cargar los usuarios de administración.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      this.roles.set(await firstValueFrom(this.adminApi.listRoles()));
    } catch { /* roles fallback empty */ }
  }

  protected pick(user: AdminUserRecord): void {
    this.selected.set(user);
    this.roleForm.reset({ userId: user.userId ?? '', roleId: '' });
  }

  protected async submitRoleChange(): Promise<void> {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    const { userId, roleId } = this.roleForm.getRawValue();
    await this.run(userId, async () => {
      await firstValueFrom(this.adminApi.changeUserRole(userId, { roleId }));
      this.feedback.success('El rol del usuario se actualizó.', { title: 'Rol cambiado' });
      await this.load();
    }, 'Falló la actualización del rol.');
  }

  protected async deleteUser(userId: string | undefined): Promise<void> {
    if (!userId) {
      return;
    }

    if (this.isSelf(userId)) {
      this.feedback.error(
        'No podés eliminar tu propia cuenta desde la consola de administración. Pedile a otro admin que lo haga si es necesario.',
        { title: 'Acción bloqueada' },
      );
      return;
    }

    const confirmed = await this.confirm.confirm({
      title: '¿Eliminar este usuario?',
      message: 'Esto elimina la cuenta (soft delete) desde la consola de administración. Úsalo solo cuando la decisión de moderación sea final.',
      confirmLabel: 'Eliminar usuario',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    await this.run(userId, async () => {
      await firstValueFrom(this.adminApi.deleteAdminUser(userId));
      this.feedback.success('El usuario se eliminó desde la consola de administración.', { title: 'Usuario eliminado' });
      await this.load();
    }, 'Falló la eliminación del usuario.');
  }

  protected async restoreUser(userId: string | undefined): Promise<void> {
    if (!userId) {
      return;
    }

    const confirmed = await this.confirm.confirm({
      title: '¿Restaurar este usuario?',
      message: 'Devuelve la cuenta a un estado activo de moderación en la consola de administración.',
      confirmLabel: 'Restaurar usuario',
    });

    if (!confirmed) {
      return;
    }

    await this.run(userId, async () => {
      await firstValueFrom(this.adminApi.restoreAdminUser(userId));
      this.feedback.success('La cuenta del usuario se restauró.', { title: 'Usuario restaurado' });
      await this.load();
    }, 'Falló la restauración del usuario.');
  }

  protected async verifyUser(userId: string | undefined, active: boolean): Promise<void> {
    if (!userId) {
      return;
    }

    const confirmed = await this.confirm.confirm({
      title: active ? '¿Desactivar este usuario?' : '¿Activar este usuario?',
      message: active
        ? 'Desactiva la cuenta del usuario. No podrá iniciar sesión ni realizar acciones.'
        : 'Activa la cuenta del usuario, restaurando su acceso completo a la plataforma.',
      confirmLabel: active ? 'Desactivar' : 'Activar',
    });

    if (!confirmed) {
      return;
    }

    await this.run(userId, async () => {
      await firstValueFrom(active ? this.adminApi.unverifyUser(userId) : this.adminApi.verifyUser(userId));
      this.feedback.success(active ? 'La cuenta se desactivó.' : 'La cuenta se activó.', {
        title: active ? 'Cuenta desactivada' : 'Cuenta activada',
      });
      await this.load();
    }, active ? 'Falló la desactivación.' : 'Falló la activación.');
  }

  private async run(id: string, task: () => Promise<void>, fallback: string): Promise<void> {
    try {
      this.actingId.set(id);
      this.error.set(null);
      await task();
    } catch (error) {
      const message = getErrorMessage(error, fallback);
      this.error.set(message);
      this.feedback.error(message, { title: 'Error en la acción de administración' });
    } finally {
      this.actingId.set(null);
    }
  }
}
