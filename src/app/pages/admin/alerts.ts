import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { formatDateTime, riskLabels } from '../../core/format';
import { RiskEvent, RiskLevel } from '../../core/types';
import { Empty, ErrorBanner, Modal, PageHeader, SkeletonCards } from '../../shared/ui';

const SOURCES: Record<string, string> = {
  CHAT: 'Chat con IA',
  JOURNAL: 'Diario',
  CHALLENGE: 'Reto del día',
  ROUTINE: 'Reto del psicólogo',
  COMMUNITY: 'Comunidad',
  CALM_BUTTON: 'Necesito calmarme',
};

@Component({
  selector: 'app-admin-alerts',
  imports: [FormsModule, PageHeader, SkeletonCards, ErrorBanner, Empty, Modal],
  template: `
    <app-page-header title="Alertas de riesgo" subtitle="Solo se muestra el nivel y el origen, nunca lo que escribió la persona.">
      <label class="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" class="size-5 accent-leaf-500" [ngModel]="onlyPending()" (ngModelChange)="setPending($event)" />
        Solo sin revisar
      </label>
    </app-page-header>
    <app-error [message]="error()" />

    @if (!list()) {
      <app-skeleton-cards [count]="3" grid="" />
    } @else {
      <div class="space-y-3">
        @for (e of list(); track e.id) {
          <article class="card flex flex-wrap items-center gap-4">
            <span class="chip" [class]="risk(e.level)?.classes ?? 'bg-sand text-muted'">{{ risk(e.level)?.label ?? e.level }}</span>
            <div class="min-w-0 flex-1">
              <p class="font-bold">{{ e.displayName ?? 'Persona' }} @if (e.countryCode) { <span class="text-muted">· {{ e.countryCode }}</span> }</p>
              <p class="text-sm capitalize text-muted">{{ source(e.source) }} · {{ when(e.createdAt) }}</p>
              @if (e.reviewedAt) {
                <p class="mt-1 text-sm text-leaf-700">✓ Revisada {{ when(e.reviewedAt) }}{{ e.notes ? ' — ' + e.notes : '' }}</p>
              }
            </div>
            @if (!e.reviewedAt) {
              <button class="btn-secondary px-4 py-2 text-sm" (click)="reviewing.set(e); notes = ''">Marcar como revisada</button>
            }
          </article>
        } @empty {
          <div class="card"><app-empty emoji="🕊️" title="No hay alertas pendientes" /></div>
        }
      </div>
    }

    @if (reviewing(); as e) {
      <app-modal title="Marcar como revisada" (closed)="reviewing.set(null)">
        <label class="label" for="notes">Notas internas (opcional)</label>
        <textarea id="notes" class="input min-h-24" name="notes" maxlength="500" [(ngModel)]="notes"></textarea>
        <div class="mt-6 flex justify-end gap-2">
          <button class="btn-ghost" (click)="reviewing.set(null)">Cancelar</button>
          <button class="btn-primary" (click)="review(e)">Guardar</button>
        </div>
      </app-modal>
    }
  `,
})
export class AdminAlerts implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly list = signal<RiskEvent[] | null>(null);
  protected readonly onlyPending = signal(true);
  protected readonly reviewing = signal<RiskEvent | null>(null);
  protected readonly error = signal<string | null>(null);
  protected notes = '';

  async ngOnInit() {
    await this.load();
  }

  protected async setPending(value: boolean) {
    this.onlyPending.set(value);
    this.list.set(null);
    await this.load();
  }

  private async load() {
    try {
      this.list.set(await this.api.get<RiskEvent[]>(`/admin/risk-events?pending=${this.onlyPending()}`));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar las alertas.'));
      this.list.set([]);
    }
  }

  protected async review(e: RiskEvent) {
    try {
      await this.api.patch(`/admin/risk-events/${e.id}/review`, { notes: this.notes.trim() || undefined });
      this.reviewing.set(null);
      await this.load();
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  protected risk(level: RiskLevel) {
    return riskLabels[level];
  }
  protected source(s: string) {
    return SOURCES[s] ?? s;
  }
  protected when(iso: string) {
    return formatDateTime(iso);
  }
}
