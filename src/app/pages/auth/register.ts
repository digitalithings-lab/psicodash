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
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AuthLayout, ErrorBanner],
  template: `
    <app-auth-layout title="Crea tu cuenta profesional" subtitle="Empieza a acompañar a tus pacientes en Florece.">
      <form class="space-y-5" (ngSubmit)="submit()">
        <div>
          <label class="label" for="fullName">Nombre completo</label>
          <input id="fullName" class="input" name="fullName" placeholder="Dra. Laura Méndez" [(ngModel)]="fullName" required />
        </div>
        <div>
          <label class="label" for="license">Cédula profesional</label>
          <input id="license" class="input" name="license" [(ngModel)]="licenseNumber" required />
        </div>
        <div>
          <label class="label" for="specialties">Especialidades</label>
          <input id="specialties" class="input" name="specialties" placeholder="Ansiedad, autoestima, duelo" [(ngModel)]="specialties" />
          <p class="mt-1 text-xs text-muted">Sepáralas con comas.</p>
        </div>
        <div>
          <label class="label" for="email">Correo</label>
          <input id="email" class="input" type="email" name="email" autocomplete="email" [(ngModel)]="email" required />
        </div>
        <div>
          <label class="label" for="password">Contraseña</label>
          <input id="password" class="input" type="password" name="password" autocomplete="new-password" [(ngModel)]="password" required />
          <p class="mt-1 text-xs text-muted">Al menos 8 caracteres.</p>
        </div>
        <label class="flex items-start gap-3 text-sm">
          <input type="checkbox" class="mt-1 size-5 accent-leaf-500" name="accept" [(ngModel)]="accepted" />
          <span>Acepto los términos de uso y el aviso de privacidad, y me comprometo a tratar la información de mis pacientes con confidencialidad.</span>
        </label>
        <app-error [message]="error()" />
        <button class="btn-primary w-full py-3" type="submit" [disabled]="loading()">
          {{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <a routerLink="/login" class="font-bold text-leaf-700 hover:underline">Entra</a>
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
