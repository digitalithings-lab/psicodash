import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Brand } from '../../shared/brand';

@Component({
  selector: 'app-no-access',
  imports: [Brand],
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div class="card w-full max-w-md animate-fade-up text-center">
        <app-brand class="mb-6 inline-flex" />
        <span class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-leaf-100 text-3xl" aria-hidden="true">🌿</span>
        <h1 class="text-2xl font-extrabold tracking-tight">Este panel es para profesionales</h1>
        <p class="mt-3 text-muted">
          Tu cuenta es de paciente. Para usar Florece, abre la app en tu celular. Si eres psicólogo, crea una cuenta profesional con otro correo.
        </p>
        <button type="button" class="btn-secondary mt-6 w-full" (click)="auth.logout()">Salir</button>
      </div>
    </div>
  `,
})
export class NoAccess {
  protected readonly auth = inject(AuthService);
}
