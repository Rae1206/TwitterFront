import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AccentPickerComponent } from '../../ui/accent-picker.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle.component';

@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet, ThemeToggleComponent, AccentPickerComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent {
  protected aboutOpen = signal(false);
  protected contactOpen = signal(false);

  protected contactName = signal('');
  protected contactEmail = signal('');
  protected contactMessage = signal('');
  protected contactSubmitting = signal(false);
  protected contactSuccess = signal(false);

  protected openAbout(): void {
    this.aboutOpen.set(true);
  }

  protected closeAbout(): void {
    this.aboutOpen.set(false);
  }

  protected openContact(): void {
    this.contactSuccess.set(false);
    this.contactOpen.set(true);
  }

  protected closeContact(): void {
    this.contactOpen.set(false);
    this.resetContactForm();
  }

  protected onNameInput(event: Event): void {
    this.contactName.set((event.target as HTMLInputElement).value);
  }

  protected onEmailInput(event: Event): void {
    this.contactEmail.set((event.target as HTMLInputElement).value);
  }

  protected onMessageInput(event: Event): void {
    this.contactMessage.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitContact(): void {
    if (!this.contactName() || !this.contactEmail() || !this.contactMessage()) {
      return;
    }
    this.contactSubmitting.set(true);
    // Simular petición a la API
    setTimeout(() => {
      this.contactSubmitting.set(false);
      this.contactSuccess.set(true);
      this.resetContactForm();
    }, 1200);
  }

  private resetContactForm(): void {
    this.contactName.set('');
    this.contactEmail.set('');
    this.contactMessage.set('');
  }
}
