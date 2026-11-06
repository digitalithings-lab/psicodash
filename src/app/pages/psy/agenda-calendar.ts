import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { formatTime, statusLabels } from '../../core/format';
import { Appointment } from '../../core/types';
import { AppointmentList } from '../../shared/appointment-list';
import { Icon } from '../../shared/icon';
import { ErrorBanner, Modal } from '../../shared/ui';

interface Cell {
  key: string; // «AAAA-MM-DD» en la zona de la psicóloga
  day: number;
  inMonth: boolean;
}
interface FreeDay {
  date: string;
  slots: { startsAt: string; endsAt: string }[];
}

const WEEK_HEAD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_MS = 86_400_000;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Calendario mensual de la agenda: puntito en los días con citas; al tocar un día salen sus citas y sus horas libres.
@Component({
  selector: 'app-agenda-calendar',
  imports: [Icon, Modal, AppointmentList, ErrorBanner],
  template: `
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <!-- Mes -->
      <section class="card !p-4 sm:!p-6" aria-label="Calendario">
        <div class="mb-4 flex items-center justify-between gap-2">
          <h2 class="text-lg font-extrabold sm:text-xl" aria-live="polite">{{ monthTitle() }}</h2>
          <div class="flex items-center gap-1">
            <button type="button" class="btn-ghost min-h-11 px-3 py-2 text-sm" (click)="goToday()">Hoy</button>
            <button type="button" class="btn-icon" (click)="shiftMonth(-1)" aria-label="Mes anterior"><app-icon name="chevronLeft" /></button>
            <button type="button" class="btn-icon" (click)="shiftMonth(1)" aria-label="Mes siguiente"><app-icon name="chevronRight" /></button>
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center" role="grid">
          @for (d of weekHead; track d) {
            <div class="pb-2 text-xs font-bold text-muted" role="columnheader">{{ d }}</div>
          }
          @for (cell of cells(); track cell.key) {
            <button
              type="button"
              role="gridcell"
              class="relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] py-1.5 text-sm font-bold transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.96] sm:min-h-[4.25rem] sm:text-base"
              [class]="cellClass(cell)"
              [attr.aria-selected]="selected() === cell.key"
              [attr.aria-label]="cellLabel(cell)"
              [attr.aria-current]="cell.key === today() ? 'date' : null"
              (click)="select(cell.key)"
            >
              <span class="tabular-nums leading-none">{{ cell.day }}</span>
              <span class="flex h-2 items-center gap-1" aria-hidden="true">
                @if (dots()[cell.key]?.confirmed) {
                  <span class="size-1.5 rounded-full" [class]="selected() === cell.key ? 'bg-white' : 'bg-leaf-500'"></span>
                }
                @if (dots()[cell.key]?.requested) {
                  <span class="size-1.5 rounded-full" [class]="selected() === cell.key ? 'bg-peach-100' : 'bg-peach-500'"></span>
                }
              </span>
            </button>
          }
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-leaf-500"></span> Con citas</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-peach-500"></span> Por confirmar</span>
          @if (loading()) {
            <span class="ml-auto">Actualizando…</span>
          }
        </div>
      </section>

      <!-- Día elegido -->
      <section #panel class="card scroll-mt-20 !p-4 sm:!p-6 lg:sticky lg:top-6" aria-live="polite" [attr.aria-label]="'Citas del ' + selectedTitle()">
        <h2 class="text-lg font-extrabold">{{ selectedTitle() }}</h2>
        <p class="mt-0.5 text-sm text-muted">{{ summary() }}</p>
        <div class="mt-3"><app-error [message]="error()" /></div>

        <h3 class="eyebrow mt-5 mb-2">Citas</h3>
        <ul class="space-y-2">
          @for (a of dayAppointments(); track a.id) {
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-2xl border border-line bg-background p-3 text-left transition-[border-color,background-color,transform] duration-150 ease-out hover:border-line-strong active:scale-[0.99]"
                (click)="detail.set(a)"
              >
                <span class="w-[5.5rem] shrink-0 text-sm font-extrabold leading-tight tabular-nums">
                  {{ time(a.startsAt) }}
                  <span class="block text-xs font-semibold text-muted">{{ time(a.endsAt) }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-bold">{{ a.patient?.fullName ?? a.patientName ?? 'Paciente' }}</span>
                  <span class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span class="chip" [class]="status(a).classes">{{ status(a).label }}</span>
                    <span class="inline-flex items-center gap-1 text-xs text-muted">
                      <app-icon [name]="a.modality === 'IN_PERSON' ? 'mapPin' : 'video'" size="sm" />
                      {{ a.modality === 'IN_PERSON' ? 'Presencial' : 'Virtual' }}
                    </span>
                  </span>
                </span>
                <app-icon name="chevronRight" size="sm" class="text-soft" />
              </button>
            </li>
          } @empty {
            <li class="rounded-2xl bg-sand px-4 py-5 text-center text-sm text-muted">No hay citas este día.</li>
          }
        </ul>

        <h3 class="eyebrow mt-6 mb-2">Horas libres</h3>
        @if (daySlots().length > 0) {
          <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            @for (s of daySlots(); track s.startsAt) {
              <li class="rounded-xl border border-dashed border-leaf-500/40 bg-leaf-50 px-3 py-2 text-center text-sm font-bold tabular-nums text-leaf-700">
                {{ time(s.startsAt) }}
              </li>
            }
          </ul>
        } @else {
          <p class="rounded-2xl bg-sand px-4 py-5 text-center text-sm text-muted">{{ noSlotsText() }}</p>
        }
      </section>
    </div>

    @if (detail(); as a) {
      <app-modal title="Detalle de la cita" (closed)="detail.set(null)">
        <app-appointment-list
          [appointments]="[a]"
          [timezone]="timezone()"
          [defaultMeetingUrl]="defaultMeetingUrl()"
          [expanded]="true"
          (changed)="onChanged()"
        />
      </app-modal>
    }
  `,
})
export class AgendaCalendar {
  private readonly api = inject(ApiService);

  readonly timezone = input.required<string>();
  readonly defaultMeetingUrl = input<string | null>(null);
  readonly changed = output<void>();

  protected readonly weekHead = WEEK_HEAD;
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly today = computed(() => this.keyOf(new Date()));
  /** Primer día del mes que se ve, «AAAA-MM-01». */
  protected readonly month = signal('');
  protected readonly selected = signal('');
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly free = signal<FreeDay[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly detail = signal<Appointment | null>(null);

  protected readonly cells = computed<Cell[]>(() => {
    const [y, m] = this.month().split('-').map(Number);
    if (!y) return [];
    const first = Date.UTC(y, m - 1, 1);
    const offset = (new Date(first).getUTCDay() + 6) % 7; // semana desde el lunes
    const start = first - offset * DAY_MS;
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start + i * DAY_MS);
      return { key: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m - 1 };
    });
  });

  protected readonly monthTitle = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return y ? cap(new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)))) : '';
  });

  protected readonly selectedTitle = computed(() =>
    this.selected()
      ? cap(new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${this.selected()}T12:00:00Z`)))
      : '',
  );

  /** Por día: si tiene citas confirmadas (o ya atendidas) y/o por confirmar. Las canceladas no cuentan. */
  protected readonly dots = computed(() => {
    const map: Record<string, { confirmed: boolean; requested: boolean }> = {};
    for (const a of this.appointments()) {
      if (a.status === 'CANCELLED') continue;
      const key = this.keyOf(new Date(a.startsAt));
      const entry = (map[key] ??= { confirmed: false, requested: false });
      if (a.status === 'REQUESTED' || a.status === 'PENDING_PAYMENT') entry.requested = true;
      else entry.confirmed = true;
    }
    return map;
  });

  protected readonly dayAppointments = computed(() =>
    this.appointments().filter((a) => a.status !== 'CANCELLED' && this.keyOf(new Date(a.startsAt)) === this.selected()),
  );
  protected readonly daySlots = computed(() => this.free().find((d) => d.date === this.selected())?.slots ?? []);

  protected readonly summary = computed(() => {
    const n = this.dayAppointments().length;
    const f = this.daySlots().length;
    return `${n === 0 ? 'Sin citas' : n === 1 ? '1 cita' : n + ' citas'} · ${f === 0 ? 'sin horas libres' : f === 1 ? '1 hora libre' : f + ' horas libres'}`;
  });

  constructor() {
    // Al cambiar el mes o la zona horaria se vuelven a pedir citas y horas libres.
    effect(() => {
      const tz = this.timezone();
      if (!tz) return;
      if (!this.month()) {
        const today = this.keyOf(new Date());
        this.month.set(`${today.slice(0, 7)}-01`);
        this.selected.set(today);
      }
    });
    effect(() => {
      const month = this.month();
      if (month) void this.load();
    });
  }

  protected goToday() {
    const today = this.today();
    this.month.set(`${today.slice(0, 7)}-01`);
    this.selected.set(today);
  }

  protected shiftMonth(delta: number) {
    const [y, m] = this.month().split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.month.set(next.toISOString().slice(0, 10));
    // Mantiene el día elegido dentro del mes que se ve.
    this.selected.set(this.today().startsWith(this.month().slice(0, 7)) ? this.today() : this.month());
  }

  protected select(key: string) {
    this.selected.set(key);
    if (!key.startsWith(this.month().slice(0, 7))) this.month.set(`${key.slice(0, 7)}-01`);
    // En pantallas estrechas el detalle del día queda debajo del calendario: se lleva a la vista.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setTimeout(() => this.panel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  /** Vuelve a pedir citas y horas libres (p. ej., tras confirmar una cita fuera del calendario). */
  refresh() {
    void this.load();
  }

  protected onChanged() {
    this.detail.set(null);
    void this.load();
    this.changed.emit();
  }

  protected cellClass(cell: Cell) {
    if (this.selected() === cell.key) return 'border-leaf-600 bg-leaf-600 text-white shadow-soft';
    const base = cell.key === this.today() ? 'border-leaf-500 bg-leaf-50 text-leaf-700' : 'border-transparent hover:bg-sand';
    return `${base} ${cell.inMonth ? '' : 'text-soft'}`;
  }

  protected cellLabel(cell: Cell) {
    const dot = this.dots()[cell.key];
    const label = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${cell.key}T12:00:00Z`));
    return dot ? `${label}, con citas${dot.requested ? ' por confirmar' : ''}` : label;
  }

  protected time(iso: string) {
    return formatTime(iso, this.timezone());
  }
  protected status(a: Appointment) {
    return statusLabels[a.status];
  }
  protected noSlotsText() {
    return this.selected() < this.today() ? 'Este día ya pasó.' : 'No quedan horas libres este día.';
  }

  private keyOf(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: this.timezone() || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  private async load() {
    const cells = this.cells();
    if (cells.length === 0) return;
    const first = cells[0].key;
    const last = cells[cells.length - 1].key;
    // Margen de un día a cada lado: la zona horaria puede correr el borde del calendario.
    const from = new Date(Date.parse(`${first}T00:00:00Z`) - DAY_MS).toISOString();
    const to = new Date(Date.parse(`${last}T00:00:00Z`) + 2 * DAY_MS).toISOString();
    this.loading.set(true);
    this.error.set(null);
    try {
      const [appointments, slots] = await Promise.all([
        this.api.get<Appointment[]>(`/psy/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        this.api.get<{ days: FreeDay[] }>(`/psy/slots?from=${first}&days=42`).catch(() => ({ days: [] as FreeDay[] })),
      ]);
      // Si cambió de mes mientras llegaba la respuesta, se descarta.
      if (this.cells()[0]?.key !== first) return;
      this.appointments.set(appointments);
      this.free.set(slots.days);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar tu calendario.'));
    } finally {
      this.loading.set(false);
    }
  }
}
