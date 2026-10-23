import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { categoryLabels, WEEK_ORDER, WEEKDAYS_SHORT } from '../../core/format';
import { CatalogChallenge, EvidenceType, Routine } from '../../core/types';
import { ErrorBanner, Modal } from '../../shared/ui';

// Formulario para crear o editar un reto asignado a un paciente.
@Component({
  selector: 'app-routine-form',
  imports: [FormsModule, Modal, ErrorBanner],
  template: `
    <app-modal [title]="routine() ? 'Editar reto' : 'Nuevo reto para ' + patientName()" (closed)="closed.emit()">
      <form class="space-y-4" (ngSubmit)="save()">
        @if (!routine() && catalog().length > 0) {
          <div>
            <label class="label" for="template">Partir de un reto del catálogo (opcional)</label>
            <select id="template" class="input" name="template" (change)="useTemplate($any($event.target).value)">
              <option value="">Escribirlo desde cero</option>
              @for (c of catalog(); track c.id) {
                <option [value]="c.id">{{ categoryLabel(c) }} · {{ c.title }}</option>
              }
            </select>
          </div>
        }

        <div>
          <label class="label" for="title">Título</label>
          <input id="title" class="input" name="title" maxlength="80" placeholder="Registro de pensamientos" [(ngModel)]="title" />
        </div>
        <div>
          <label class="label" for="description">Indicaciones para tu paciente</label>
          <textarea id="description" class="input min-h-28" name="description" maxlength="600" [(ngModel)]="description"></textarea>
        </div>

        <div>
          <span class="label">¿Cómo responde?</span>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="flex cursor-pointer items-start gap-2 rounded-2xl border-2 bg-white p-3" [class]="evidenceType === 'TEXT' ? 'border-leaf-500' : 'border-line'">
              <input type="radio" name="evidence" value="TEXT" class="mt-1 accent-leaf-500" [(ngModel)]="evidenceType" />
              <span><b>Respuesta escrita</b><br /><span class="text-xs text-muted">Escribe lo que se le pide.</span></span>
            </label>
            <label class="flex cursor-pointer items-start gap-2 rounded-2xl border-2 bg-white p-3" [class]="evidenceType === 'INTERACTIVE' ? 'border-leaf-500' : 'border-line'">
              <input type="radio" name="evidence" value="INTERACTIVE" class="mt-1 accent-leaf-500" [(ngModel)]="evidenceType" />
              <span><b>Actividad + reflexión</b><br /><span class="text-xs text-muted">La hace y cuenta qué observó.</span></span>
            </label>
          </div>
        </div>
        @if (evidenceType === 'INTERACTIVE') {
          <div>
            <label class="label" for="prompt">Pregunta de reflexión</label>
            <input id="prompt" class="input" name="prompt" maxlength="200" placeholder="¿Qué observaste en ti después de hacerlo?" [(ngModel)]="reflectionPrompt" />
          </div>
        }

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <span class="label mb-0">¿Qué días le toca?</span>
            <button type="button" class="text-sm font-bold text-leaf-700 hover:underline" (click)="toggleAll()">
              {{ weekdays().length === 7 ? 'Quitar todos' : 'Todos los días' }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            @for (d of weekOrder; track d) {
              <button
                type="button"
                class="size-12 rounded-full border-2 font-bold transition"
                [class]="weekdays().includes(d) ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-line bg-white text-muted'"
                (click)="toggleDay(d)"
                [attr.aria-pressed]="weekdays().includes(d)"
              >
                {{ dayLabel(d) }}
              </button>
            }
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="end">Hasta (opcional)</label>
            <input id="end" class="input" type="date" name="end" [(ngModel)]="endDate" />
          </div>
          <div>
            <label class="label" for="seeds">Semillas al completarlo</label>
            <input id="seeds" class="input" type="number" min="0" max="50" name="seeds" [(ngModel)]="seedsReward" />
          </div>
        </div>

        <app-error [message]="error()" />
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-ghost" (click)="closed.emit()">Cancelar</button>
          <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar reto' }}</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class RoutineForm implements OnInit {
  private readonly api = inject(ApiService);

  readonly patientId = input.required<string>();
  readonly patientName = input('');
  readonly routine = input<Routine | null>(null);
  readonly catalog = input<CatalogChallenge[]>([]);
  readonly saved = output<Routine>();
  readonly closed = output<void>();

  protected readonly weekOrder = WEEK_ORDER;
  protected title = '';
  protected description = '';
  protected evidenceType: EvidenceType = 'TEXT';
  protected reflectionPrompt = '';
  protected endDate = '';
  protected seedsReward = 15;
  protected readonly weekdays = signal<number[]>([1, 3, 5]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    const r = this.routine();
    if (r) {
      this.title = r.title;
      this.description = r.description;
      this.evidenceType = r.evidenceType;
      this.reflectionPrompt = r.reflectionPrompt ?? '';
      this.endDate = r.endDate ?? '';
      this.seedsReward = r.seedsReward;
      this.weekdays.set([...r.weekdays]);
    }
  }

  protected categoryLabel(c: CatalogChallenge) {
    return categoryLabels[c.category];
  }
  protected dayLabel(d: number) {
    return WEEKDAYS_SHORT[d].slice(0, 2);
  }

  protected useTemplate(id: string) {
    const template = this.catalog().find((c) => c.id === id);
    if (!template) return;
    this.title = template.title;
    this.description = template.description;
    this.evidenceType = template.evidenceType === 'TEXT' ? 'TEXT' : 'INTERACTIVE';
    this.reflectionPrompt = template.reflectionPrompt ?? '';
    this.seedsReward = template.seedsReward;
  }

  protected toggleDay(d: number) {
    this.weekdays.update((days) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]));
  }
  protected toggleAll() {
    this.weekdays.set(this.weekdays().length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]);
  }

  protected async save() {
    this.error.set(null);
    if (this.title.trim().length < 3) return this.error.set('Escribe un título.');
    if (this.description.trim().length < 3) return this.error.set('Escribe las indicaciones.');
    if (this.weekdays().length === 0) return this.error.set('Elige al menos un día.');

    const body = {
      title: this.title.trim(),
      description: this.description.trim(),
      evidenceType: this.evidenceType,
      reflectionPrompt: this.evidenceType === 'INTERACTIVE' ? this.reflectionPrompt.trim() || undefined : undefined,
      weekdays: this.weekdays(),
      endDate: this.endDate || null,
      seedsReward: Number(this.seedsReward) || 0,
    };

    this.saving.set(true);
    try {
      const r = this.routine();
      const saved = r
        ? await this.api.patch<Routine>(`/psy/routines/${r.id}`, body)
        : await this.api.post<Routine>(`/psy/patients/${this.patientId()}/routines`, body);
      this.saved.emit(saved);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos guardar el reto.'));
    } finally {
      this.saving.set(false);
    }
  }
}
