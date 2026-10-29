import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { categoryLabels, focusAreaLabels } from '../../core/format';
import { CatalogChallenge, ChallengeCategory, EvidenceType, FocusArea } from '../../core/types';
import { Icon } from '../../shared/icon';
import { ErrorBanner, Modal, PageHeader, SkeletonCards } from '../../shared/ui';

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  TEXT: 'Respuesta escrita',
  INTERACTIVE: 'Actividad + reflexión',
  PHOTO: 'Foto opcional + reflexión',
  AUDIO: 'Nota de voz',
};

@Component({
  selector: 'app-admin-challenges',
  imports: [FormsModule, PageHeader, SkeletonCards, ErrorBanner, Modal, Icon],
  template: `
    <app-page-header title="Catálogo de retos" subtitle="Retos automáticos que reciben las personas cada día.">
      <button class="btn-primary" (click)="open(null)"><app-icon name="plus" /> Nuevo reto</button>
    </app-page-header>
    <app-error [message]="error()" />

    @if (!list()) {
      <app-skeleton-cards [count]="6" />
    } @else {
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (c of list(); track c.id) {
          <article class="card flex flex-col gap-3" [class.opacity-60]="!c.active">
            <div class="flex items-start justify-between gap-2">
              <span class="chip bg-lilac-100 text-lilac-500">{{ category(c.category) }}</span>
              @if (!c.active) {
                <span class="chip bg-sand text-muted">Inactivo</span>
              }
            </div>
            <h3 class="text-lg font-extrabold">{{ c.title }}</h3>
            <p class="text-sm text-ink">{{ c.description }}</p>
            <div class="flex flex-wrap gap-1 text-xs">
              <span class="chip bg-sky-100 text-sky-500">{{ evidence(c.evidenceType) }}</span>
              <span class="chip bg-peach-100 text-peach-700">🌰 {{ c.seedsReward }}</span>
              @for (a of c.focusAreas ?? []; track a) {
                <span class="chip bg-leaf-50 text-leaf-700">{{ area(a) }}</span>
              }
            </div>
            <div class="mt-auto flex gap-2 pt-2">
              <button class="btn-secondary px-4 py-2 text-sm" (click)="open(c)"><app-icon name="edit" size="sm" /> Editar</button>
              <button class="btn-ghost px-4 py-2 text-sm" (click)="toggle(c)">{{ c.active ? 'Desactivar' : 'Activar' }}</button>
            </div>
          </article>
        }
      </div>
    }

    @if (editing(); as e) {
      <app-modal [title]="e.id ? 'Editar reto' : 'Nuevo reto'" (closed)="editing.set(null)">
        <form class="space-y-4" (ngSubmit)="save()">
          <div>
            <label class="label" for="t">Título</label>
            <input id="t" class="input" name="t" maxlength="80" [(ngModel)]="e.title" />
          </div>
          <div>
            <label class="label" for="d">Descripción</label>
            <textarea id="d" class="input min-h-24" name="d" maxlength="400" [(ngModel)]="e.description"></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="c">Categoría</label>
              <select id="c" class="input" name="c" [(ngModel)]="e.category">
                @for (k of categories; track k) {
                  <option [value]="k">{{ category(k) }}</option>
                }
              </select>
            </div>
            <div>
              <label class="label" for="ev">Evidencia</label>
              <select id="ev" class="input" name="ev" [(ngModel)]="e.evidenceType">
                @for (k of evidences; track k) {
                  <option [value]="k">{{ evidence(k) }}</option>
                }
              </select>
            </div>
          </div>
          <div>
            <label class="label" for="rp">Pregunta de reflexión (opcional)</label>
            <input id="rp" class="input" name="rp" maxlength="200" [(ngModel)]="e.reflectionPrompt" />
          </div>
          <div>
            <span class="label">Áreas a las que ayuda</span>
            <div class="flex flex-wrap gap-2">
              @for (a of areas; track a) {
                <button
                  type="button"
                  class="chip px-3 py-1.5 text-sm"
                  [class]="e.focusAreas!.includes(a) ? 'bg-leaf-500 text-white' : 'bg-surface text-muted shadow-soft'"
                  (click)="toggleArea(a)"
                >
                  {{ area(a) }}
                </button>
              }
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="s">Semillas</label>
              <input id="s" class="input" type="number" min="0" max="50" name="s" [(ngModel)]="e.seedsReward" />
            </div>
            <div>
              <label class="label" for="m">Duración (min, opcional)</label>
              <input id="m" class="input" type="number" min="1" max="120" name="m" [(ngModel)]="e.durationMinutes" />
            </div>
          </div>
          <app-error [message]="formError()" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-ghost" (click)="editing.set(null)">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">Guardar</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class AdminChallenges implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly categories: ChallengeCategory[] = ['SELF_KNOWLEDGE', 'EMOTIONAL_SKILLS', 'SELF_CARE'];
  protected readonly evidences: EvidenceType[] = ['TEXT', 'INTERACTIVE', 'PHOTO', 'AUDIO'];
  protected readonly areas = Object.keys(focusAreaLabels) as FocusArea[];
  protected readonly list = signal<CatalogChallenge[] | null>(null);
  protected readonly editing = signal<Partial<CatalogChallenge> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    try {
      this.list.set(await this.api.get<CatalogChallenge[]>('/admin/challenges'));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar el catálogo.'));
      this.list.set([]);
    }
  }

  protected category(c: ChallengeCategory) {
    return categoryLabels[c];
  }
  protected evidence(e: EvidenceType) {
    return EVIDENCE_LABELS[e];
  }
  protected area(a: FocusArea) {
    return focusAreaLabels[a];
  }

  protected open(c: CatalogChallenge | null) {
    this.formError.set(null);
    this.editing.set(
      c
        ? { ...c, focusAreas: [...(c.focusAreas ?? [])], reflectionPrompt: c.reflectionPrompt ?? '' }
        : { title: '', description: '', category: 'SELF_CARE', evidenceType: 'TEXT', focusAreas: [], reflectionPrompt: '', seedsReward: 15 },
    );
  }

  protected toggleArea(a: FocusArea) {
    this.editing.update((e) =>
      e ? { ...e, focusAreas: e.focusAreas!.includes(a) ? e.focusAreas!.filter((x) => x !== a) : [...e.focusAreas!, a] } : e,
    );
  }

  protected async toggle(c: CatalogChallenge) {
    try {
      await this.api.patch(`/admin/challenges/${c.id}`, { active: !c.active });
      await this.load();
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  protected async save() {
    const e = this.editing()!;
    const body = {
      title: e.title?.trim(),
      description: e.description?.trim(),
      category: e.category,
      evidenceType: e.evidenceType,
      focusAreas: e.focusAreas,
      reflectionPrompt: e.reflectionPrompt?.trim() || undefined,
      seedsReward: Number(e.seedsReward) || 0,
      durationMinutes: e.durationMinutes ? Number(e.durationMinutes) : undefined,
    };
    this.saving.set(true);
    try {
      if (e.id) await this.api.patch(`/admin/challenges/${e.id}`, body);
      else await this.api.post('/admin/challenges', body);
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.formError.set(errorMessage(err, 'No pudimos guardar el reto.'));
    } finally {
      this.saving.set(false);
    }
  }
}
