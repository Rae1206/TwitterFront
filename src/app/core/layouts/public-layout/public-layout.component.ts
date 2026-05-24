import { ChangeDetectionStrategy, Component } from '@angular/core';
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
export class PublicLayoutComponent {}
