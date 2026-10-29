import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { formatDateTime, minutesToTime, timeToMinutes, WEEK_ORDER, WEEKDAYS } from '../../core/format';
import { Appointment, Availability, PsyProfile } from '../../core/types';
import { AppointmentList } from '../../shared/appointment-list';
import { Icon } from '../../shared/icon';
import { ErrorBanner, PageHeader, SkeletonCards } from '../../shared/ui';

type Section = 'citas' | 'horario' | 'bloqueos';
interface Range {
  start: string;
  end: string;
}

@Component({
  selector: 'app-agenda',
  imports: [FormsModule, PageHeader, SkeletonCards, ErrorBanner, AppointmentList, Icon],
  template: `
    <app-page-header title="Agenda" [subtitle]="profile() ? 'Horarios en tu zona: ' + profile()!.timezone : ''" />
    <app-error [message]="error()" />

    <div class="mb-6 flex gap-1 rounded-full bg-sand p-1" role="tablist">
      @for (s of sections; track s.id) {
        <button
          role="tab"
          class="flex-1 rounded-full px-4 py-2.5 font-bold transition"
          [class]="section() === s.id ? 'bg-surface text-leaf-700 shadow-soft' : 'text-muted'"
          [attr.aria-selected]="section() === s.id"
          (click)="section.set(s.id)"
        >
          {{ s.label }}
          @if (s.id === 'citas' && requested().length > 0) {
            <span class="ml-1 rounded-full bg-peach-500 px-2 text-xs text-white">{{ requested().length }}</span>
          }
        </button>
      }
    </div>

    @if (!appointments() || !availability()) {
      <app-skeleton-cards [count]="2" grid="lg:grid-cols-2" />
    } @else {
      @switch (section()) {
        @case ('citas') {
          <div class="space-y-6">
            <section class="card">
              <h2 class="text-lg font-extrabold">Por confirmar</h2>
              <app-appointment-list
                [appointments]="requested()"
                [timezone]="profile()?.timezone"
                [defaultMeetingUrl]="profile()?.defaultMeetingUrl ?? null"
                emptyText="No hay solicitudes pendientes."
                (changed)="loadAppointments()"
              />
            </section>
            <section class="card">
              <h2 class="text-lg font-extrabold">Próximas citas</h2>
              <app-appointment-list
                [appointments]="confirmed()"
                [timezone]="profile()?.timezone"
                [defaultMeetingUrl]="profile()?.defaultMeetingUrl ?? null"
                emptyText="No tienes citas confirmadas próximamente."
                (changed)="loadAppointments()"
              />
            </section>
            <section class="card">
              <h2 class="text-lg font-extrabold">Historial (últimos 30 días)</h2>
              <app-appointment-list
                [appointments]="history()"
                [timezone]="profile()?.timezone"
                emptyText="Aún no hay citas pasadas."
                (changed)="loadAppointments()"
              />
            </section>
          </div>
        }

        @case ('horario') {
          <section class="card">
            <p class="mb-4 text-sm text-muted">
              Tus pacientes solo podrán pedir citas dentro de estos horarios. Cada sesión dura {{ availability()!.sessionMinutes }} minutos,
              con 10 minutos de descanso entre una y otra. Puedes cambiar la duración en tu perfil.
            </p>
            <div class="divide-y divide-line">
              @for (day of weekOrder; track day) {
                <div class="flex flex-wrap items-start gap-4 py-4">
                  <p class="w-28 pt-2 font-bold">{{ dayName(day) }}</p>
                  <div class="flex flex-1 flex-col gap-2">
                    @for (range of week()[day]; track $index) {
                      <div class="flex flex-wrap items-center gap-2">
                        <input class="input w-32" type="time" [(ngModel)]="range.start" [name]="'s' + day + $index" />
                        <span class="text-muted">a</span>
                        <input class="input w-32" type="time" [(ngModel)]="range.end" [name]="'e' + day + $index" />
                        <button class="rounded-full p-2 text-muted hover:bg-sand" (click)="removeRange(day, $index)" aria-label="Quitar horario">
                          <app-icon name="x" size="sm" />
                        </button>
                      </div>
                    } @empty {
                      <p class="pt-2 text-sm text-soft">No atiendes este día.</p>
                    }
                  </div>
                  <button class="btn-ghost px-3 py-2 text-sm" (click)="addRange(day)"><app-icon name="plus" size="sm" /> Horario</button>
                </div>
              }
            </div>
            <div class="mt-4 flex items-center justify-end gap-3">
              @if (savedRules()) {
                <span class="text-sm font-bold text-leaf-700">✓ Horario guardado</span>
              }
              <button class="btn-primary" [disabled]="saving()" (click)="saveRules()">{{ saving() ? 'Guardando…' : 'Guardar horario' }}</button>
            </div>
          </section>
        }

        @case ('bloqueos') {
          <div class="grid gap-6 lg:grid-cols-2">
            <section class="card space-y-4">
              <h2 class="text-lg font-extrabold">Bloquear días u horas</h2>
              <p class="text-sm text-muted">Durante un bloqueo nadie podrá pedirte cita. Las citas ya agendadas no se cancelan solas.</p>
              <div>
                <label class="label" for="bs">Desde</label>
                <input id="bs" class="input" type="datetime-local" name="bs" [(ngModel)]="blockStart" />
              </div>
              <div>
                <label class="label" for="be">Hasta</label>
                <input id="be" class="input" type="datetime-local" name="be" [(ngModel)]="blockEnd" />
              </div>
              <div>
                <label class="label" for="br">Motivo (solo lo ves tú)</label>
                <input id="br" class="input" name="br" placeholder="Vacaciones" [(ngModel)]="blockReason" />
              </div>
              <button class="btn-primary" [disabled]="saving()" (click)="addBlock()">Bloquear</button>
            </section>
            <section class="card">
              <h2 class="mb-2 text-lg font-extrabold">Bloqueos activos</h2>
              <ul class="divide-y divide-line">
                @for (b of availability()!.blocks; track b.id) {
                  <li class="flex items-center gap-3 py-3">
                    <div class="flex-1">
                      <p class="font-bold">{{ b.reason || 'Sin motivo' }}</p>
                      <p class="text-sm capitalize text-muted">{{ when(b.startsAt) }} → {{ when(b.endsAt) }}</p>
                    </div>
                    <button class="rounded-full p-2 text-muted hover:bg-sand" (click)="removeBlock(b.id)" aria-label="Quitar bloqueo">
                      <app-icon name="trash" size="sm" />
                    </button>
                  </li>
                } @empty {
                  <li class="py-6 text-center text-sm text-muted">No tienes bloqueos.</li>
                }
              </ul>
            </section>
          </div>
        }
      }
    }
  `,
})
export class Agenda implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly sections: { id: Section; label: string }[] = [
    { id: 'citas', label: 'Citas' },
    { id: 'horario', label: 'Horario semanal' },
    { id: 'bloqueos', label: 'Bloqueos' },
  ];
  protected readonly weekOrder = WEEK_ORDER;
  protected readonly section = signal<Section>('citas');
  protected readonly profile = signal<PsyProfile | null>(null);
  protected readonly appointments = signal<Appointment[] | null>(null);
  protected readonly availability = signal<Availability | null>(null);
  protected readonly week = signal<Record<number, Range[]>>({});
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly savedRules = signal(false);
  protected blockStart = '';
  protected blockEnd = '';
  protected blockReason = '';

  protected readonly requested = computed(() =>
    (this.appointments() ?? []).filter((a) => a.status === 'REQUESTED' && new Date(a.startsAt) > new Date()),
  );
  protected readonly confirmed = computed(() =>
    (this.appointments() ?? []).filter((a) => a.status === 'CONFIRMED' && new Date(a.endsAt) > new Date()),
  );
  protected readonly history = computed(() =>
    (this.appointments() ?? [])
      .filter((a) => new Date(a.endsAt) <= new Date() || !['REQUESTED', 'CONFIRMED'].includes(a.status))
      .reverse(),
  );

  async ngOnInit() {
    this.api.get<PsyProfile>('/psy/me').then((p) => this.profile.set(p)).catch(() => undefined);
    await Promise.all([this.loadAppointments(), this.loadAvailability()]);
  }

  async loadAppointments() {
    const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
    try {
      this.appointments.set(await this.api.get<Appointment[]>(`/psy/appointments?from=${encodeURIComponent(from)}`));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar tus citas.'));
      this.appointments.set([]);
    }
  }

  async loadAvailability() {
    try {
      this.setAvailability(await this.api.get<Availability>('/psy/availability'));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar tu horario.'));
    }
  }

  protected dayName(day: number) {
    return WEEKDAYS[day];
  }
  protected when(iso: string) {
    return formatDateTime(iso, this.profile()?.timezone);
  }

  protected addRange(day: number) {
    this.week.update((w) => ({ ...w, [day]: [...(w[day] ?? []), { start: '09:00', end: '13:00' }] }));
  }
  protected removeRange(day: number, index: number) {
    this.week.update((w) => ({ ...w, [day]: w[day].filter((_, i) => i !== index) }));
  }

  protected async saveRules() {
    this.error.set(null);
    const rules = Object.entries(this.week()).flatMap(([day, ranges]) =>
      ranges.map((r) => ({
        weekday: Number(day),
        startMinute: timeToMinutes(r.start),
        endMinute: r.end === '00:00' ? 1440 : timeToMinutes(r.end),
      })),
    );
    if (rules.some((r) => Number.isNaN(r.startMinute) || Number.isNaN(r.endMinute))) {
      this.error.set('Revisa los horarios: hay alguno incompleto.');
      return;
    }
    this.saving.set(true);
    try {
      this.setAvailability(await this.api.put<Availability>('/psy/availability/rules', { rules }));
      this.savedRules.set(true);
      setTimeout(() => this.savedRules.set(false), 2500);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos guardar tu horario.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async addBlock() {
    this.error.set(null);
    if (!this.blockStart || !this.blockEnd) {
      this.error.set('Elige desde cuándo y hasta cuándo.');
      return;
    }
    this.saving.set(true);
    try {
      this.setAvailability(
        await this.api.post<Availability>('/psy/availability/blocks', {
          startsAt: new Date(this.blockStart).toISOString(),
          endsAt: new Date(this.blockEnd).toISOString(),
          reason: this.blockReason.trim() || undefined,
        }),
      );
      this.blockStart = this.blockEnd = this.blockReason = '';
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos guardar el bloqueo.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeBlock(id: string) {
    try {
      this.setAvailability(await this.api.delete<Availability>(`/psy/availability/blocks/${id}`));
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  private setAvailability(availability: Availability) {
    this.availability.set(availability);
    const week: Record<number, Range[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const rule of availability.rules) {
      week[rule.weekday].push({ start: minutesToTime(rule.startMinute), end: minutesToTime(rule.endMinute % 1440) });
    }
    this.week.set(week);
  }
}
