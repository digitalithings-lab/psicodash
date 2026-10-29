import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/auth.interceptor';
import { AuthService } from '../../core/auth.service';
import { goTo } from '../../core/navigation';
import { User } from '../../core/types';
import { PasswordField } from '../../shared/password-field';
import { ErrorBanner } from '../../shared/ui';
import { AuthLayout } from './auth-layout';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AuthLayout, ErrorBanner, PasswordField],
  template: `
    <app-auth-layout title="Crea tu cuenta profesional" subtitle="Empieza a acompañar a tus pacientes en Florece.">
      <form class="space-y-5" (ngSubmit)="submit()" novalidate>
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="label" for="fullName">Nombre completo</label>
            <input id="fullName" class="input" name="fullName" autocomplete="name" placeholder="Dra. Laura Méndez" [(ngModel)]="fullName" required />
          </div>
          <div>
            <label class="label" for="license">Cédula profesional</label>
            <input id="license" class="input" name="license" inputmode="numeric" [(ngModel)]="licenseNumber" required />
          </div>
          <div>
            <label class="label" for="specialties">Especialidades <span class="font-semibold text-muted">(opcional)</span></label>
            <input
              id="specialties"
              class="input"
              name="specialties"
              placeholder="Ansiedad, duelo"
              aria-describedby="specialties-hint"
              [(ngModel)]="specialties"
            />
            <p id="specialties-hint" class="hint">Sepáralas con comas.</p>
          </div>
        </div>
        <div>
          <label class="label" for="email">Correo</label>
          <input id="email" class="input" type="email" name="email" autocomplete="email" inputmode="email" placeholder="tu@correo.com" [(ngModel)]="email" required />
        </div>
        <div>
          <label class="label" for="password">Contraseña</label>
          <app-password-field inputId="password" autocomplete="new-password" describedBy="password-hint" [(value)]="password" />
          <div class="mt-2 flex gap-1.5" aria-hidden="true">
            @for (step of [1, 2, 3]; track step) {
              <span class="h-1.5 flex-1 rounded-full transition-colors duration-300" [class]="strength() >= step ? strengthColor() : 'bg-sand'"></span>
            }
          </div>
          <p id="password-hint" class="hint">Al menos 8 caracteres. {{ strengthLabel() }}</p>
        </div>
        <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm transition-colors hover:border-line-strong">
          <input type="checkbox" class="mt-0.5 size-5 shrink-0 cursor-pointer" name="accept" [(ngModel)]="accepted" />
          <span>Acepto los términos de uso y el aviso de privacidad, y me comprometo a tratar la información de mis pacientes con confidencialidad.</span>
        </label>
        <app-error [message]="error()" />
        <button class="btn-primary w-full py-3 text-base" type="submit" [disabled]="loading()" [attr.aria-busy]="loading()">
          @if (loading()) {
            <span class="spinner" aria-hidden="true"></span> Creando cuenta…
          } @else {
            Crear cuenta
          }
        </button>
      </form>
      <p class="mt-8 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <a routerLink="/login" class="link">Entra</a>
      </p>
    </app-auth-layout>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected fullName = '';
  protected licenseNumber = '';
  protected specialties = '';
  protected email = '';
  protected password = '';
  protected accepted = false;
  protected readonly loading = signal(false);

  // Fuerza aproximada: largo, mezcla de mayúsculas/minúsculas y números o símbolos.
  protected strength() {
    const p = this.password;
    if (p.length < 8) return p.length > 0 ? 1 : 0;
    let score = 1;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p) && /[\d\W]/.test(p)) score++;
    return Math.min(score, 3);
  }
  protected strengthColor() {
    return ['bg-sand', 'bg-danger-500', 'bg-peach-500', 'bg-leaf-500'][this.strength()];
  }
  protected strengthLabel() {
    return ['', 'Aún es corta.', 'Buena.', 'Muy segura.'][this.strength()];
  }
  protected readonly error = signal<string | null>(null);

  async submit() {
    this.error.set(null);
    if (!this.fullName.trim() || !this.licenseNumber.trim() || !this.email.trim()) {
      this.error.set('Completa tu nombre, cédula y correo.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!this.accepted) {
      this.error.set('Para crear tu cuenta necesitas aceptar los términos y el aviso de privacidad.');
      return;
    }
    this.loading.set(true);
    let user: User;
    try {
      user = await this.auth.registerPsychologist({
        email: this.email.trim(),
        password: this.password,
        fullName: this.fullName.trim(),
        licenseNumber: this.licenseNumber.trim(),
        specialties: this.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos crear tu cuenta.'));
      this.loading.set(false);
      return;
    }
    // La cuenta ya existe: un fallo al cambiar de pantalla no debe parecer un error de registro.
    await goTo(this.router, user.role === 'PSYCHOLOGIST' ? '/perfil?bienvenida=1' : this.auth.home());
    this.loading.set(false);
  }
}
