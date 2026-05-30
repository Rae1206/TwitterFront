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

readonly postsArea = computed(() => {
    const s = this.stats();
    if (!s) return null;
    const dark = this.theme.isDark();
    const foreColor = dark ? '#f8fafc' : '#0f1419';
    const normalPosts = Math.max(s.totalPosts - s.flaggedPosts, 0);
    const categories = ['Normales', 'Flagged', 'Con reportes'];
    return {
      series: [{ name: 'Posts', data: [normalPosts, s.flaggedPosts, s.pendingReports + s.flaggedPosts] }],
      chart: { type: 'bar' as const, height: 300, foreColor, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: { categories, labels: { style: { fontSize: '13px' } } },
      colors: ['#008FFB', '#FEB019', '#FF4560'],
      plotOptions: { bar: { borderRadius: 4, distributed: true } },
      dataLabels: { enabled: true, style: { fontSize: '12px' } },
      grid: { borderColor: dark ? '#334155' : '#e0e0e0', strokeDashArray: 4 },
      tooltip: { theme: dark ? 'dark' : 'light' },
      yaxis: { labels: { style: { fontSize: '12px' } }, title: { text: 'Cantidad', style: { fontSize: '12px' } } },
      legend: { show: false },
    };
  });

  readonly overviewMixed = computed(() => {
    const s = this.stats();
    if (!s) return null;
    const dark = this.theme.isDark();
    const foreColor = dark ? '#f8fafc' : '#0f1419';
    const categories = ['Usuarios', 'Posts', 'Reportes', 'Suspendidos'];
    const barValues = [s.totalUsers, s.totalPosts, s.pendingReports + s.flaggedPosts, s.suspendedUsers];
    const activeRatio = s.totalUsers > 0 ? Math.round((s.activeUsers / s.totalUsers) * 100) : 0;
    const lineValues = [activeRatio, null, null, null];
    return {
      series: [
        { name: 'Cantidad', type: 'column' as const, data: barValues },
        { name: '% Activos', type: 'line' as const, data: lineValues },
      ],
      chart: { type: 'bar' as const, height: 340, foreColor, toolbar: { show: false }, fontFamily: 'inherit' },
      xaxis: { categories, labels: { style: { fontSize: '13px' } } },
      yaxis: [
        { title: { text: 'Cantidad', style: { fontSize: '12px' } }, labels: { style: { fontSize: '12px' } } },
        { opposite: true, title: { text: '%', style: { fontSize: '12px' } }, max: 100, labels: { style: { fontSize: '12px' } } },
      ],
      stroke: { width: [0, 3] },
      fill: { type: ['solid', 'solid'] },
      colors: ['#008FFB', '#00E396'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: dark ? '#334155' : '#e0e0e0', strokeDashArray: 4 },
      tooltip: { theme: dark ? 'dark' : 'light' },
      legend: { position: 'top' as const, fontSize: '13px' },
      markers: { size: [0, 5], strokeWidth: 2, hover: { size: 7 } },
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
