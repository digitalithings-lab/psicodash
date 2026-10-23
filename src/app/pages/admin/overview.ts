import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { AdminStats } from '../../core/types';
import { ErrorBanner, PageHeader, SkeletonCards } from '../../shared/ui';

@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink, PageHeader, SkeletonCards, ErrorBanner],
  template: `
    <app-page-header title="Resumen" subtitle="Cómo va Florece hoy." />
    <app-error [message]="error()" />

    @if (!stats()) {
      <app-skeleton-cards [count]="6" />
    } @else {
      <div class="grid gap-4 md:grid-cols-3">
        @for (card of cards(); track card.label) {
          <a [routerLink]="card.link" class="card flex items-center gap-4 transition hover:-translate-y-0.5" [class.pointer-events-none]="!card.link">
            <span class="flex size-12 items-center justify-center rounded-full text-2xl" [class]="card.tint">{{ card.emoji }}</span>
            <div>
              <p class="text-3xl font-extrabold">{{ card.value }}</p>
              <p class="text-sm text-muted">{{ card.label }}</p>
            </div>
          </a>
        }
      </div>
      @if (stats()!.pendingRiskEvents > 0) {
        <a routerLink="/admin/alertas" class="card mt-6 block border-2 border-danger-100 font-bold text-danger-500 hover:underline">
          Hay {{ stats()!.pendingRiskEvents }} alertas de riesgo sin revisar →
        </a>
      }
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
