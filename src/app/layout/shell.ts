import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Icon } from '../shared/icon';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

const PSY_NAV: NavItem[] = [
  { label: 'Inicio', icon: 'home', link: '/inicio' },
  { label: 'Pacientes', icon: 'users', link: '/pacientes' },
  { label: 'Agenda', icon: 'calendar', link: '/agenda' },
  { label: 'Mi perfil', icon: 'user', link: '/perfil' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Resumen', icon: 'chart', link: '/admin', exact: true },
  { label: 'Psicólogos', icon: 'users', link: '/admin/psicologos' },
  { label: 'Catálogo de retos', icon: 'list', link: '/admin/retos' },
  { label: 'Líneas de ayuda', icon: 'phone', link: '/admin/lineas-de-ayuda' },
  { label: 'Alertas de riesgo', icon: 'bell', link: '/admin/alertas' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="min-h-screen lg:flex">
      <!-- Barra superior en móvil -->
      <div class="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <span class="text-xl font-extrabold text-leaf-700">🌱 Florece</span>
        <button class="rounded-full p-2 hover:bg-sand" (click)="menuOpen.set(!menuOpen())" aria-label="Abrir menú">
          <app-icon name="menu" />
        </button>
      </div>

      <aside
        class="fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-line bg-white p-6 transition-transform lg:static lg:flex lg:translate-x-0"
        [class.flex]="menuOpen()"
        [class.hidden]="!menuOpen()"
      >
        <div class="mb-8">
          <p class="text-2xl font-extrabold text-leaf-700">🌱 Florece</p>
          <p class="text-sm text-muted">{{ auth.isAdmin() ? 'Administración' : 'Panel profesional' }}</p>
        </div>

        <nav class="flex flex-1 flex-col gap-1" aria-label="Secciones">
          @for (item of nav(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-leaf-100 !text-leaf-700"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-muted transition hover:bg-cream"
              (click)="menuOpen.set(false)"
            >
              <app-icon [name]="item.icon" />
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-6 border-t border-line pt-4">
          <p class="truncate font-bold">{{ auth.user()?.profile?.displayName }}</p>
          <p class="mb-3 truncate text-sm text-muted">{{ auth.user()?.email }}</p>
          <button class="btn-ghost w-full justify-start px-3" (click)="auth.logout()">
            <app-icon name="logout" /> Cerrar sesión
          </button>
        </div>
      </aside>

      @if (menuOpen()) {
        <div class="fixed inset-0 z-30 bg-ink/30 lg:hidden" (click)="menuOpen.set(false)"></div>
      }

      <main class="flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-10">
        <div class="mx-auto max-w-6xl"><router-outlet /></div>
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly nav = computed(() => (this.auth.isAdmin() ? ADMIN_NAV : PSY_NAV));
}
