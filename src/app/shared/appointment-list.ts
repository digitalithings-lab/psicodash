import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { formatDateTime, formatTime, statusLabels } from '../core/format';
import { Appointment } from '../core/types';
import { Icon } from './icon';
import { ErrorBanner, Modal } from './ui';

type Action = 'confirm' | 'cancel' | 'complete' | 'no_show' | 'update';

const MIN_REASON = 5;
const MAX_REASON = 300;
const QUICK_REASONS = ['Tuve un imprevisto y no podré atenderte.', 'Por motivos de salud no podré atenderte.', 'Necesito reprogramar esta cita.'];

// Lista de citas con sus acciones. Se usa en Inicio, Agenda y la ficha del paciente.
@Component({
  selector: 'app-appointment-list',
  imports: [FormsModule, RouterLink, Icon, Modal, ErrorBanner],
  template: `
    <ul class="divide-y divide-line">
      @for (a of appointments(); track a.id) {
        <li class="py-4 first:pt-2 last:pb-2">
          <div class="flex flex-wrap items-start gap-x-4 gap-y-3">
            <div class="w-24 shrink-0">
              <p class="text-lg font-extrabold tabular-nums leading-tight">{{ time(a.startsAt) }}</p>
              @if (!compact()) {
                <p class="text-xs capitalize text-muted">{{ dateTime(a.startsAt) }}</p>
              }
            </div>

            <div class="min-w-0 flex-1">
              @if (showPatient()) {
                @if (a.patientId) {
                  <a class="font-bold hover:underline" [routerLink]="['/pacientes', a.patientId]">
                    {{ a.patient?.fullName ?? a.patientName ?? 'Paciente' }}
                  </a>
                } @else {
                  <span class="font-bold">{{ a.patient?.fullName ?? a.patientName ?? 'Paciente' }}</span>
                }
              }
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span class="chip" [class]="status(a).classes">{{ status(a).label }}</span>
                @if (a.source === 'WEB') {
                  <span class="chip bg-lilac-100 text-lilac-500" title="Pedida desde tu sitio web, sin cuenta en la app">
                    <app-icon name="link" size="sm" /> Desde la web
                  </span>
                }
                @if (a.meetingUrl && a.status === 'CONFIRMED') {
                  <a class="chip bg-sky-100 text-sky-500 hover:underline" [href]="a.meetingUrl" target="_blank" rel="noopener">
                    <app-icon name="video" size="sm" /> Videollamada
                  </a>
                }
              </div>

              @if (a.status === 'CANCELLED' && a.cancelReason) {
                <p class="mt-2 text-sm text-muted">
                  <span class="font-bold">{{ a.cancelledBy === 'PSYCHOLOGIST' ? 'Cancelaste:' : 'Canceló el paciente:' }}</span>
                  {{ a.cancelReason }}
                </p>
              }
            </div>

            <div class="flex flex-wrap gap-2">
              @if (a.status === 'REQUESTED') {
                <button type="button" class="btn-primary min-h-9 px-4 py-2" (click)="open(a, 'confirm')">Confirmar</button>
              }
              @if (a.status === 'CONFIRMED' && started(a)) {
                <button type="button" class="btn-secondary min-h-9 px-4 py-2" (click)="act(a, 'complete')">Completada</button>
                <button type="button" class="btn-ghost min-h-9 px-4 py-2" (click)="act(a, 'no_show')">No asistió</button>
              }
              @if (a.status === 'CONFIRMED' && !started(a)) {
                <button type="button" class="btn-ghost min-h-9 px-4 py-2" (click)="open(a, 'update')">Enlace</button>
              }
              @if ((a.status === 'REQUESTED' || a.status === 'CONFIRMED') && !started(a)) {
                <button type="button" class="btn-ghost min-h-9 px-4 py-2 !text-danger-500 hover:!bg-danger-100" (click)="open(a, 'cancel')">
                  Cancelar
                </button>
              }
            </div>
          </div>

          @if (a.patient || a.note) {
            <div class="mt-3 sm:ml-28">
              <button
                type="button"
                class="inline-flex cursor-pointer items-center gap-1 rounded-lg text-xs font-bold text-leaf-700"
                [attr.aria-expanded]="isOpen(a)"
                [attr.aria-controls]="'datos-' + a.id"
                (click)="toggle(a)"
              >
                <app-icon [name]="isOpen(a) ? 'chevronUp' : 'chevronDown'" size="sm" />
                {{ isOpen(a) ? 'Ocultar datos de la cita' : 'Ver datos de la cita' }}
              </button>

              @if (isOpen(a)) {
                <div [id]="'datos-' + a.id" class="mt-2 animate-fade-in rounded-2xl border border-line bg-background p-4">
                  @if (a.patient; as p) {
                    <dl class="grid gap-3 text-sm sm:grid-cols-3">
                      @if (p.phone || p.email) {
                        <div class="sm:col-span-3 flex flex-wrap gap-2">
                          @if (p.phone) {
                            <a class="chip bg-leaf-100 text-leaf-700 hover:underline" [href]="'tel:' + p.phone"><app-icon name="phone" size="sm" /> {{ p.phone }}</a>
                          }
                          @if (p.email) {
                            <a class="chip bg-sky-100 text-sky-500 hover:underline" [href]="'mailto:' + p.email">{{ p.email }}</a>
                          }
                        </div>
                      }
                      <div>
                        <dt class="eyebrow">Nombre completo</dt>
                        <dd class="mt-0.5 font-bold">{{ p.fullName }}</dd>
                      </div>
                      <div>
                        <dt class="eyebrow">Cédula</dt>
                        <dd class="mt-0.5 font-mono font-bold tracking-wide">{{ p.idNumber ?? '—' }}</dd>
                      </div>
                      <div>
                        <dt class="eyebrow">Fecha de nacimiento</dt>
                        <dd class="mt-0.5 font-bold">
                          {{ p.birthDate ? birth(p.birthDate) : '—' }}
                          @if (p.age !== null) {
                            <span class="font-semibold text-muted">· {{ p.age }} años</span>
                          }
                        </dd>
                      </div>
                    </dl>
                  }
                  @if (a.note) {
                    <div class="border-line" [class]="a.patient ? 'mt-4 border-t pt-4' : ''">
                      <p class="eyebrow">Motivo de la cita</p>
                      <p class="mt-1 whitespace-pre-line text-sm text-ink">{{ a.note }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </li>
      } @empty {
        <li class="py-8 text-center text-sm text-muted">{{ emptyText() }}</li>
      }
    </ul>

    @if (editing(); as e) {
      <app-modal
        [title]="e.action === 'confirm' ? 'Confirmar cita' : e.action === 'cancel' ? 'Cancelar cita' : 'Enlace de videollamada'"
        (closed)="editing.set(null)"
      >
        <p class="mb-5 rounded-2xl bg-sand px-4 py-3 text-sm">
          <span class="font-bold">{{ e.appointment.patient?.fullName ?? e.appointment.patientName ?? 'Paciente' }}</span>
          <span class="capitalize text-muted"> · {{ dateTime(e.appointment.startsAt) }}</span>
        </p>

        @if (e.action === 'cancel') {
          <label class="label" for="reason">Motivo de la cancelación</label>
          <textarea
            id="reason"
            class="input min-h-28 resize-y"
            name="reason"
            [maxlength]="maxReason"
            placeholder="Explícale a tu paciente por qué cancelas…"
            aria-describedby="reason-hint"
            [attr.aria-invalid]="showReasonError() || null"
            [(ngModel)]="reason"
            (ngModelChange)="reasonTouched.set(true)"
          ></textarea>
          <div id="reason-hint" class="hint flex justify-between gap-3">
            <span [class.text-danger-500]="showReasonError()">
              {{ showReasonError() ? 'Escribe al menos ' + minReason + ' caracteres.' : 'Tu paciente verá este motivo en la app.' }}
            </span>
            <span class="tabular-nums">{{ reason.length }}/{{ maxReason }}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2" aria-label="Motivos frecuentes">
            @for (quick of quickReasons; track quick) {
              <button
                type="button"
                class="chip cursor-pointer border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink"
                (click)="useQuick(quick)"
              >
                {{ quick }}
              </button>
            }
          </div>
        } @else {
          <label class="label" for="url">Enlace de videollamada</label>
          <input id="url" class="input" name="url" placeholder="https://meet.google.com/…" [(ngModel)]="meetingUrl" />
          <p class="hint">Tu paciente lo verá en la app al confirmar la cita.</p>
        }

        <div class="mt-4"><app-error [message]="error()" /></div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn-ghost" (click)="editing.set(null)">Volver</button>
          <button
            type="button"
            [class]="e.action === 'cancel' ? 'btn-danger' : 'btn-primary'"
            [disabled]="busy() || (e.action === 'cancel' && !reasonValid())"
            [attr.aria-busy]="busy()"
            (click)="act(e.appointment, e.action)"
          >
            @if (busy()) {
              <span class="spinner" aria-hidden="true"></span>
            }
            {{ e.action === 'confirm' ? 'Confirmar' : e.action === 'cancel' ? 'Cancelar cita' : 'Guardar' }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class AppointmentList {
  private readonly api = inject(ApiService);

  readonly appointments = input.required<Appointment[]>();
  readonly timezone = input<string>();
  readonly showPatient = input(true);
  readonly compact = input(false);
  readonly defaultMeetingUrl = input<string | null>(null);
  readonly emptyText = input('No hay citas.');
  readonly changed = output<Appointment>();

  protected readonly editing = signal<{ appointment: Appointment; action: Action } | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly reasonTouched = signal(false);
  // Las solicitudes nuevas muestran sus datos abiertos; el resto, al tocar.
  private readonly toggled = signal<Record<string, boolean>>({});
  protected meetingUrl = '';
  protected reason = '';
  protected readonly minReason = MIN_REASON;
  protected readonly maxReason = MAX_REASON;
  protected readonly quickReasons = QUICK_REASONS;

  // Métodos (no computed): reason es una propiedad normal enlazada con ngModel.
  protected reasonValid() {
    return this.reason.trim().length >= MIN_REASON;
  }
  protected showReasonError() {
    return this.reasonTouched() && this.reason.length > 0 && !this.reasonValid();
  }

  protected time(iso: string) {
    return formatTime(iso, this.timezone());
  }
  protected dateTime(iso: string) {
    return formatDateTime(iso, this.timezone());
  }
  // La fecha de nacimiento es un día, sin hora: se muestra tal cual, sin zona horaria.
  protected birth(date: string) {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  }
  protected status(a: Appointment) {
    return statusLabels[a.status];
  }
  protected started(a: Appointment) {
    return new Date(a.startsAt).getTime() <= Date.now();
  }
  protected isOpen(a: Appointment) {
    return this.toggled()[a.id] ?? (!this.compact() && a.status === 'REQUESTED');
  }
  protected toggle(a: Appointment) {
    this.toggled.update((current) => ({ ...current, [a.id]: !this.isOpen(a) }));
  }

  protected open(appointment: Appointment, action: Action) {
    this.meetingUrl = appointment.meetingUrl ?? this.defaultMeetingUrl() ?? '';
    this.reason = '';
    this.reasonTouched.set(false);
    this.error.set(null);
    this.editing.set({ appointment, action });
  }

  protected useQuick(text: string) {
    this.reason = text;
    this.reasonTouched.set(true);
  }

  protected async act(appointment: Appointment, action: Action) {
    if (action === 'cancel' && this.reason.trim().length < MIN_REASON) {
      this.reasonTouched.set(true);
      this.error.set(`Escribe el motivo de la cancelación (al menos ${MIN_REASON} caracteres).`);
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const updated = await this.api.patch<Appointment>(`/psy/appointments/${appointment.id}`, {
        action,
        meetingUrl: action === 'confirm' || action === 'update' ? this.meetingUrl.trim() : undefined,
        cancelReason: action === 'cancel' ? this.reason.trim() : undefined,
      });
      this.editing.set(null);
      this.changed.emit(updated);
    } catch (err) {
      this.error.set(errorMessage(err));
      if (!this.editing()) alert(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
