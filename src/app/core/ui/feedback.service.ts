import { Injectable, signal } from '@angular/core';

export type FeedbackTone = 'success' | 'error' | 'info';

/**
 * Where on the screen the toast renders.
 * - `bottom-right` (default): action confirmations, errors, save results.
 * - `top-right`: ambient notifications that should not crowd the action area
 *   (e.g. "user online", "new follower").
 */
export type FeedbackPosition = 'bottom-right' | 'top-right';

export interface FeedbackItem {
  id: number;
  tone: FeedbackTone;
  message: string;
  title?: string;
  position: FeedbackPosition;
}

interface FeedbackOptions {
  duration?: number;
  title?: string;
  position?: FeedbackPosition;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly itemsState = signal<FeedbackItem[]>([]);
  private nextId = 1;

  readonly items = this.itemsState.asReadonly();

  success(message: string, options?: FeedbackOptions): void {
    this.show('success', message, options);
  }

  error(message: string, options?: FeedbackOptions): void {
    this.show('error', message, { duration: 5200, ...options });
  }

  info(message: string, options?: FeedbackOptions): void {
    this.show('info', message, options);
  }

  dismiss(id: number): void {
    this.itemsState.update((items) => items.filter((item) => item.id !== id));
  }

  private show(tone: FeedbackTone, message: string, options?: FeedbackOptions): void {
    const item: FeedbackItem = {
      id: this.nextId++,
      tone,
      message,
      title: options?.title,
      position: options?.position ?? 'bottom-right',
    };

    this.itemsState.update((items) => [...items, item]);

    const duration = options?.duration ?? 3600;

    globalThis.setTimeout(() => this.dismiss(item.id), duration);
  }
}
