import { Component, input } from '@angular/core';
import { Brand } from '../../shared/brand';
import { Icon } from '../../shared/icon';
import { ThemeToggle } from '../../shared/theme-toggle';

const FEATURES = [
  { icon: 'list', title: 'Retos a la medida', text: 'Asigna ejercicios y revisa cómo los vive cada paciente.' },
  { icon: 'calendar', title: 'Tu agenda en orden', text: 'Define tus horarios y confirma citas en un clic.' },
  { icon: 'lock', title: 'Privacidad primero', text: 'Su diario y su chat siguen siendo solo suyos.' },
];

// Marco de las pantallas de acceso: presentación a la izquierda y formulario a la derecha.
@Component({
  selector: 'app-auth-layout',
  imports: [Brand, Icon, ThemeToggle],
  template: `
    <div class="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section class="relative hidden overflow-hidden bg-gradient-to-br from-leaf-500 via-leaf-600 to-leaf-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <!-- Luces suaves de fondo -->
        <div class="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
        <div class="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-peach-500/20 blur-3xl" aria-hidden="true"></div>

        <app-brand size="lg" [inverse]="true" class="relative" />

        <div class="relative max-w-lg">
          <p class="text-5xl" aria-hidden="true">🐻 🐰 🦊 🐱 🦫</p>
          <h2 class="mt-8 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">Acompaña a tus pacientes, un día a la vez.</h2>
          <ul class="mt-10 space-y-5">
            @for (feature of features; track feature.title) {
              <li class="flex gap-4">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <app-icon [name]="feature.icon" />
                </span>
                <div>
                  <p class="font-extrabold">{{ feature.title }}</p>
                  <p class="text-sm text-white/80">{{ feature.text }}</p>
                </div>
              </li>
            }
          </ul>
        </div>

        <p class="relative text-sm text-white/70">Panel profesional de Florece</p>
      </section>

      <section class="flex flex-col px-6 py-6 sm:px-10">
        <div class="flex items-center justify-between lg:justify-end">
          <app-brand class="lg:hidden" />
          <app-theme-toggle />
        </div>
        <div class="flex flex-1 items-center justify-center py-10">
          <div class="w-full max-w-md animate-fade-up">
            <h1 class="text-3xl font-extrabold tracking-tight">{{ title() }}</h1>
            <p class="mb-8 mt-2 text-muted">{{ subtitle() }}</p>
            <ng-content />
          </div>
        </div>
      </section>
    </div>
  `,
})
export class AuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  protected readonly features = FEATURES;
}
