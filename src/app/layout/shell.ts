import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Brand } from '../shared/brand';
import { Icon } from '../shared/icon';
import { ThemeToggle } from '../shared/theme-toggle';

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
  { label: 'Emociones', icon: 'sparkles', link: '/emociones' },
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Brand, ThemeToggle],
  template: `
    <a
      href="#contenido"
      class="sr-only z-[60] rounded-full bg-leaf-500 px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Saltar al contenido
    </a>

    <div class="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <!-- Barra superior en móvil y tableta -->
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <a routerLink="/" aria-label="Florece, ir al inicio"><app-brand /></a>
        <button
          type="button"
          class="btn-icon"
          (click)="menuOpen.set(true)"
          aria-label="Abrir menú"
          aria-controls="menu-lateral"
          [attr.aria-expanded]="menuOpen()"
        >
          <app-icon name="menu" size="lg" />
        </button>
      </header>

      <!-- Fondo oscuro detrás del menú en móvil -->
      <div
        class="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
        [class]="menuOpen() ? 'opacity-100' : 'pointer-events-none opacity-0'"
        (click)="menuOpen.set(false)"
        aria-hidden="true"
      ></div>

      <aside
        id="menu-lateral"
        class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface px-4 py-5 transition-[transform,visibility] duration-300 ease-out
          lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0"
        [class]="menuOpen() ? 'visible translate-x-0 shadow-pop' : 'invisible -translate-x-full'"
        aria-label="Menú principal"
      >
        <div class="mb-8 flex items-center justify-between px-3">
          <a routerLink="/" class="rounded-2xl" aria-label="Florece, ir al inicio" (click)="menuOpen.set(false)"><app-brand /></a>
          <button type="button" class="btn-icon -mr-2 lg:hidden" (click)="menuOpen.set(false)" aria-label="Cerrar menú">
            <app-icon name="x" />
          </button>
        </div>

        <p class="eyebrow mb-2 px-3">{{ auth.isAdmin() ? 'Administración' : 'Panel profesional' }}</p>
        <nav class="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Secciones">
          @for (item of nav(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="nav-active"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="relative mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition-colors duration-200 hover:bg-sand hover:text-ink"
              (click)="menuOpen.set(false)"
            >
              <app-icon [name]="item.icon" />
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-6 space-y-4 border-t border-line px-3 pt-5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-muted">Tema</span>
            <app-theme-toggle />
          </div>
          <div class="flex items-center gap-3 rounded-2xl bg-sand p-2.5">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-sm font-extrabold text-leaf-700"
              aria-hidden="true"
            >
              {{ initials() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold">{{ auth.user()?.profile?.displayName }}</p>
              <p class="truncate text-xs text-muted">{{ auth.user()?.email }}</p>
            </div>
            <button type="button" class="btn-icon size-9" (click)="auth.logout()" aria-label="Cerrar sesión" title="Cerrar sesión">
              <app-icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <main id="contenido" tabindex="-1" class="min-w-0 px-4 py-8 outline-none sm:px-8 lg:px-12 lg:py-12">
        <div class="mx-auto max-w-6xl animate-fade-up"><router-outlet /></div>
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);
  protected readonly nav = computed(() => (this.auth.isAdmin() ? ADMIN_NAV : PSY_NAV));
  protected readonly initials = computed(() => {
    const name = this.auth.user()?.profile?.displayName ?? this.auth.user()?.email ?? '';
    const words = name.replace(/^(dra?\.|lic\.|mtro\.|mtra\.)\s*/i, '').split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '🌱';
  });

  @HostListener('document:keydown.escape')
  protected closeMenu() {
    this.menuOpen.set(false);
  }
}
