import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { Icon } from '../../shared/icon';
import { ErrorBanner, Modal, PageHeader, SkeletonCards } from '../../shared/ui';

interface Emotion {
  id: string;
  label: string;
  emoji: string;
  color: string;
  active: boolean;
  sortOrder: number;
}

interface EmotionsResponse {
  usingDefaults: boolean;
  custom: Emotion[];
  defaults: Emotion[];
}

// Emociones que los pacientes de este psicólogo pueden registrar en «¿Cómo te sientes?».
@Component({
  selector: 'app-emotions',
  imports: [FormsModule, PageHeader, SkeletonCards, ErrorBanner, Modal, Icon],
  template: `
    <app-page-header title="Emociones" subtitle="Las que tus pacientes pueden elegir al registrar cómo se sienten.">
      @if (data() && data()!.custom.length > 0) {
        <button class="btn-primary" (click)="open(null)"><app-icon name="plus" /> Nueva emoción</button>
      }
    </app-page-header>
    <app-error [message]="error()" />

    @if (!data()) {
      <app-skeleton-cards [count]="3" />
    } @else {
      @if (data()!.custom.length === 0) {
        <section class="card mb-6 space-y-4">
          <p class="text-ink">
            Tus pacientes ven por ahora la <b>lista por defecto</b>. Puedes personalizarla a partir de ella o crear la tuya desde cero.
          </p>
          <div class="flex flex-wrap gap-2">
            @for (e of data()!.defaults; track e.id) {
              <span class="chip px-3 py-1.5 text-sm" [style.background-color]="e.color + '33'">{{ e.emoji }} {{ e.label }}</span>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-primary" [disabled]="busy()" (click)="copyDefaults()">Personalizar a partir de esta lista</button>
            <button class="btn-secondary" (click)="open(null)">Crear desde cero</button>
          </div>
        </section>
      } @else {
        @if (data()!.usingDefaults) {
          <div class="card mb-4 border-2 border-peach-100 text-sm">
            Todas tus emociones están ocultas, así que tus pacientes ven la lista por defecto. Muestra al menos una para usar la tuya.
          </div>
        }
        <section class="card p-2">
          <ul class="divide-y divide-line">
            @for (e of data()!.custom; track e.id; let i = $index, last = $last) {
              <li class="flex flex-wrap items-center gap-3 px-4 py-3" [class.opacity-50]="!e.active">
                <span class="flex size-11 items-center justify-center rounded-full text-2xl" [style.background-color]="e.color + '55'">{{ e.emoji }}</span>
                <div class="min-w-0 flex-1">
                  <p class="font-bold">{{ e.label }}</p>
                  <p class="font-mono text-xs text-muted">{{ e.color }}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button class="rounded-full p-2 text-muted hover:bg-sand disabled:opacity-30" [disabled]="i === 0 || busy()" (click)="move(i, -1)" aria-label="Subir">
                    <app-icon name="chevronUp" size="sm" />
                  </button>
                  <button class="rounded-full p-2 text-muted hover:bg-sand disabled:opacity-30" [disabled]="last || busy()" (click)="move(i, 1)" aria-label="Bajar">
                    <app-icon name="chevronDown" size="sm" />
                  </button>
                  <button class="btn-ghost px-3 py-1.5 text-sm" (click)="toggle(e)">{{ e.active ? 'Ocultar' : 'Mostrar' }}</button>
                  <button class="rounded-full p-2 text-muted hover:bg-sand" (click)="open(e)" aria-label="Editar"><app-icon name="edit" size="sm" /></button>
                  <button class="rounded-full p-2 text-muted hover:bg-sand" (click)="remove(e)" aria-label="Eliminar"><app-icon name="trash" size="sm" /></button>
                </div>
              </li>
            }
          </ul>
        </section>
        <p class="mt-4 text-sm text-muted">
          Si cambias o eliminas una emoción, los registros que tus pacientes ya hicieron se siguen viendo igual en su calendario.
        </p>
      }
    }

    @if (editing(); as e) {
      <app-modal [title]="e.id ? 'Editar emoción' : 'Nueva emoción'" (closed)="editing.set(null)">
        <form class="space-y-4" (ngSubmit)="save()">
          <div class="flex justify-center">
            <span class="chip px-5 py-3 text-lg" [style.background-color]="(e.color || '#CFC8BC') + '55'">{{ e.emoji || '🙂' }} {{ e.label || 'Vista previa' }}</span>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-2">
              <label class="label" for="el">Nombre</label>
              <input id="el" class="input" name="el" maxlength="30" placeholder="Esperanza" [(ngModel)]="e.label" />
            </div>
            <div>
              <label class="label" for="ee">Emoji</label>
              <input id="ee" class="input text-center text-2xl" name="ee" maxlength="16" placeholder="🌅" [(ngModel)]="e.emoji" />
            </div>
          </div>
          <div>
            <label class="label" for="ec">Color en el calendario</label>
            <div class="flex items-center gap-3">
              <input id="ec" type="color" class="h-12 w-16 cursor-pointer rounded-xl border-[1.5px] border-line-strong bg-surface" name="ec" [(ngModel)]="e.color" />
              <input class="input font-mono uppercase" name="ech" maxlength="7" [(ngModel)]="e.color" aria-label="Código de color" />
            </div>
          </div>
          <app-error [message]="formError()" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-ghost" (click)="editing.set(null)">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="busy()">Guardar</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class Emotions implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly data = signal<EmotionsResponse | null>(null);
  protected readonly editing = signal<Partial<Emotion> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly busy = signal(false);

  async ngOnInit() {
    await this.run(() => this.api.get<EmotionsResponse>('/psy/emotions'));
  }

  protected open(e: Emotion | null) {
    this.formError.set(null);
    this.editing.set(e ? { ...e } : { label: '', emoji: '', color: '#8CC5A8' });
  }

  protected async save() {
    const e = this.editing()!;
    if (!e.label?.trim() || !e.emoji?.trim()) return this.formError.set('Escribe el nombre y el emoji.');
    if (!/^#[0-9a-fA-F]{6}$/.test(e.color ?? '')) return this.formError.set('El color debe ser como #8CC5A8.');
    const body = { label: e.label.trim(), emoji: e.emoji.trim(), color: e.color };
    const ok = await this.run(() =>
      e.id ? this.api.patch<EmotionsResponse>(`/psy/emotions/${e.id}`, body) : this.api.post<EmotionsResponse>('/psy/emotions', body),
    );
    if (ok) this.editing.set(null);
  }

  protected copyDefaults() {
    return this.run(() => this.api.post<EmotionsResponse>('/psy/emotions/copy-defaults'));
  }

  protected toggle(e: Emotion) {
    return this.run(() => this.api.patch<EmotionsResponse>(`/psy/emotions/${e.id}`, { active: !e.active }));
  }

  protected remove(e: Emotion) {
    if (!confirm(`¿Eliminar «${e.label}»? Tus pacientes ya no podrán elegirla.`)) return;
    return this.run(() => this.api.delete<EmotionsResponse>(`/psy/emotions/${e.id}`));
  }

  protected move(index: number, delta: number) {
    const ids = this.data()!.custom.map((e) => e.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    return this.run(() => this.api.put<EmotionsResponse>('/psy/emotions/order', { ids }));
  }

  private async run(action: () => Promise<EmotionsResponse>): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.data.set(await action());
      return true;
    } catch (err) {
      const message = errorMessage(err, 'No pudimos guardar el cambio.');
      if (this.editing()) this.formError.set(message);
      else this.error.set(message);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
