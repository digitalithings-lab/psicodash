import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { avatarEmoji, focusAreaLabels, formatDate, formatDateTime, riskLabels, weekdaysLabel } from '../../core/format';
import { CatalogChallenge, PatientDetail, PatientResponse, PsyProfile, Routine } from '../../core/types';
import { AppointmentList } from '../../shared/appointment-list';
import { Icon } from '../../shared/icon';
import { Empty, ErrorBanner, SkeletonCards } from '../../shared/ui';
import { RoutineForm } from './routine-form';

type Tab = 'retos' | 'respuestas' | 'contenido' | 'citas';
type ResponseFilter = 'all' | 'routine' | 'daily';

@Component({
  selector: 'app-patient-detail',
  imports: [FormsModule, RouterLink, Icon, Empty, ErrorBanner, SkeletonCards, AppointmentList, RoutineForm],
  template: `
    <a routerLink="/pacientes" class="mb-4 inline-flex items-center gap-1 text-sm font-bold text-leaf-700 hover:underline">
      <app-icon name="chevronLeft" size="sm" /> Pacientes
    </a>
    <app-error [message]="error()" />

    @if (!data()) {
      <app-skeleton-cards [count]="1" grid="" />
      <div class="mt-6"><app-skeleton-cards [count]="3" /></div>
    } @else {
      @let d = data()!;
      <header class="card mb-6 flex flex-wrap items-center gap-5">
        <span class="flex size-16 items-center justify-center rounded-full bg-leaf-100 text-4xl">{{ emoji() }}</span>
        <div class="min-w-0 flex-1">
          <h1 class="text-3xl font-extrabold">{{ d.patient.displayName }}</h1>
          <p class="text-sm text-muted">
            Vinculado desde {{ date(d.patient.linkedAt) }}
            @if (d.patient.avatar) { · Su compañero: {{ d.patient.avatar.name }} }
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            @for (area of d.patient.focusAreas; track area) {
              <span class="chip bg-leaf-50 text-leaf-700">{{ areaLabel(area) }}</span>
            }
          </div>
        </div>
        <div class="rounded-2xl bg-cream p-4">
          <label class="label" for="auto">Retos automáticos por día</label>
          <div class="flex items-center gap-2">
            <select id="auto" class="input w-24" name="auto" [(ngModel)]="autoPerDay" (change)="saveAuto()">
              @for (n of [0, 1, 2, 3, 4, 5, 6]; track n) {
                <option [ngValue]="n">{{ n }}</option>
              }
            </select>
            <span class="text-xs text-muted">{{ autoSaved() ? '✓ Guardado' : 'Del catálogo general' }}</span>
          </div>
        </div>
      </header>

      <div class="mb-6 flex gap-1 rounded-full bg-sand p-1" role="tablist">
        @for (t of tabs; track t.id) {
          <button
            role="tab"
            class="flex-1 rounded-full px-4 py-2.5 font-bold transition"
            [class]="tab() === t.id ? 'bg-white text-leaf-700 shadow-soft' : 'text-muted'"
            [attr.aria-selected]="tab() === t.id"
            (click)="tab.set(t.id)"
          >
            {{ t.label }}
            @if (t.id === 'respuestas' && riskyCount() > 0) {
              <span class="ml-1 rounded-full bg-danger-500 px-2 text-xs text-white">{{ riskyCount() }}</span>
            }
          </button>
        }
      </div>

      @switch (tab()) {
        @case ('retos') {
          <div class="mb-4 flex justify-between gap-2">
            <p class="text-sm text-muted">Aparecen en «Mis retos» de su app los días que elijas.</p>
            <button class="btn-primary" (click)="openForm(null)"><app-icon name="plus" /> Nuevo reto</button>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            @for (r of d.routines; track r.id) {
              <article class="card flex flex-col gap-3" [class.opacity-60]="!r.active">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-lg font-extrabold">{{ r.title }}</h3>
                  @if (!r.active) {
                    <span class="chip bg-sand text-muted">Archivado</span>
                  }
                </div>
                <p class="text-sm text-ink">{{ r.description }}</p>
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="chip bg-lilac-100 text-lilac-500">{{ days(r) }}</span>
                  <span class="chip bg-peach-100 text-peach-700">🌰 {{ r.seedsReward }}</span>
                  <span class="chip bg-sky-100 text-sky-500">{{ r.evidenceType === 'TEXT' ? 'Respuesta escrita' : 'Actividad + reflexión' }}</span>
                  @if (r.endDate) {
                    <span class="chip bg-sand text-muted">Hasta {{ date(r.endDate) }}</span>
                  }
                </div>
                @if (r.active && r.week) {
                  <div>
                    <div class="mb-1 flex justify-between text-xs text-muted">
                      <span>Últimos 7 días</span><span>{{ r.week.completed }} de {{ r.week.expected }}</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-sand">
                      <div class="h-full rounded-full bg-leaf-500" [style.width.%]="r.week.expected ? (r.week.completed / r.week.expected) * 100 : 0"></div>
                    </div>
                  </div>
                }
                <div class="mt-auto flex gap-2 pt-2">
                  <button class="btn-secondary px-4 py-2 text-sm" (click)="openForm(r)"><app-icon name="edit" size="sm" /> Editar</button>
                  <button class="btn-ghost px-4 py-2 text-sm" (click)="toggleActive(r)">{{ r.active ? 'Archivar' : 'Reactivar' }}</button>
                </div>
              </article>
            } @empty {
              <div class="card md:col-span-2">
                <app-empty emoji="📝" title="Aún no le asignas retos" text="Crea el primero: puedes partir de uno del catálogo y adaptarlo." />
              </div>
            }
          </div>
        }

        @case ('respuestas') {
          <div class="mb-4 flex flex-wrap gap-2">
            @for (f of filters; track f.id) {
              <button
                class="chip px-4 py-2 text-sm"
                [class]="filter() === f.id ? 'bg-leaf-500 text-white' : 'bg-white text-muted shadow-soft'"
                (click)="filter.set(f.id)"
              >
                {{ f.label }}
              </button>
            }
          </div>
          <div class="space-y-3">
            @for (r of responses(); track r.id) {
              <article class="card" [class.border-2]="risk(r)" [class.border-danger-100]="risk(r)">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-extrabold">{{ r.title }}</h3>
                  <span class="chip" [class]="r.kind === 'routine' ? 'bg-leaf-100 text-leaf-700' : 'bg-sand text-muted'">
                    {{ r.kind === 'routine' ? 'Tu reto' : 'Reto del día' }}
                  </span>
                  @if (risk(r); as label) {
                    <span class="chip" [class]="label.classes">{{ label.label }}</span>
                  }
                  <span class="ml-auto text-xs capitalize text-muted">{{ dateTime(r.completedAt) }}</span>
                </div>
                @if (r.textContent) {
                  <p class="mt-3 whitespace-pre-line text-ink">{{ r.textContent }}</p>
                }
                @if (r.reflection) {
                  <p class="mt-3 whitespace-pre-line rounded-2xl bg-cream p-3 text-ink"><b class="text-muted">Reflexión:</b> {{ r.reflection }}</p>
                }
                @if (!r.textContent && !r.reflection) {
                  <p class="mt-2 text-sm text-muted">Completado sin respuesta escrita.</p>
                }
              </article>
            } @empty {
              <div class="card"><app-empty emoji="💬" title="Aún no hay respuestas" text="Aquí verás lo que responde en sus retos de los últimos 30 días." /></div>
            }
          </div>
        }

        @case ('contenido') {
          <div class="grid gap-6 lg:grid-cols-5">
            <section class="card space-y-4 lg:col-span-2">
              <h2 class="text-lg font-extrabold">Compartir contenido</h2>
              <p class="text-sm text-muted">Lo verá en «Actividades» de su app. Al marcarlo como hecho gana agua para su jardín.</p>
              <div class="flex gap-2">
                <button
                  class="chip flex-1 justify-center px-4 py-2 text-sm"
                  [class]="contentKind === 'READING' ? 'bg-leaf-500 text-white' : 'bg-white text-muted shadow-soft'"
                  (click)="contentKind = 'READING'"
                >
                  📖 Lectura
                </button>
                <button
                  class="chip flex-1 justify-center px-4 py-2 text-sm"
                  [class]="contentKind === 'LINK' ? 'bg-leaf-500 text-white' : 'bg-white text-muted shadow-soft'"
                  (click)="contentKind = 'LINK'"
                >
                  🎬 Enlace
                </button>
              </div>
              <div>
                <label class="label" for="ct">Título</label>
                <input id="ct" class="input" name="ct" maxlength="120" [(ngModel)]="contentTitle" />
              </div>
              @if (contentKind === 'READING') {
                <div>
                  <label class="label" for="cb">Texto</label>
                  <textarea id="cb" class="input min-h-40" name="cb" maxlength="5000" [(ngModel)]="contentBody"></textarea>
                </div>
              } @else {
                <div>
                  <label class="label" for="cu">Enlace (video, artículo…)</label>
                  <input id="cu" class="input" name="cu" placeholder="https://" [(ngModel)]="contentUrl" />
                </div>
              }
              <app-error [message]="contentError()" />
              <button class="btn-primary w-full" [disabled]="savingContent()" (click)="addContent()">Compartir</button>
            </section>

            <section class="space-y-3 lg:col-span-3">
              @for (c of d.contents; track c.id) {
                <article class="card flex items-start gap-4">
                  <span class="text-3xl">{{ c.kind === 'READING' ? '📖' : '🎬' }}</span>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-extrabold">{{ c.title }}</h3>
                    @if (c.url) {
                      <a class="block truncate text-sm text-sky-500 hover:underline" [href]="c.url" target="_blank" rel="noopener">{{ c.url }}</a>
                    }
                    @if (c.body) {
                      <p class="mt-1 line-clamp-3 text-sm text-ink">{{ c.body }}</p>
                    }
                    <p class="mt-2 text-xs">
                      @if (c.completedAt) {
                        <span class="chip bg-leaf-100 text-leaf-700">✓ Lo vio {{ dateTime(c.completedAt) }}</span>
                      } @else {
                        <span class="chip bg-sand text-muted">Pendiente</span>
                      }
                    </p>
                  </div>
                  <button class="rounded-full p-2 text-muted hover:bg-sand" (click)="deleteContent(c.id)" aria-label="Quitar contenido">
                    <app-icon name="trash" size="sm" />
                  </button>
                </article>
              } @empty {
                <div class="card"><app-empty emoji="📚" title="Aún no le compartes contenido" text="Comparte lecturas breves o enlaces que refuercen lo que trabajan en sesión." /></div>
              }
            </section>
          </div>
        }

        @case ('citas') {
          <section class="card">
            <app-appointment-list
              [appointments]="d.appointments"
              [timezone]="profile()?.timezone"
              [defaultMeetingUrl]="profile()?.defaultMeetingUrl ?? null"
              [showPatient]="false"
              emptyText="Todavía no tiene citas contigo."
              (changed)="reload()"
            />
          </section>
        }
      }

      @if (formOpen()) {
        <app-routine-form
          [patientId]="d.patient.id"
          [patientName]="d.patient.displayName"
          [routine]="editing()"
          [catalog]="catalog()"
          (saved)="onSaved()"
          (closed)="formOpen.set(false)"
        />
      }
    }
  `,
})
export class PatientDetailPage implements OnInit {
  private readonly api = inject(ApiService);

  // Viene del parámetro de la ruta gracias a withComponentInputBinding().
  readonly patientId = input.required<string>();

  protected readonly data = signal<PatientDetail | null>(null);
  protected readonly profile = signal<PsyProfile | null>(null);
  protected readonly catalog = signal<CatalogChallenge[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('retos');
  protected readonly filter = signal<ResponseFilter>('all');
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Routine | null>(null);
  protected readonly autoSaved = signal(false);
  protected autoPerDay = 3;
  protected contentKind: 'READING' | 'LINK' = 'READING';
  protected contentTitle = '';
  protected contentBody = '';
  protected contentUrl = '';
  protected readonly savingContent = signal(false);
  protected readonly contentError = signal<string | null>(null);

  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'retos', label: 'Retos' },
    { id: 'respuestas', label: 'Respuestas' },
    { id: 'contenido', label: 'Contenido' },
    { id: 'citas', label: 'Citas' },
  ];
  protected readonly filters: { id: ResponseFilter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'routine', label: 'Mis retos' },
    { id: 'daily', label: 'Retos del día' },
  ];

  protected readonly responses = computed(() => {
    const all = this.data()?.responses ?? [];
    return this.filter() === 'all' ? all : all.filter((r) => r.kind === this.filter());
  });
  protected readonly riskyCount = computed(() => (this.data()?.responses ?? []).filter((r) => this.risk(r)).length);
  protected readonly emoji = computed(() => {
    const avatar = this.data()?.patient.avatar;
    return (avatar && avatarEmoji[avatar.species]) ?? '🌱';
  });

  async ngOnInit() {
    await this.reload();
    this.api.get<PsyProfile>('/psy/me').then((p) => this.profile.set(p)).catch(() => undefined);
    this.api.get<CatalogChallenge[]>('/psy/catalog').then((c) => this.catalog.set(c)).catch(() => undefined);
  }

  async reload() {
    try {
      const data = await this.api.get<PatientDetail>(`/psy/patients/${this.patientId()}`);
      this.data.set(data);
      this.autoPerDay = data.settings.autoChallengesPerDay;
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar la ficha del paciente.'));
    }
  }

  protected async saveAuto() {
    try {
      await this.api.patch(`/psy/patients/${this.patientId()}/settings`, { autoChallengesPerDay: Number(this.autoPerDay) });
      this.autoSaved.set(true);
      setTimeout(() => this.autoSaved.set(false), 2000);
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  protected openForm(routine: Routine | null) {
    this.editing.set(routine);
    this.formOpen.set(true);
  }

  protected async onSaved() {
    this.formOpen.set(false);
    await this.reload();
  }

  protected async toggleActive(routine: Routine) {
    try {
      await this.api.patch(`/psy/routines/${routine.id}`, { active: !routine.active });
      await this.reload();
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  protected async addContent() {
    this.contentError.set(null);
    if (this.contentTitle.trim().length < 3) return this.contentError.set('Escribe un título.');
    this.savingContent.set(true);
    try {
      await this.api.post(`/psy/patients/${this.patientId()}/content`, {
        title: this.contentTitle.trim(),
        kind: this.contentKind,
        body: this.contentKind === 'READING' ? this.contentBody.trim() : undefined,
        url: this.contentKind === 'LINK' ? this.contentUrl.trim() : undefined,
      });
      this.contentTitle = this.contentBody = this.contentUrl = '';
      await this.reload();
    } catch (err) {
      this.contentError.set(errorMessage(err, 'No pudimos compartir el contenido.'));
    } finally {
      this.savingContent.set(false);
    }
  }

  protected async deleteContent(id: string) {
    if (!confirm('¿Quitar este contenido? Tu paciente dejará de verlo.')) return;
    try {
      await this.api.delete(`/psy/content/${id}`);
      await this.reload();
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  protected risk(r: PatientResponse) {
    return r.riskLevel ? riskLabels[r.riskLevel] : null;
  }
  protected areaLabel(area: keyof typeof focusAreaLabels) {
    return focusAreaLabels[area];
  }
  protected days(r: Routine) {
    return weekdaysLabel(r.weekdays);
  }
  protected date(iso: string) {
    return formatDate(iso);
  }
  protected dateTime(iso: string) {
    return formatDateTime(iso, this.profile()?.timezone);
  }
}
