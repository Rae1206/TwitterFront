import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { SessionService } from '../../../core/auth/session.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { UsersApiService } from '../../users/services/users-api.service';


@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly usersApi = inject(UsersApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly sessionService = inject(SessionService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  readonly registerForm = this.formBuilder.group({
    nickname: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  protected async register(): Promise<void> {
    if (this.registerForm.invalid || this.loading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    try {
      this.loading.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);
      const rawForm = this.registerForm.getRawValue();
      await firstValueFrom(this.usersApi.register(rawForm));

      // Auto login after successful registration
      const sessionResponse = await firstValueFrom(
        this.authApi.login({
          email: rawForm.email,
          password: rawForm.password,
        })
      );
      this.sessionService.startSession(sessionResponse);

      this.feedback.success('¡Registro completado e inicio de sesión automático exitoso!', {
        title: '¡Bienvenido!',
      });
      await this.router.navigateByUrl('/home');
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos crear el usuario todavía.');
      this.errorMessage.set(message);
      this.feedback.error(message, { title: 'Error al registrar' });
    } finally {
      this.loading.set(false);
    }
  }

  protected showControlError(controlName: 'nickname' | 'email' | 'password'): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }
}
