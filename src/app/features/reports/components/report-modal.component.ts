import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { REPORT_CATEGORIES, REPORT_ENTITY_TYPE_POST, ReportCategory } from '../models/reports.models';


@Component({
  selector: 'app-report-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './report-modal.component.html',
  styleUrl: './report-modal.component.scss',
})
export class ReportModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly entityType = input(REPORT_ENTITY_TYPE_POST);
  readonly entityId = input.required<string>();
  readonly isSubmitting = input(false);
  readonly alreadyReported = input(false);

  readonly reportSubmitted = output<{ entityType: string; entityId: string; category: string; description?: string }>();
  readonly closeModal = output<void>();

  protected selectedCategory: ReportCategory | '' = '';
  protected description = '';

  protected readonly categories = REPORT_CATEGORIES;

  protected get canSubmit(): boolean {
    return this.selectedCategory !== '';
  }

  protected selectCategory(category: ReportCategory): void {
    this.selectedCategory = category;
  }

  protected submitReport(): void {
    if (!this.canSubmit || this.isSubmitting()) return;
    this.reportSubmitted.emit({
      entityType: this.entityType(),
      entityId: this.entityId(),
      category: this.selectedCategory as ReportCategory,
      description: this.description.trim() || undefined,
    });
  }

  protected close(): void {
    this.selectedCategory = '';
    this.description = '';
    this.closeModal.emit();
  }
}