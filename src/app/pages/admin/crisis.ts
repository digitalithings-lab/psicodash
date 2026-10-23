import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { CrisisResource } from '../../core/types';
import { Icon } from '../../shared/icon';
import { Empty, ErrorBanner, Modal, PageHeader, SkeletonCards } from '../../shared/ui';

@Component({
  selector: 'app-admin-crisis',
  imports: [FormsModule, PageHeader, SkeletonCards, ErrorBanner, Modal, Icon, Empty],
  template: `
    <app-page-header title="Líneas de ayuda" subtitle="Se muestran en «Necesito calmarme» y cuando se detecta riesgo, según el país de la persona.">
      <button class="btn-primary" (click)="open(null)"><app-icon name="plus" /> Nueva línea</button>
    </app-page-header>

    <div class="card mb-6 border-2 border-peach-100 bg-peach-100/40 text-sm text-ink">
      ⚠️ Verifica cada número antes de publicarlo. Un dato equivocado puede dejar sin ayuda a alguien en crisis.
    </div>
    <app-error [message]="error()" />

    @if (!list()) {
      <app-skeleton-cards [count]="3" />
    } @else {
      @for (group of byCountry(); track group.country) {
        <h2 class="mb-3 mt-6 text-lg font-extrabold">{{ group.country }}</h2>
        <div class="grid gap-4 md:grid-cols-2">
          @for (r of group.items; track r.id) {
            <article class="card flex flex-col gap-2" [class.opacity-60]="!r.active">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-extrabold">{{ r.name }}</h3>
                @if (r.available24h) {
                  <span class="chip bg-leaf-100 text-leaf-700">24 h</span>
                }
              </div>
              @if (r.phone) {
                <p class="font-mono text-lg">{{ r.phone }}</p>
              }
              @if (r.url) {
                <a class="truncate text-sm text-sky-500 hover:underline" [href]="r.url" target="_blank" rel="noopener">{{ r.url }}</a>
              }
              @if (r.description) {
                <p class="text-sm text-muted">{{ r.description }}</p>
              }
              <div class="mt-auto flex gap-2 pt-2">
                <button class="btn-secondary px-4 py-2 text-sm" (click)="open(r)">Editar</button>
                <button class="btn-ghost px-4 py-2 text-sm" (click)="remove(r)">Eliminar</button>
              </div>
            </article>
          }
        </div>
      } @empty {
        <div class="card"><app-empty emoji="📞" title="Aún no hay líneas de ayuda" text="Agrega al menos una por cada país donde haya personas usando Florece." /></div>
      }
    }

    @if (editing(); as e) {
      <app-modal [title]="e.id ? 'Editar línea de ayuda' : 'Nueva línea de ayuda'" (closed)="editing.set(null)">
        <form class="space-y-4" (ngSubmit)="save()">
          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label" for="cc">País (ISO)</label>
              <input id="cc" class="input uppercase" name="cc" maxlength="2" placeholder="MX" [(ngModel)]="e.countryCode" />
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="n">Nombre</label>
              <input id="n" class="input" name="n" [(ngModel)]="e.name" />
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="p">Teléfono</label>
              <input id="p" class="input" name="p" [(ngModel)]="e.phone" />
            </div>
            <div>
              <label class="label" for="u">Sitio web</label>
              <input id="u" class="input" name="u" placeholder="https://" [(ngModel)]="e.url" />
            </div>
          </div>
          <div>
            <label class="label" for="ds">Descripción</label>
            <textarea id="ds" class="input min-h-20" name="ds" maxlength="300" [(ngModel)]="e.description"></textarea>
          </div>
          <div class="flex flex-wrap gap-6">
            <label class="flex items-center gap-2 font-bold"><input type="checkbox" class="size-5 accent-leaf-500" name="h" [(ngModel)]="e.available24h" /> Atiende 24 horas</label>
            <label class="flex items-center gap-2 font-bold"><input type="checkbox" class="size-5 accent-leaf-500" name="a" [(ngModel)]="e.active" /> Visible en la app</label>
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
export class AdminCrisis implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly list = signal<CrisisResource[] | null>(null);
  protected readonly editing = signal<Partial<CrisisResource> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly byCountry = computed(() => {
    const groups = new Map<string, CrisisResource[]>();
    for (const r of this.list() ?? []) groups.set(r.countryCode, [...(groups.get(r.countryCode) ?? []), r]);
    return [...groups.entries()].map(([country, items]) => ({ country, items }));
  });

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    try {
      this.list.set(await this.api.get<CrisisResource[]>('/admin/crisis-resources'));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar las líneas de ayuda.'));
      this.list.set([]);
    }
  }

  protected open(r: CrisisResource | null) {
    this.formError.set(null);
    this.editing.set(r ? { ...r, phone: r.phone ?? '', url: r.url ?? '', description: r.description ?? '' } : { countryCode: '', name: '', phone: '', url: '', description: '', available24h: true, active: true });
  }

  protected async save() {
    const e = this.editing()!;
    const body = {
      countryCode: (e.countryCode ?? '').toUpperCase(),
      name: e.name?.trim(),
      phone: e.phone?.trim() || undefined,
      url: e.url?.trim() ?? '',
      description: e.description?.trim() || undefined,
      available24h: !!e.available24h,
      active: !!e.active,
    };
    this.saving.set(true);
    try {
      if (e.id) await this.api.patch(`/admin/crisis-resources/${e.id}`, body);
      else await this.api.post('/admin/crisis-resources', body);
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.formError.set(errorMessage(err, 'No pudimos guardar la línea de ayuda.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(r: CrisisResource) {
    if (!confirm(`¿Eliminar «${r.name}»?`)) return;
    try {
      await this.api.delete(`/admin/crisis-resources/${r.id}`);
      await this.load();
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }
}
