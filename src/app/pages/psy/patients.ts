import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { avatarEmoji, formatDate, formatDateTime } from '../../core/format';
import { PatientSummary, PsyProfile } from '../../core/types';
import { Icon } from '../../shared/icon';
import { Empty, ErrorBanner, PageHeader, SkeletonCards } from '../../shared/ui';

@Component({
  selector: 'app-patients',
  imports: [RouterLink, PageHeader, SkeletonCards, Empty, ErrorBanner, Icon],
  template: `
    <app-page-header title="Pacientes" subtitle="Personas vinculadas contigo en Florece." />
    <app-error [message]="error()" />

    @if (patients() === null) {
      <app-skeleton-cards [count]="6" />
    } @else {
      @if (profile(); as p) {
        <div class="card mb-6 flex flex-wrap items-center gap-4 bg-leaf-50">
          <span class="text-3xl">🔗</span>
          <p class="flex-1 text-sm text-ink">
            Para vincular a alguien, pídele que abra la app, vaya a <b>Mi psicólogo/a</b> y escriba tu código
            <span class="font-mono font-extrabold text-leaf-700">{{ p.linkCode }}</span>.
          </p>
        </div>
      }

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (p of patients(); track p.patientId) {
          <a [routerLink]="['/pacientes', p.patientId]" class="card flex flex-col gap-4 transition hover:-translate-y-0.5">
            <div class="flex items-center gap-3">
              <span class="flex size-12 items-center justify-center rounded-full bg-leaf-100 text-2xl">{{ emoji(p) }}</span>
              <div class="min-w-0">
                <p class="truncate text-lg font-extrabold">{{ p.displayName }}</p>
                <p class="text-xs text-muted">Vinculado desde {{ date(p.linkedAt) }}</p>
              </div>
              <app-icon name="chevronRight" class="ml-auto text-soft" />
            </div>

            <div>
              <div class="mb-1 flex justify-between text-sm">
                <span class="font-bold">Retos esta semana</span>
                <span class="text-muted">{{ p.weekCompletion.completed }} de {{ p.weekCompletion.expected }}</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-sand">
                <div class="h-full rounded-full bg-leaf-500" [style.width.%]="percent(p)"></div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 text-xs">
              <span class="chip bg-lilac-100 text-lilac-500">{{ p.activeRoutines }} retos activos</span>
              @if (p.nextAppointment) {
                <span class="chip bg-sky-100 text-sky-500 capitalize">📅 {{ dateTime(p.nextAppointment.startsAt) }}</span>
              }
              @if (p.lastActivityAt) {
                <span class="chip bg-sand text-muted">Activo {{ date(p.lastActivityAt) }}</span>
              }
            </div>
          </a>
        } @empty {
          <div class="card md:col-span-2 xl:col-span-3">
            <app-empty
              emoji="🌱"
              title="Aún no tienes pacientes vinculados"
              text="Comparte tu código con tus pacientes. Cuando lo escriban en la app, aparecerán aquí."
            />
          </div>
        }
      </div>
    }
  `,
})
export class Patients implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly patients = signal<PatientSummary[] | null>(null);
  protected readonly profile = signal<PsyProfile | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      const [patients, profile] = await Promise.all([
        this.api.get<PatientSummary[]>('/psy/patients'),
        this.api.get<PsyProfile>('/psy/me'),
      ]);
      this.patients.set(patients);
      this.profile.set(profile);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar tus pacientes.'));
      this.patients.set([]);
    }
  }

  protected emoji(p: PatientSummary) {
    return (p.avatar && avatarEmoji[p.avatar.species]) ?? '🌱';
  }
  protected percent(p: PatientSummary) {
    return p.weekCompletion.expected ? Math.min(100, (p.weekCompletion.completed / p.weekCompletion.expected) * 100) : 0;
  }
  protected date(iso: string) {
    return formatDate(iso);
  }
  protected dateTime(iso: string) {
    return formatDateTime(iso, this.profile()?.timezone);
  }
}
