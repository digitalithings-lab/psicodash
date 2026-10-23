import { Component, HostListener, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-ink">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2"><ng-content /></div>
    </header>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

// Tarjetas grises que "respiran" mientras llegan los datos.
@Component({
  selector: 'app-skeleton-cards',
  template: `
    <div class="grid gap-4" [class]="grid()" aria-busy="true" aria-label="Cargando">
      @for (i of items(); track i) {
        <div class="card space-y-3">
          <div class="skeleton h-5 w-1/2"></div>
          <div class="skeleton h-4 w-full"></div>
          <div class="skeleton h-4 w-3/4"></div>
        </div>
      }
    </div>
  `,
})
export class SkeletonCards {
  readonly count = input(3);
  readonly grid = input('md:grid-cols-3');
  protected items() {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}

@Component({
  selector: 'app-empty',
  template: `
    <div class="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span class="text-5xl">{{ emoji() }}</span>
      <p class="font-bold text-ink">{{ title() }}</p>
      <p class="max-w-md text-sm text-muted">{{ text() }}</p>
      <ng-content />
    </div>
  `,
})
export class Empty {
  readonly emoji = input('🌱');
  readonly title = input.required<string>();
  readonly text = input('');
}

@Component({
  selector: 'app-error',
  template: `
    @if (message()) {
      <div class="rounded-2xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-500" role="alert">{{ message() }}</div>
    }
  `,
})
export class ErrorBanner {
  readonly message = input<string | null>(null);
}

@Component({
  selector: 'app-modal',
  imports: [Icon],
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" (click)="closed.emit()">
      <div
        class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-cream p-6 shadow-card"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="$event.stopPropagation()"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <h2 class="text-xl font-extrabold">{{ title() }}</h2>
          <button class="rounded-full p-1 text-muted hover:bg-sand" (click)="closed.emit()" aria-label="Cerrar">
            <app-icon name="x" />
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class Modal {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  // La tecla Escape también cierra la ventana.
  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.closed.emit();
  }
}
