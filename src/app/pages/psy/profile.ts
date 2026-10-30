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
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="label" for="minutes">Sesión (min)</label>
                <input id="minutes" class="input" type="number" min="20" max="120" name="minutes" [(ngModel)]="form.sessionMinutes" />
              </div>
              <div>
                <label class="label" for="buffer">Descanso (min)</label>
                <input id="buffer" class="input" type="number" min="0" max="60" name="buffer" aria-describedby="buffer-hint" [(ngModel)]="form.bufferMinutes" />
              </div>
              <p id="buffer-hint" class="hint col-span-2">Tiempo libre entre una cita y la siguiente.</p>
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

        <!-- Agenda pública: tu sitio web muestra tu horario y la gente agenda sin cuenta. -->
        <section class="card lg:col-span-2" aria-labelledby="agenda-web">
          <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="agenda-web" class="text-lg font-extrabold">Agenda en tu sitio web</h2>
              <p class="mt-1 text-sm text-muted">
                Tus horarios de <b>Agenda</b> se muestran en tu web y cualquier persona puede pedir una cita, sin descargar la app.
                Nunca se ofrece una hora que ya está ocupada.
              </p>
            </div>
            <label class="inline-flex cursor-pointer items-center gap-3">
              <input type="checkbox" class="peer sr-only" name="publicOn" [(ngModel)]="publicForm.enabled" />
              <span
                class="relative h-7 w-12 rounded-full bg-line-strong transition-colors after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow-soft after:transition-transform peer-checked:bg-leaf-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                aria-hidden="true"
              ></span>
              <span class="text-sm font-bold">{{ publicForm.enabled ? 'Activada' : 'Desactivada' }}</span>
            </label>
          </div>

          <form class="grid gap-4 sm:grid-cols-2" (ngSubmit)="savePublic()">
            <div>
              <label class="label" for="slug">Enlace de tu agenda</label>
              <input id="slug" class="input lowercase" name="slug" placeholder="nathalie-vera" maxlength="40" aria-describedby="slug-hint" [(ngModel)]="publicForm.slug" />
              <p id="slug-hint" class="hint">Minúsculas, números y guiones. Tu web lo usa para encontrar tu horario.</p>
            </div>
            <div>
              <label class="label" for="phone">Tu WhatsApp para avisos</label>
              <input id="phone" class="input" name="phone" type="tel" inputmode="tel" placeholder="+50760000000" aria-describedby="phone-hint" [(ngModel)]="publicForm.phone" />
              <p id="phone-hint" class="hint">Con código de país y sin espacios. Te avisamos de cada cita nueva.</p>
            </div>

            <div class="rounded-2xl border border-line bg-background p-4 sm:col-span-2">
              <p class="flex items-center gap-2 text-sm font-bold"><app-icon name="sparkles" size="sm" /> Activa los avisos por WhatsApp (gratis, 2 minutos)</p>
              <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>Guarda en tus contactos el número <b class="text-ink">+34 644 33 66 63</b> (CallMeBot).</li>
                <li>Desde tu WhatsApp, envíale: <code class="rounded bg-sand px-1.5 py-0.5 text-xs text-ink">I allow callmebot to send me messages</code></li>
                <li>El bot te responde con tu <b class="text-ink">APIKEY</b>. Escríbela aquí abajo y guarda.</li>
              </ol>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div class="flex-1">
                  <label class="label" for="wakey">Clave (APIKEY) de TextMeBot o CallMeBot</label>
                  <input id="wakey" class="input font-mono" name="wakey" autocomplete="off" placeholder="Tu APIKEY" [(ngModel)]="publicForm.whatsappKey" />
                </div>
                <button type="button" class="btn-secondary" [disabled]="testing() || !profile()!.notifyPhone" (click)="testNotify()">
                  {{ testing() ? 'Enviando…' : 'Enviar mensaje de prueba' }}
                </button>
              </div>
              @if (testResult()) {
                <p class="mt-2 text-sm font-bold text-leaf-700" role="status">{{ testResult() }}</p>
              }
              <p class="hint">
                CallMeBot es gratuito para avisos personales; TextMeBot (textmebot.com) es de pago y más estable. Sirve la clave de cualquiera de
                los dos. Guarda antes de probar.
              </p>
            </div>
            @if (profile()!.publicBookingEnabled && profile()!.publicSlug) {
              <p class="rounded-2xl bg-leaf-50 px-4 py-3 text-sm sm:col-span-2">
                <span class="font-bold text-leaf-700">✓ Tu agenda está publicada.</span>
                Tu web la consulta en <code class="rounded bg-surface px-1.5 py-0.5 text-xs">/public/booking/{{ profile()!.publicSlug }}</code>.
              </p>
            }
            <div class="flex items-center justify-end gap-3 sm:col-span-2">
              @if (publicSaved()) {
                <span class="text-sm font-bold text-leaf-700">✓ Guardado</span>
              }
              <button class="btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar agenda web' }}</button>
            </div>
          </form>
        </section>
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
  protected readonly publicSaved = signal(false);
  protected form: Partial<PsyProfile> = {};
  protected readonly testing = signal(false);
  protected readonly testResult = signal<string | null>(null);
  protected publicForm = { enabled: false, slug: '', phone: '', whatsappKey: '' };
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
        bufferMinutes: Number(this.form.bufferMinutes ?? 0),
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

  protected async savePublic() {
    this.error.set(null);
    this.saving.set(true);
    try {
      this.fill(
        await this.api.patch<PsyProfile>('/psy/me', {
          publicBookingEnabled: this.publicForm.enabled,
          publicSlug: this.publicForm.slug.trim().toLowerCase(),
          notifyPhone: this.publicForm.phone.replace(/[\s()-]/g, ''),
          notifyWhatsappKey: this.publicForm.whatsappKey.trim(),
        }),
      );
      this.publicSaved.set(true);
      setTimeout(() => this.publicSaved.set(false), 2500);
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos guardar tu agenda web.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async testNotify() {
    this.error.set(null);
    this.testResult.set(null);
    this.testing.set(true);
    try {
      const { channel } = await this.api.post<{ channel: 'whatsapp' | 'sms' }>('/psy/me/notify-test');
      this.testResult.set(channel === 'whatsapp' ? '✓ Te enviamos un WhatsApp de prueba.' : '✓ Te enviamos un SMS de prueba.');
    } catch (err) {
      this.error.set(errorMessage(err, 'No pudimos enviar el mensaje de prueba.'));
    } finally {
      this.testing.set(false);
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
    this.publicForm = {
      enabled: profile.publicBookingEnabled,
      slug: profile.publicSlug ?? '',
      phone: profile.notifyPhone ?? '',
      whatsappKey: profile.notifyWhatsappKey ?? '',
    };
  }
}
