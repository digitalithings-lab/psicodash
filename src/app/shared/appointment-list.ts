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

// Lista de citas con sus acciones. Se usa en Inicio, Agenda y la ficha del paciente.
@Component({
  selector: 'app-appointment-list',
  imports: [FormsModule, RouterLink, Icon, Modal, ErrorBanner],
  template: `
    <ul class="divide-y divide-line">
      @for (a of appointments(); track a.id) {
        <li class="flex flex-wrap items-center gap-4 py-4">
          <div class="w-28 shrink-0">
            <p class="text-lg font-extrabold">{{ time(a.startsAt) }}</p>
            <p class="text-xs capitalize text-muted">{{ compact() ? '' : dateTime(a.startsAt) }}</p>
          </div>
          <div class="min-w-0 flex-1">
            @if (showPatient()) {
              <a class="font-bold hover:underline" [routerLink]="['/pacientes', a.patientId]">{{ a.patientName ?? 'Paciente' }}</a>
            }
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span class="chip" [class]="status(a).classes">{{ status(a).label }}</span>
              @if (a.meetingUrl) {
                <a class="chip bg-sky-100 text-sky-500 hover:underline" [href]="a.meetingUrl" target="_blank" rel="noopener">
                  <app-icon name="video" size="sm" /> Videollamada
                </a>
              }
            </div>
            @if (a.note) {
              <p class="mt-2 text-sm text-muted">“{{ a.note }}”</p>
            }
            @if (a.cancelReason && a.status === 'CANCELLED') {
              <p class="mt-1 text-xs text-muted">{{ a.cancelReason }}</p>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            @if (a.status === 'REQUESTED') {
              <button class="btn-primary px-4 py-2 text-sm" (click)="open(a, 'confirm')">Confirmar</button>
            }
            @if (a.status === 'CONFIRMED' && started(a)) {
              <button class="btn-secondary px-4 py-2 text-sm" (click)="act(a, 'complete')">Completada</button>
              <button class="btn-ghost px-4 py-2 text-sm" (click)="act(a, 'no_show')">No asistió</button>
            }
            @if (a.status === 'CONFIRMED' && !started(a)) {
              <button class="btn-ghost px-4 py-2 text-sm" (click)="open(a, 'update')">Enlace</button>
            }
            @if ((a.status === 'REQUESTED' || a.status === 'CONFIRMED') && !started(a)) {
              <button class="btn-ghost px-4 py-2 text-sm text-danger-500" (click)="open(a, 'cancel')">Cancelar</button>
            }
          </div>
        </li>
      } @empty {
        <li class="py-6 text-center text-sm text-muted">{{ emptyText() }}</li>
      }
    </ul>

    @if (editing(); as e) {
      <app-modal
        [title]="e.action === 'confirm' ? 'Confirmar cita' : e.action === 'cancel' ? 'Cancelar cita' : 'Enlace de videollamada'"
        (closed)="editing.set(null)"
      >
        <p class="mb-4 text-sm capitalize text-muted">{{ dateTime(e.appointment.startsAt) }} · {{ e.appointment.patientName }}</p>
        @if (e.action === 'cancel') {
          <label class="label" for="reason">Motivo (lo verá tu paciente)</label>
          <textarea id="reason" class="input min-h-24" name="reason" [(ngModel)]="reason"></textarea>
        } @else {
          <label class="label" for="url">Enlace de videollamada</label>
          <input id="url" class="input" name="url" placeholder="https://meet.google.com/…" [(ngModel)]="meetingUrl" />
          <p class="mt-1 text-xs text-muted">Tu paciente lo verá en la app al confirmar la cita.</p>
        }
        <div class="mt-4"><app-error [message]="error()" /></div>
        <div class="mt-6 flex justify-end gap-2">
          <button class="btn-ghost" (click)="editing.set(null)">Volver</button>
          <button
            [class]="e.action === 'cancel' ? 'btn-danger' : 'btn-primary'"
            [disabled]="busy()"
            (click)="act(e.appointment, e.action)"
          >
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
  protected meetingUrl = '';
  protected reason = '';

  protected time(iso: string) {
    return formatTime(iso, this.timezone());
  }
  protected dateTime(iso: string) {
    return formatDateTime(iso, this.timezone());
  }
  protected status(a: Appointment) {
    return statusLabels[a.status];
  }
  protected started(a: Appointment) {
    return new Date(a.startsAt).getTime() <= Date.now();
  }

  protected open(appointment: Appointment, action: Action) {
    this.meetingUrl = appointment.meetingUrl ?? this.defaultMeetingUrl() ?? '';
    this.reason = '';
    this.error.set(null);
    this.editing.set({ appointment, action });
  }

  protected async act(appointment: Appointment, action: Action) {
    this.busy.set(true);
    this.error.set(null);
    try {
      const updated = await this.api.patch<Appointment>(`/psy/appointments/${appointment.id}`, {
        action,
        meetingUrl: action === 'confirm' || action === 'update' ? this.meetingUrl.trim() : undefined,
        cancelReason: action === 'cancel' ? this.reason.trim() || undefined : undefined,
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
