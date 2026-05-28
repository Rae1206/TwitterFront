import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChartComponent } from 'ng-apexcharts';

import { getErrorMessage } from '../../../core/api/api.utils';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { ThemeService } from '../../../core/ui/theme.service';
import { StateCardComponent } from '../../../shared/components/state-card/state-card.component';

import { AdminDashboardStats } from '../models/admin.models';
import { AdminApiService } from '../services/admin-api.service';

@Component({
  selector: 'app-admin-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateCardComponent, ChartComponent],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.scss',
})
export class AdminDashboardPage {
  private readonly adminApi = inject(AdminApiService);
  private readonly feedback = inject(FeedbackService);
  private readonly theme = inject(ThemeService);

  readonly stats = signal<AdminDashboardStats | null>(null);
  readonly loading = signal(false);
  readonly recalculating = signal(false);
  readonly error = signal<string | null>(null);

  readonly pills = computed(() => {
    const s = this.stats();
    if (!s) return null;
    return [
      { label: 'Total usuarios', value: s.totalUsers },
      { label: 'Total posts', value: s.totalPosts },
      { label: 'Total reportes', value: s.pendingReports + s.flaggedPosts },
      { label: 'Suspendidos', value: s.suspendedUsers },
    ];
  });

  readonly usersDonut = computed(() => {
    const s = this.stats();
    if (!s) return null;
    const foreColor = this.theme.isDark() ? '#f8fafc' : '#0f1419';
    return {
      series: [s.activeUsers, s.suspendedUsers, s.newUsersToday],
      chart: { type: 'donut' as const, height: 300, foreColor },
      labels: ['Activos', 'Suspendidos', 'Nuevos hoy'],
      colors: ['#00E396', '#FF4560', '#008FFB'],
      legend: { position: 'bottom' as const, fontSize: '13px' },
      dataLabels: { enabled: true },
    };
  });

  readonly postsDonut = computed(() => {
    const s = this.stats();
    if (!s) return null;
    const foreColor = this.theme.isDark() ? '#f8fafc' : '#0f1419';
    const normalPosts = Math.max(s.totalPosts - s.flaggedPosts, 0);
    return {
      series: [normalPosts, s.flaggedPosts, s.pendingReports],
      chart: { type: 'donut' as const, height: 300, foreColor },
      labels: ['Normales', 'Flagged', 'Con reportes'],
      colors: ['#008FFB', '#FEB019', '#FF4560'],
      legend: { position: 'bottom' as const, fontSize: '13px' },
      dataLabels: { enabled: true },
    };
  });

  readonly overviewRadial = computed(() => {
    const s = this.stats();
    if (!s) return null;
    const dark = this.theme.isDark();
    const foreColor = dark ? '#f8fafc' : '#0f1419';
    const values = [s.totalUsers, s.totalPosts, s.pendingReports + s.flaggedPosts, s.suspendedUsers];
    const max = Math.max(...values, 1);
    const series = values.map(v => Math.round((v / max) * 100));
    return {
      series,
      chart: { type: 'radialBar' as const, height: 340, foreColor },
      plotOptions: {
        radialBar: {
          hollow: { size: '28%' },
          dataLabels: {
            name: { fontSize: '13px' },
            value: { fontSize: '15px' },
            total: { show: true, label: 'Plataforma', formatter: () => `${s.totalUsers + s.totalPosts}` },
          },
          track: { background: dark ? '#334155' : '#e0e0e0' },
        },
      },
      labels: ['Usuarios', 'Posts', 'Reportes', 'Suspendidos'],
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560'],
      fill: { type: 'gradient' as const, gradient: { shade: 'dark' as const, type: 'vertical' as const, stops: [0, 100] } },
      stroke: { lineCap: 'round' as const },
    };
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      const raw = await firstValueFrom(this.adminApi.getDashboardStats());
      this.stats.set(this.normalizeStats(raw as any));
    } catch (error) {
      this.error.set(getErrorMessage(error, 'No pudimos cargar las estadísticas del panel.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async recalculate(): Promise<void> {
    try {
      this.recalculating.set(true);
      this.error.set(null);
      await firstValueFrom(this.adminApi.recalculateDashboard());
      this.feedback.success('Las estadísticas del panel se recalcularon.', { title: 'Acción de administración completada' });
      await this.load();
    } catch (error) {
      const message = getErrorMessage(error, 'El recálculo del panel falló.');
      this.error.set(message);
      this.feedback.error(message, { title: 'Error en la acción de administración' });
    } finally {
      this.recalculating.set(false);
    }
  }

  private normalizeStats(raw: Record<string, unknown>): AdminDashboardStats {
    const num = (key: string): number => {
      const v = raw[key];
      return typeof v === 'number' ? v : 0;
    };
    return {
      totalUsers: num('total_users') || num('totalUsers'),
      activeUsers: num('active_users') || num('activeUsers'),
      newUsersToday: num('new_users_today') || num('newUsersToday'),
      suspendedUsers: num('suspended_users') || num('suspendedUsers'),
      totalPosts: num('total_posts') || num('totalPosts'),
      flaggedPosts: num('flagged_posts') || num('flaggedPosts'),
      pendingReports: num('pending_reports') || num('pendingReports'),
    };
  }
}
