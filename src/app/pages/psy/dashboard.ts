import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { formatDateTime, riskLabels } from '../../core/format';
import { Appointment, Dashboard, PsyProfile, RiskLevel } from '../../core/types';
import { AppointmentList } from '../../shared/appointment-list';
import { Icon } from '../../shared/icon';
import { ErrorBanner, PageHeader, SkeletonCards, Stat } from '../../shared/ui';

@Component({
  selector: 'app-psy-dashboard',
  imports: [RouterLink, PageHeader, SkeletonCards, ErrorBanner, Icon, AppointmentList, Stat],
  template: `
    <app-page-header [eyebrow]="today()" [title]="greeting() + (profile() ? ', ' + firstName() : '')" subtitle="Así va tu día en Florece." />
    <app-error [message]="error()" />

    @if (!data() || !profile()) {
      <app-skeleton-cards [count]="3" />
      <div class="mt-6"><app-skeleton-cards [count]="2" grid="lg:grid-cols-2" /></div>
    } @else {
      <div class="grid gap-4 md:grid-cols-3">
        <app-stat label="Pacientes vinculados" [value]="data()!.activePatients" emoji="🌿" tint="bg-leaf-100" link="/pacientes" />
        <app-stat label="Citas por confirmar" [value]="data()!.pendingRequests" emoji="📩" tint="bg-peach-100" link="/agenda" />
        <div class="card relative overflow-hidden border-0 bg-gradient-to-br from-leaf-500 to-leaf-900 text-white">
          <div class="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true"></div>
          <p class="text-sm font-bold opacity-90">Tu código para vincular pacientes</p>
          <div class="mt-2 flex items-center justify-between gap-2">
            <p class="whitespace-nowrap font-mono text-xl font-extrabold tracking-wider xl:text-2xl">{{ profile()!.linkCode }}</p>
            <button
              type="button"
              class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              (click)="copyCode()"
              [attr.aria-label]="copied() ? 'Código copiado' : 'Copiar código'"
              [title]="copied() ? 'Copiado' : 'Copiar'"
            >
              <app-icon [name]="copied() ? 'check' : 'copy'" />
            </button>
          </div>
          <p class="mt-2 text-xs opacity-90">Compártelo con tu paciente: lo escribe en la app en «Mi psicólogo/a».</p>
        </div>
      </div>

      @if (data()!.riskAlerts.length > 0) {
        <section class="card mt-6 border-danger-500/30" aria-labelledby="riesgo-titulo">
          <h2 id="riesgo-titulo" class="flex items-center gap-2 text-lg font-extrabold text-danger-500"><app-icon name="bell" /> Señales de riesgo recientes</h2>
          <p class="mb-3 text-sm text-muted">
            Detectadas en respuestas de los últimos 14 días. A la persona ya se le mostraron líneas de ayuda; te sugerimos contactarla.
          </p>
          <ul class="space-y-2">
            @for (alert of data()!.riskAlerts; track $index) {
              <li class="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-danger-100/50 px-4 py-3">
                <a class="font-bold hover:underline" [routerLink]="['/pacientes', alert.patientId]">{{ alert.patientName }}</a>
                <span class="text-sm text-muted">{{ alert.routineTitle }} · {{ when(alert.completedAt) }}</span>
                <span class="chip" [class]="risk(alert.riskLevel)?.classes">{{ risk(alert.riskLevel)?.label }}</span>
              </li>
            }
          </ul>
        </section>
      }

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section class="card">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-lg font-extrabold">Citas de hoy</h2>
            <a routerLink="/agenda" class="link text-sm">Ver agenda</a>
          </div>
          <app-appointment-list
            [appointments]="data()!.today"
            [timezone]="profile()!.timezone"
            [defaultMeetingUrl]="profile()!.defaultMeetingUrl"
            [compact]="true"
            emptyText="No tienes citas hoy."
            (changed)="reload()"
          />
          @if (data()!.upcoming.length > 0) {
            <h3 class="mt-4 text-sm font-bold uppercase tracking-wide text-muted">Próximas</h3>
            <app-appointment-list
              [appointments]="data()!.upcoming"
              [timezone]="profile()!.timezone"
              [defaultMeetingUrl]="profile()!.defaultMeetingUrl"
              (changed)="reload()"
            />
          }
        </section>

        <section class="card">
          <h2 class="mb-2 text-lg font-extrabold">Respuestas recientes</h2>
          <ul class="divide-y divide-line">
            @for (r of data()!.recentResponses; track r.id) {
              <li class="py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <a class="font-bold hover:underline" [routerLink]="['/pacientes', r.patientId]">{{ r.patientName }}</a>
                  <span class="text-sm text-muted">· {{ r.routineTitle }}</span>
                  @if (risk(r.riskLevel); as label) {
                    <span class="chip" [class]="label.classes">{{ label.label }}</span>
                  }
                </div>
                <p class="mt-1 line-clamp-2 text-sm text-ink">{{ r.excerpt }}</p>
              </li>
            } @empty {
              <li class="py-6 text-center text-sm text-muted">Cuando tus pacientes completen sus retos, verás aquí sus respuestas.</li>
            }
          </ul>
        </section>
      </div>
    }
  `,
})
export class PsyDashboard implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly profile = signal<PsyProfile | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal(false);

  ngOnInit() {
    void this.reload();
  }

  async reload(_changed?: Appointment) {
    try {
      const [data, profile] = await Promise.all([this.api.get<Dashboard>('/psy/dashboard'), this.api.get<PsyProfile>('/psy/me')]);
      this.data.set(data);
      this.profile.set(profile);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar tu inicio.'));
    }
  }

  protected today() {
    return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  }
  protected greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  }
  protected firstName() {
    return this.profile()!.fullName.split(' ').slice(0, 2).join(' ');
  }
  protected risk(level: RiskLevel | null) {
    return level ? riskLabels[level] : null;
  }
  protected when(iso: string) {
    return formatDateTime(iso, this.profile()?.timezone);
  }
  protected async copyCode() {
    await navigator.clipboard.writeText(this.profile()!.linkCode);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
