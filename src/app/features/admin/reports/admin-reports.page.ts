import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { ConfirmService } from '../../../core/ui/confirm.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { PostDto } from '../../posts/models/posts.models';
import { PostsApiService } from '../../posts/services/posts-api.service';
import { PostMediaCarouselComponent } from '../../private/home/components/post-media-carousel/post-media-carousel.component';
import { StateCardComponent } from '../../../shared/components/state-card/state-card.component';

import { AdminReportDto } from '../models/admin.models';
import { AdminApiService } from '../services/admin-api.service';

type ReportHistoryFilter = 'all' | 'pending' | 'resolved' | 'dismissed';

@Component({
  selector: 'app-admin-reports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, StateCardComponent, PostMediaCarouselComponent],
  templateUrl: './admin-reports.page.html',
  styleUrl: './admin-reports.page.scss',
})
export class AdminReportsPage {
  private readonly adminApi = inject(AdminApiService);
  private readonly postsApi = inject(PostsApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly feedback = inject(FeedbackService);
  private readonly confirm = inject(ConfirmService);
  private isInitialLoad = true;
  private readonly carouselIndexes = new Map<string, number>();

  readonly pendingReports = signal<AdminReportDto[]>([]);
  readonly allReports = signal<AdminReportDto[]>([]);
  readonly loading = signal(false);
  readonly actingReportId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly selected = signal<AdminReportDto | null>(null);
  readonly historyFilter = signal<ReportHistoryFilter>('all');
  readonly previewPost = signal<PostDto | null>(null);
  readonly previewLoading = signal(false);
  readonly createForm = this.formBuilder.group({ postId: ['', Validators.required], reason: ['', Validators.required], description: [''] });
  readonly resolveForm = this.formBuilder.group({ reportId: ['', Validators.required], resolution: [''], postAction: ['none'] });
  readonly queueFocus = computed(() => this.selected() ?? this.pendingReports()[0] ?? this.allReports()[0] ?? null);
  readonly pendingCount = computed(() => this.pendingReports().length);
  readonly resolvedCount = computed(() => this.allReports().filter((report) => this.reportStatus(report) === 'Resuelto').length);
  readonly dismissedCount = computed(() => this.allReports().filter((report) => this.reportStatus(report) === 'Descartado').length);

  readonly filteredHistory = computed(() => {
    const filter = this.historyFilter();

    if (filter === 'all') {
      return this.allReports();
    }

    return this.allReports().filter((report) => {
      const status = this.reportStatus(report).toLowerCase();

      switch (filter) {
        case 'pending':
          return status === 'pendiente';
        case 'resolved':
          return status === 'resuelto';
        case 'dismissed':
          return status === 'descartado';
        default:
          return true;
      }
    });
  });

  constructor() { void this.load(); }

  protected async load(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);
      const [pending, all] = await Promise.all([
        firstValueFrom(this.adminApi.getPendingReports()),
        firstValueFrom(this.adminApi.getAllReports()),
      ]);
      const postPending = pending.filter((r) => r.entityType === 'Post' || Boolean(r.postId));
      const postAll = all.filter((r) => r.entityType === 'Post' || Boolean(r.postId));
      this.pendingReports.set(postPending);
      this.allReports.set(postAll);
      this.syncSelection(postPending, postAll);
    } catch (error) {
      this.error.set(getErrorMessage(error, 'No pudimos cargar los reportes.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected pick(report: AdminReportDto): void {
    this.selected.set(report);
    this.resolveForm.patchValue({ reportId: report.reportId ?? '' });
    setTimeout(() => {
      const el = document.querySelector('.workspace-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  protected setHistoryFilter(filter: ReportHistoryFilter): void {
    this.historyFilter.set(filter);
  }

  protected async create(): Promise<void> {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    await this.run(null, async () => { await firstValueFrom(this.adminApi.createReport(this.createForm.getRawValue())); this.feedback.success('El reporte se creó correctamente.', { title: 'Reporte creado' }); this.createForm.reset({ postId: '', reason: '', description: '' }); await this.load(); }, 'Falló la creación del reporte.');
  }



  protected async resolve(): Promise<void> {
    if (this.resolveForm.invalid) { this.resolveForm.markAllAsTouched(); return; }
    const { reportId, resolution, postAction } = this.resolveForm.getRawValue();

    const report = this.findReport(reportId);
    const confirmed = await this.confirm.confirm({
      title: '¿Resolver este reporte?',
      message: 'Marca el caso de moderación como resuelto desde el espacio de trabajo de reportes.',
      details: report ? this.reportTitle(report) : undefined,
      confirmLabel: 'Resolver reporte',
    });

    if (!confirmed) {
      return;
    }

    await this.run(reportId, async () => { 
      if (report && report.postId) {
        if (postAction === 'flag') {
          await firstValueFrom(this.adminApi.flagPost(report.postId, { reason: report.reason || 'Reporte aprobado por moderación.' }));
        } else if (postAction === 'delete') {
          await firstValueFrom(this.adminApi.deleteAdminPost(report.postId));
        }
      }
      await firstValueFrom(this.adminApi.resolveReport(reportId, { resolution })); 
      this.feedback.success('El reporte se resolvió.', { title: 'Reporte resuelto' }); 
      this.selected.set(null);
      this.resolveForm.reset({ reportId: '', resolution: '', postAction: 'none' }); 
      await this.load(); 
    }, 'Falló la resolución del reporte.');
  }

  protected async dismiss(report: AdminReportDto): Promise<void> {
    const reportId = report.reportId;

    if (!reportId) { return; }

    const confirmed = await this.confirm.confirm({
      title: '¿Descartar este reporte?',
      message: 'Descartarlo lo quita del flujo de moderación pendiente sin resolverlo.',
      details: this.reportTitle(report),
      confirmLabel: 'Descartar reporte',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

      await this.run(reportId, async () => { 
      await firstValueFrom(this.adminApi.dismissReport(reportId, { reason: 'Descartado desde la consola de moderación.' })); 
      this.feedback.info('El reporte se descartó.', { title: 'Reporte descartado' }); 
      this.selected.set(null);
      this.resolveForm.reset({ reportId: '', resolution: '', postAction: 'none' });
      await this.load(); 
    }, 'Falló el descarte del reporte.');
  }

  protected reportTitle(report: AdminReportDto): string {
    return report.reason?.trim() || report.reportId || 'Reporte';
  }

  protected reportStatus(report: AdminReportDto): string {
    const status = (report.status ?? '').trim().toLowerCase();

    if (status === 'resolved') {
      return 'Resuelto';
    }

    if (status === 'dismissed') {
      return 'Descartado';
    }

    return 'Pendiente';
  }

  protected reportSummary(report: AdminReportDto): string {
    return report.description?.trim() || 'Sin descripción.';
  }

  protected isSelected(report: AdminReportDto): boolean {
    return this.selected()?.reportId === report.reportId;
  }

  protected isActing(reportId: string | undefined): boolean {
    return Boolean(reportId) && this.actingReportId() === reportId;
  }

  private findReport(reportId: string): AdminReportDto | null {
    return [...this.pendingReports(), ...this.allReports()].find((report) => report.reportId === reportId) ?? null;
  }

  private syncSelection(pending: AdminReportDto[], all: AdminReportDto[]): void {
    const currentSelectionId = this.selected()?.reportId;
    const availableReports = [...pending, ...all];

    if (currentSelectionId) {
      const found = availableReports.find((report) => report.reportId === currentSelectionId);
      this.selected.set(found ?? null);
      if (found) {
        this.pick(found);
      }
      return;
    }

    if (this.isInitialLoad) {
      this.isInitialLoad = false;
      this.selected.set(pending[0] ?? all[0] ?? null);
      if (this.selected()) {
        this.pick(this.selected()!);
      }
    } else {
      this.selected.set(null);
    }
  }

  private async run(reportId: string | null, task: () => Promise<void>, fallback: string): Promise<void> {
    try { this.actingReportId.set(reportId); this.error.set(null); await task(); } catch (error) { const message = getErrorMessage(error, fallback); this.error.set(message); this.feedback.error(message, { title: 'Error en la acción de administración' }); } finally { this.actingReportId.set(null); }
  }

  protected async openPostPreview(postId: string): Promise<void> {
    try {
      this.previewLoading.set(true);
      const post = await firstValueFrom(this.postsApi.getPostById(postId));
      this.previewPost.set(post);
    } catch {
      this.feedback.error('No se pudo cargar la publicación.', { title: 'Error' });
    } finally {
      this.previewLoading.set(false);
    }
  }

  protected closePostPreview(): void {
    this.previewPost.set(null);
  }

  protected previewAuthorName(post: PostDto): string {
    return post.userNickname || post.username || 'Usuario';
  }

  protected previewAuthorHandle(post: PostDto): string {
    return post.username ? `@${post.username}` : '';
  }

  protected getCarouselIndex(postId: string | undefined): number {
    return this.carouselIndexes.get(postId ?? '') ?? 0;
  }

  protected prevCarousel(postId: string | undefined, total: number): void {
    const id = postId ?? '';
    const current = this.carouselIndexes.get(id) ?? 0;
    this.carouselIndexes.set(id, current > 0 ? current - 1 : total - 1);
  }

  protected nextCarousel(postId: string | undefined, total: number): void {
    const id = postId ?? '';
    const current = this.carouselIndexes.get(id) ?? 0;
    this.carouselIndexes.set(id, current < total - 1 ? current + 1 : 0);
  }
}
