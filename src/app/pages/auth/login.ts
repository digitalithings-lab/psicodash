import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { goTo } from '../../core/navigation';
import { User } from '../../core/types';
import { ErrorBanner } from '../../shared/ui';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthLayout, ErrorBanner],
  template: `
    <app-auth-layout title="Qué bueno verte" subtitle="Entra a tu panel de Florece.">
      <form class="space-y-5" (ngSubmit)="submit()">
        <div>
          <label class="label" for="email">Correo</label>
          <input id="email" class="input" type="email" name="email" autocomplete="email" [(ngModel)]="email" required />
        </div>
        <div>
          <label class="label" for="password">Contraseña</label>
          <input id="password" class="input" type="password" name="password" autocomplete="current-password" [(ngModel)]="password" required />
        </div>
        <app-error [message]="error()" />
        <button class="btn-primary w-full py-3" type="submit" [disabled]="loading()">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-muted">
        ¿Eres psicólogo y aún no tienes cuenta?
        <a routerLink="/registro" class="font-bold text-leaf-700 hover:underline">Regístrate</a>
      </p>
    </app-auth-layout>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  async submit() {
    this.error.set(null);
    if (!this.email || !this.password) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.loading.set(true);
    let user: User;
    try {
      user = await this.auth.login(this.email.trim(), this.password);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos iniciar sesión.'));
      this.loading.set(false);
      return;
    }
    await goTo(this.router, user.role === 'USER' ? '/sin-acceso' : this.auth.home());
    this.loading.set(false);
  }
}
