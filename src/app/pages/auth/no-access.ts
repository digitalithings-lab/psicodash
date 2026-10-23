import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-no-access',
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span class="text-6xl">🌿</span>
      <h1 class="text-3xl font-extrabold">Este panel es para profesionales</h1>
      <p class="max-w-md text-muted">
        Tu cuenta es de paciente. Para usar Florece, abre la app en tu celular. Si eres psicólogo, crea una cuenta profesional con otro correo.
      </p>
      <button class="btn-secondary" (click)="auth.logout()">Salir</button>
    </div>
  `,
})
export class NoAccess {
  protected readonly auth = inject(AuthService);
}
