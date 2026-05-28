import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { StateCardComponent } from '../../../shared/components/state-card/state-card.component';
import { UserDto } from '../../users/models/users.models';
import { UsersApiService } from '../../users/services/users-api.service';

import { AdminReportDto, SuspendUserRequest } from '../models/admin.models';
import { AdminApiService } from '../services/admin-api.service';

@Component({
  selector: 'app-admin-suspensions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, StateCardComponent, RouterLink],
  templateUrl: './admin-suspensions.page.html',
  styleUrl: './admin-suspensions.page.scss',
})
export class AdminSuspensionsPage {
  private readonly adminApi = inject(AdminApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly confirm = inject(ConfirmService);

  readonly suspendForm = this.formBuilder.group({
    userId: ['', Validators.required],
    suspensionType: ['Temporary', Validators.required],
    reason: ['Revisión de política requerida', Validators.required],
    until: [''],
  });
  readonly liftForm = this.formBuilder.group({ userId: ['', Validators.required], reason: ['Revisión de moderación completada'] });
  readonly error = signal<string | null>(null);
  readonly acting = signal<string | null>(null);

  readonly pendingUserReports = signal<AdminReportDto[]>([]);
  readonly usersMap = signal<Map<string, UserDto>>(new Map());
  readonly activeResolvingReportId = signal<string | null>(null);

  constructor() {
    void this.loadUserReports();
  }

  protected async suspend(): Promise<void> {
    if (this.suspendForm.invalid) {
      this.suspendForm.markAllAsTouched();
      return;
    }

    const raw = this.suspendForm.getRawValue();
    const payload: SuspendUserRequest = {
      userId: raw.userId,
      suspensionType: raw.suspensionType,
      reason: raw.reason,
      endsAt: raw.suspensionType === 'Temporary' && raw.until ? new Date(raw.until).toISOString() : null
    };

    const confirmed = await this.confirm.confirm({
      title: '¿Suspender este usuario?',
      message: 'La suspensión es una acción de moderación de alta sensibilidad y solo debe hacerse con un motivo claro registrado.',
      details: payload.reason,
      confirmLabel: 'Suspender usuario',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    await this.run(
      'Suspendiendo usuario',
      async () => {
        await firstValueFrom(this.adminApi.suspendUser(payload));

        const reportId = this.activeResolvingReportId();
        if (reportId) {
          await firstValueFrom(this.adminApi.resolveReport(reportId, { resolutionNote: `Usuario suspendido: ${payload.reason}` }));
          this.activeResolvingReportId.set(null);
          await this.loadUserReports();
        }

        this.feedback.success('La suspensión del usuario quedó registrada.', { title: 'Usuario suspendido' });
        this.suspendForm.reset({ userId: '', suspensionType: 'Temporary', reason: 'Revisión de política requerida', until: '' });
      },
      'Falló la suspensión del usuario.',
    );
  }

  protected async loadUserReports(): Promise<void> {
    try {
      const pending = await firstValueFrom(this.adminApi.getPendingReports());
      const userReports = pending.filter((r) => r.entityType === 'User' || (!r.postId && Boolean(r.reportedUserId)));
      this.pendingUserReports.set(userReports);

      // Fetch user details for each unique reportedUserId to show in UI
      const userIds = [...new Set(userReports.map(r => r.reportedUserId).filter(Boolean) as string[])];
      const newMap = new Map(this.usersMap());
      await Promise.all(
        userIds.map(async (id) => {
          if (!newMap.has(id)) {
            try {
              const u = await firstValueFrom(this.usersApi.getUserById(id));
              newMap.set(id, u);
            } catch {
              // Ignore if user not found
            }
          }
        })
      );
      this.usersMap.set(newMap);
    } catch {
      // Fail silently
    }
  }

  protected getUser(userId: string | undefined): UserDto | null {
    return userId ? (this.usersMap().get(userId) ?? null) : null;
  }

  protected fillSuspendForm(userId: string | undefined, reason: string | undefined, reportId: string | undefined): void {
    if (!userId) return;
    this.suspendForm.patchValue({
      userId,
      reason: reason || 'Infracción de las políticas de la plataforma'
    });
    this.activeResolvingReportId.set(reportId ?? null);
    this.feedback.info('Formulario de suspensión completado con los datos del reporte. Ajustá el tiempo de finalización y confirmá.', { title: 'Reporte cargado' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async dismissUserReport(reportId: string | undefined): Promise<void> {
    if (!reportId) return;
    const confirmed = await this.confirm.confirm({
      title: '¿Descartar este reporte?',
      message: 'Esta acción ignorará la denuncia sin aplicar ninguna suspensión al usuario.',
      confirmLabel: 'Descartar reporte',
      tone: 'danger'
    });
    if (!confirmed) return;

    await this.run(
      'Descartando reporte',
      async () => {
        await firstValueFrom(this.adminApi.dismissReport(reportId, {}));
        this.feedback.info('El reporte de usuario fue descartado.', { title: 'Reporte descartado' });
        await this.loadUserReports();
      },
      'Falló el descarte del reporte.'
    );
  }

  protected async lift(): Promise<void> {
    if (this.liftForm.invalid) {
      this.liftForm.markAllAsTouched();
      return;
    }

    const payload = this.liftForm.getRawValue();
    const confirmed = await this.confirm.confirm({
      title: '¿Levantar esta suspensión?',
      message: 'Úsalo solo después de que la revisión de moderación esté completa y la cuenta pueda volver al estado normal con seguridad.',
      details: payload.reason || 'No se proporcionó motivo del levantamiento.',
      confirmLabel: 'Levantar suspensión',
    });

    if (!confirmed) {
      return;
    }

    await this.run(
      'Levantando suspensión',
      async () => {
        await firstValueFrom(this.adminApi.liftSuspension(payload));
        this.feedback.success('La suspensión fue levantada.', { title: 'Suspensión levantada' });
        this.liftForm.reset({ userId: '', reason: 'Revisión de moderación completada' });
      },
      'Falló el levantamiento de la suspensión.',
    );
  }

  private async run(action: string, task: () => Promise<void>, fallback: string): Promise<void> {
    try {
      this.acting.set(action);
      this.error.set(null);
      await task();
    } catch (error) {
      const message = getErrorMessage(error, fallback);
      this.error.set(message);
      this.feedback.error(message, { title: 'Error en la acción de suspensión' });
    } finally {
      this.acting.set(null);
    }
  }
}
