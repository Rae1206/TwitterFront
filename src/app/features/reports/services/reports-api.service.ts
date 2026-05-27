import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import { ReportDto, CreateReportRequest } from '../models/reports.models';


@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly api = inject(ApiClientService);

  createReport(payload: CreateReportRequest): Observable<ReportDto> {
    return this.api.post<ReportDto, CreateReportRequest>('/api/reports/create', payload);
  }

  checkReportStatus(entityType: string, entityId: string): Observable<{ alreadyReported: boolean }> {
    return this.api.get<{ alreadyReported: boolean }, { entityType: string; entityId: string }>(
      '/api/reports/check',
      { entityType, entityId },
    );
  }

  getMyReports(limit?: number, offset?: number): Observable<ReportDto[]> {
    const query: Record<string, string | number> = {};
    if (limit !== undefined) { query['limit'] = limit; }
    if (offset !== undefined) { query['offset'] = offset; }
    return this.api.get<ReportDto[], Record<string, string | number>>('/api/reports/mine', query);
  }
}