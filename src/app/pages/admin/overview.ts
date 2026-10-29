import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AdminStats } from '../../core/types';
import { Icon } from '../../shared/icon';
import { ErrorBanner, PageHeader, SkeletonCards, Stat } from '../../shared/ui';

@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink, PageHeader, SkeletonCards, ErrorBanner, Stat, Icon],
  template: `
    <app-page-header eyebrow="Administración" title="Resumen" subtitle="Cómo va Florece hoy." />
    <app-error [message]="error()" />

    @if (!stats()) {
      <app-skeleton-cards [count]="6" />
    } @else {
      @if (stats()!.pendingRiskEvents > 0) {
        <a
          routerLink="/admin/alertas"
          class="card-interactive mb-6 flex items-center gap-4 border-danger-500/30 bg-danger-100 text-danger-500"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface/60"><app-icon name="alert" size="lg" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-extrabold">Hay {{ stats()!.pendingRiskEvents }} {{ stats()!.pendingRiskEvents === 1 ? 'alerta' : 'alertas' }} de riesgo sin revisar</p>
            <p class="text-sm opacity-90">Revísalas cuanto antes: alguien podría necesitar apoyo.</p>
          </div>
          <app-icon name="arrowRight" />
        </a>
      }
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (card of cards(); track card.label) {
          <app-stat [label]="card.label" [value]="card.value" [emoji]="card.emoji" [tint]="card.tint" [link]="card.link" />
        }
      </div>
    }
  `,
})
export class AdminOverview implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.stats.set(await this.api.get<AdminStats>('/admin/stats'));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar el resumen.'));
    }
  }

  protected cards() {
    const s = this.stats()!;
    return [
      { label: 'Pacientes registrados', value: s.patients, emoji: '🌱', tint: 'bg-leaf-100', link: null },
      { label: 'Activos en las últimas 24 h', value: s.activeLast24h, emoji: '✨', tint: 'bg-lilac-100', link: null },
      { label: 'Psicólogos', value: s.psychologists, emoji: '🩺', tint: 'bg-sky-100', link: '/admin/psicologos' },
      { label: 'Pacientes vinculados', value: s.linkedPatients, emoji: '🔗', tint: 'bg-peach-100', link: null },
      { label: 'Citas próximas', value: s.upcomingAppointments, emoji: '📅', tint: 'bg-rose-100', link: null },
      { label: 'Alertas sin revisar', value: s.pendingRiskEvents, emoji: '🔔', tint: 'bg-danger-100', link: '/admin/alertas' },
    ];
  }
}
