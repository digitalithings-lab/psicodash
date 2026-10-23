import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { PsyProfile } from '../../core/types';
import { Icon } from '../../shared/icon';
import { ErrorBanner, PageHeader, SkeletonCards } from '../../shared/ui';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, PageHeader, SkeletonCards, ErrorBanner, Icon],
  template: `
    <app-page-header title="Mi perfil" subtitle="Lo que ven tus pacientes al vincularse contigo." />

    @if (bienvenida()) {
      <div class="card mb-6 bg-gradient-to-br from-leaf-100 to-peach-100">
        <p class="text-lg font-extrabold">¡Bienvenido a Florece! 🌱</p>
        <p class="mt-1 text-sm text-ink">
          Completa tu perfil y define tu horario en <b>Agenda</b>. Después comparte tu código con tus pacientes para que se vinculen desde la app.
        </p>
      </div>
    }

    <app-error [message]="error()" />

    @if (!profile()) {
      <app-skeleton-cards [count]="2" grid="lg:grid-cols-2" />
    } @else {
      <div class="grid gap-6 lg:grid-cols-3">
        <section class="card lg:col-span-2">
          <form class="grid gap-4 sm:grid-cols-2" (ngSubmit)="save()">
            <div class="sm:col-span-2">
              <label class="label" for="name">Nombre completo</label>
              <input id="name" class="input" name="name" [(ngModel)]="form.fullName" />
            </div>
            <div>
              <label class="label" for="license">Cédula profesional</label>
              <input id="license" class="input" name="license" [(ngModel)]="form.licenseNumber" />
            </div>
            <div>
              <label class="label" for="specialties">Especialidades</label>
              <input id="specialties" class="input" name="specialties" [(ngModel)]="specialties" placeholder="Ansiedad, autoestima" />
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="bio">Sobre mí</label>
              <textarea id="bio" class="input min-h-28" name="bio" maxlength="1000" [(ngModel)]="form.bio"
                placeholder="Cuéntales a tus pacientes cómo trabajas."></textarea>
            </div>
            <div>
              <label class="label" for="minutes">Duración de la sesión (min)</label>
              <input id="minutes" class="input" type="number" min="20" max="120" name="minutes" [(ngModel)]="form.sessionMinutes" />
            </div>
            <div>
              <label class="label" for="price">Precio por sesión</label>
              <div class="flex gap-2">
                <input id="price" class="input" type="number" min="0" name="price" [(ngModel)]="price" />
                <input class="input w-24 uppercase" name="currency" maxlength="3" [(ngModel)]="form.currency" aria-label="Moneda" />
              </div>
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="meet">Enlace fijo de videollamada (opcional)</label>
              <input id="meet" class="input" name="meet" placeholder="https://meet.google.com/…" [(ngModel)]="form.defaultMeetingUrl" />
              <p class="mt-1 text-xs text-muted">Se propondrá automáticamente al confirmar cada cita.</p>
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="tz">Zona horaria</label>
              <input id="tz" class="input" name="tz" [(ngModel)]="form.timezone" />
              <p class="mt-1 text-xs text-muted">Tu navegador está en {{ browserTimezone }}.</p>
            </div>
            <div class="flex items-center justify-end gap-3 sm:col-span-2">
              @if (saved()) {
                <span class="text-sm font-bold text-leaf-700">✓ Guardado</span>
              }
              <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar cambios' }}</button>
            </div>
          </form>
        </section>

        <aside class="space-y-6">
          <section class="card bg-gradient-to-br from-leaf-500 to-leaf-700 text-white">
            <p class="text-sm font-bold opacity-90">Código de vinculación</p>
            <p class="mt-2 font-mono text-3xl font-extrabold tracking-wider">{{ profile()!.linkCode }}</p>
            <p class="mt-2 text-xs opacity-90">Tus pacientes lo escriben en la app para vincularse contigo.</p>
            <button class="btn mt-4 bg-white/20 text-white hover:bg-white/30" (click)="rotate()">
              <app-icon name="refresh" size="sm" /> Generar otro código
            </button>
            <p class="mt-2 text-xs opacity-80">Los pacientes ya vinculados no se ven afectados.</p>
          </section>
          <section class="card">
            <p class="font-bold">Estado de la cuenta</p>
            <p class="mt-1 text-sm text-muted">{{ profile()!.verified ? '✓ Cédula verificada por Florece' : 'Cédula pendiente de verificación' }}</p>
          </section>
        </aside>
      </div>
    }
  `,
})
export class Profile implements OnInit {
  private readonly api = inject(ApiService);

  readonly bienvenida = input<string>();

  protected readonly profile = signal<PsyProfile | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected form: Partial<PsyProfile> = {};
  protected specialties = '';
  protected price = 0;

  async ngOnInit() {
    try {
      this.fill(await this.api.get<PsyProfile>('/psy/me'));
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos cargar tu perfil.'));
    }
  }

  protected async save() {
    this.error.set(null);
    this.saving.set(true);
    try {
      const updated = await this.api.patch<PsyProfile>('/psy/me', {
        fullName: this.form.fullName,
        licenseNumber: this.form.licenseNumber,
        specialties: this.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        bio: this.form.bio ?? '',
        sessionMinutes: Number(this.form.sessionMinutes),
        sessionPriceCents: Math.round(Number(this.price) * 100),
        currency: (this.form.currency ?? 'MXN').toUpperCase(),
        timezone: this.form.timezone,
        defaultMeetingUrl: this.form.defaultMeetingUrl ?? '',
      });
      this.fill(updated);
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos guardar tu perfil.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async rotate() {
    if (!confirm('¿Generar un código nuevo? El anterior dejará de funcionar para vincular a nuevas personas.')) return;
    try {
      this.fill(await this.api.post<PsyProfile>('/psy/me/link-code'));
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  private fill(profile: PsyProfile) {
    this.profile.set(profile);
    this.form = { ...profile, bio: profile.bio ?? '', defaultMeetingUrl: profile.defaultMeetingUrl ?? '' };
    this.specialties = profile.specialties.join(', ');
    this.price = profile.sessionPriceCents / 100;
  }
}
