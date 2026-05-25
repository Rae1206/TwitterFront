import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

import { BrandService } from './brand.service';

@Component({
  selector: 'app-accent-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  templateUrl: './accent-picker.component.html',
  styleUrl: './accent-picker.component.scss',
})
export class AccentPickerComponent {
  protected readonly brandService = inject(BrandService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);
  protected readonly palette = this.brandService.palette;
  protected readonly currentColor = computed(() => this.brandService.accentColor());
  protected readonly triggerBackground = computed(
    () =>
      this.currentColor() ??
      'conic-gradient(from 180deg, #ef4444, #f97316, #facc15, #22c55e, #3b82f6, #a855f7, #ef4444)',
  );

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected apply(color: string): void {
    this.brandService.setAccent(color);
  }

  protected reset(): void {
    this.brandService.reset();
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  protected onEscape(): void {
    this.open.set(false);
  }
}
