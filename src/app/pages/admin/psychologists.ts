import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { formatDate } from '../../core/format';
import { AdminPsychologist } from '../../core/types';
import { Empty, ErrorBanner, PageHeader, SkeletonCards } from '../../shared/ui';

@Component({
  selector: 'app-admin-psychologists',
  imports: [PageHeader, SkeletonCards, ErrorBanner, Empty],
  template: `
    <app-page-header title="Psicólogos" subtitle="Se registran solos y pueden trabajar de inmediato. Aquí puedes verificarlos o suspenderlos." />
    <app-error [message]="error()" />

    @if (!list()) {
      <app-skeleton-cards [count]="3" />
    } @else {
      <div class="card overflow-x-auto p-0">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-6 py-4">Nombre</th>
              <th class="px-4 py-4">Cédula</th>
              <th class="px-4 py-4">Pacientes</th>
              <th class="px-4 py-4">Alta</th>
              <th class="px-4 py-4">Estado</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            @for (p of list(); track p.id) {
              <tr>
                <td class="px-6 py-4">
                  <p class="font-bold">{{ p.fullName }}</p>
                  <p class="text-muted">{{ p.email }}</p>
                </td>
                <td class="px-4 py-4 font-mono">{{ p.licenseNumber }}</td>
                <td class="px-4 py-4">{{ p.activePatients }}</td>
                <td class="px-4 py-4">{{ date(p.createdAt) }}</td>
                <td class="px-4 py-4">
                  <div class="flex flex-wrap gap-1">
                    <span class="chip" [class]="p.active ? 'bg-leaf-100 text-leaf-700' : 'bg-danger-100 text-danger-500'">
                      {{ p.active ? 'Activo' : 'Suspendido' }}
                    </span>
                    @if (p.verified) {
                      <span class="chip bg-sky-100 text-sky-500">✓ Verificado</span>
                    }
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <button class="btn-ghost px-3 py-1.5 text-sm" (click)="update(p, { verified: !p.verified })">
                      {{ p.verified ? 'Quitar verificación' : 'Verificar' }}
                    </button>
                    <button
                      class="px-3 py-1.5 text-sm"
                      [class]="p.active ? 'btn-danger' : 'btn-secondary'"
                      (click)="toggleActive(p)"
                    >
                      {{ p.active ? 'Suspender' : 'Reactivar' }}
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6"><app-empty emoji="🩺" title="Aún no hay psicólogos registrados" /></td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminPsychologists implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly list = signal<AdminPsychologist[] | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.list.set(await this.api.get<AdminPsychologist[]>('/admin/psychologists'));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar la lista.'));
      this.list.set([]);
    }
  }

  protected toggleActive(p: AdminPsychologist) {
    if (p.active && !confirm(`¿Suspender a ${p.fullName}? No podrá entrar a su panel y sus pacientes no podrán pedirle citas.`)) return;
    void this.update(p, { active: !p.active });
  }

  protected async update(p: AdminPsychologist, body: { active?: boolean; verified?: boolean }) {
    try {
      this.list.set(await this.api.patch<AdminPsychologist[]>(`/admin/psychologists/${p.id}`, body));
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  protected date(iso: string) {
    return formatDate(iso);
  }
}
