import { Component, input } from '@angular/core';

// Marco de las pantallas de acceso: ilustración a la izquierda y formulario a la derecha.
@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="grid min-h-screen lg:grid-cols-2">
      <section class="hidden flex-col justify-between bg-gradient-to-br from-leaf-100 via-cream to-peach-100 p-12 lg:flex">
        <p class="text-2xl font-extrabold text-leaf-700">🌱 Florece</p>
        <div>
          <p class="text-5xl">🐻 🐰 🦊 🐱 🦫</p>
          <h2 class="mt-6 text-4xl font-extrabold leading-tight text-ink">Acompaña a tus pacientes<br />un día a la vez.</h2>
          <p class="mt-4 max-w-md text-lg text-muted">
            Asigna retos, revisa sus respuestas y organiza tus citas. Su diario y su chat siguen siendo privados.
          </p>
        </div>
        <p class="text-sm text-muted">Panel profesional de Florece</p>
      </section>

      <section class="flex items-center justify-center px-6 py-12">
        <div class="w-full max-w-md">
          <p class="mb-8 text-2xl font-extrabold text-leaf-700 lg:hidden">🌱 Florece</p>
          <h1 class="text-3xl font-extrabold">{{ title() }}</h1>
          <p class="mb-8 mt-1 text-muted">{{ subtitle() }}</p>
          <ng-content />
        </div>
      </section>
    </div>
  `,
})
export class AuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
