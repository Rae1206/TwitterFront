import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { ReportsApiService } from './reports-api.service';
import { CreateReportRequest, REPORT_ENTITY_TYPE_POST } from '../models/reports.models';


@Injectable({ providedIn: 'root' })
export class ReportStoreService {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly feedback = inject(FeedbackService);

  /** Track which posts the current user has already reported — keyed by entityId */
  private readonly reportedEntitiesState = signal<Record<string, boolean>>({});
  readonly reportedEntities = this.reportedEntitiesState.asReadonly();

  /** Convenience computed: has the given entity been reported? */
  isReported(entityId: string | undefined): boolean {
    return entityId ? Boolean(this.reportedEntitiesState()[entityId]) : false;
  }

  /** Check report status from backend and cache the result */
  async checkReportStatus(entityType: string, entityId: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.reportsApi.checkReportStatus(entityType, entityId),
      );
      if (result.alreadyReported) {
        this.reportedEntitiesState.update(prev => ({ ...prev, [entityId]: true }));
      }
      return result.alreadyReported;
    } catch {
      return false;
    }
  }

  /** Load all user reports to cache their reported states */
  async loadMyReports(): Promise<void> {
    try {
      const reports = await firstValueFrom(this.reportsApi.getMyReports());
      const stateUpdate: Record<string, boolean> = {};
      for (const report of reports) {
        if (report.entityId && report.entityType === REPORT_ENTITY_TYPE_POST) {
          stateUpdate[report.entityId] = true;
        }
      }
      this.reportedEntitiesState.set(stateUpdate);
    } catch {
      // Fail silently
    }
  }

  /** Load reported status for a batch of post IDs */
  async loadReportedStatus(postIds: string[]): Promise<void> {
    for (const id of postIds) {
      if (!this.reportedEntitiesState()[id]) {
        const reported = await this.checkReportStatus(REPORT_ENTITY_TYPE_POST, id);
        if (reported) {
          this.reportedEntitiesState.update(prev => ({ ...prev, [id]: true }));
        }
      }
    }
  }

  /** Submit a report */
  async submitReport(payload: CreateReportRequest): Promise<boolean> {
    try {
      const report = await firstValueFrom(this.reportsApi.createReport(payload));
      const entityId = report?.entityId;
      if (entityId) {
        this.reportedEntitiesState.update(prev => ({ ...prev, [entityId as string]: true }));
      }
      this.feedback.success('Tu reporte fue enviado. Lo revisaremos pronto.', { title: 'Reporte enviado' });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos enviar el reporte.');
      this.feedback.error(message, { title: 'Error al reportar' });
      return false;
    }
  }
}