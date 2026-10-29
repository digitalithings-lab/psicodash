import { afterNextRender, Component, ElementRef, HostListener, input, OnDestroy, output, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="eyebrow mb-1">{{ eyebrow() }}</p>
        }
        <h1 class="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1.5 text-muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2"><ng-content /></div>
    </header>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly eyebrow = input<string>();
}

// Tarjetas que "respiran" mientras llegan los datos.
@Component({
  selector: 'app-skeleton-cards',
  template: `
    <div class="grid gap-4" [class]="grid()" aria-busy="true" aria-live="polite">
      <span class="sr-only">Cargando…</span>
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

// Cifra destacada de un tablero. Si tiene enlace, toda la tarjeta lleva ahí.
@Component({
  selector: 'app-stat',
  imports: [RouterLink, NgTemplateOutlet, Icon],
  template: `
    @if (link()) {
      <a [routerLink]="link()" class="card-interactive group flex h-full items-center gap-4">
        <ng-container [ngTemplateOutlet]="body" />
        <app-icon name="arrowRight" size="sm" class="ml-auto inline-flex text-soft transition-transform duration-200 group-hover:translate-x-1 group-hover:text-leaf-700" />
      </a>
    } @else {
      <div class="card flex h-full items-center gap-4">
        <ng-container [ngTemplateOutlet]="body" />
      </div>
    }
    <ng-template #body>
      <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl" [class]="tint()" aria-hidden="true">{{ emoji() }}</span>
      <div class="min-w-0">
        <p class="text-3xl font-extrabold leading-none tracking-tight tabular-nums">{{ value() }}</p>
        <p class="mt-1.5 text-sm text-muted">{{ label() }}</p>
      </div>
    </ng-template>
  `,
})
export class Stat {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly emoji = input('🌱');
  readonly tint = input('bg-leaf-100');
  readonly link = input<string | null>(null);
}

@Component({
  selector: 'app-empty',
  template: `
    <div class="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span class="mb-2 flex size-16 items-center justify-center rounded-full bg-sand text-3xl" aria-hidden="true">{{ emoji() }}</span>
      <p class="font-extrabold text-ink">{{ title() }}</p>
      <p class="max-w-md text-sm text-muted">{{ text() }}</p>
      <div class="mt-2"><ng-content /></div>
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
  imports: [Icon],
  template: `
    @if (message()) {
      <div
        class="mb-4 flex animate-fade-in items-start gap-3 rounded-2xl border border-danger-500/20 bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-500"
        role="alert"
      >
        <app-icon name="alert" class="mt-px inline-flex" />
        <span>{{ message() }}</span>
      </div>
    }
  `,
})
export class ErrorBanner {
  readonly message = input<string | null>(null);
}

let modalCount = 0;

@Component({
  selector: 'app-modal',
  imports: [Icon],
  template: `
    <div class="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center" (click)="closed.emit()">
      <div
        #panel
        class="max-h-[90dvh] w-full max-w-xl animate-pop-in overflow-y-auto rounded-3xl border border-line bg-background p-6 shadow-pop outline-none"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        tabindex="-1"
        (click)="$event.stopPropagation()"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <h2 [id]="titleId" class="text-xl font-extrabold tracking-tight">{{ title() }}</h2>
          <button type="button" class="btn-icon -mr-2 -mt-2" (click)="closed.emit()" aria-label="Cerrar">
            <app-icon name="x" />
          </button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class Modal implements OnDestroy {
  readonly title = input.required<string>();
  readonly closed = output<void>();
  protected readonly titleId = `modal-title-${++modalCount}`;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly previousFocus = document.activeElement as HTMLElement | null;

  constructor() {
    // Mientras está abierta, la página de atrás no se desplaza y el foco entra a la ventana.
    document.body.style.overflow = 'hidden';
    afterNextRender(() => this.panel().nativeElement.focus());
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    this.previousFocus?.focus?.();
  }

  // La tecla Escape también cierra la ventana.
  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.closed.emit();
  }
}
