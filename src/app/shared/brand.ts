import { Component, input } from '@angular/core';

// Logotipo de Florece: un brote dentro de un círculo verde, con el nombre al lado.
@Component({
  selector: 'app-brand',
  template: `
    <span class="inline-flex items-center gap-2.5">
      <span
        class="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf-500 to-leaf-900 text-white shadow-soft"
        [class]="size() === 'lg' ? 'size-12' : 'size-9'"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" [class]="size() === 'lg' ? 'size-7' : 'size-5'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20v-8" />
          <path d="M12 12c0-3.5 2.5-6 7-6 0 4-2.5 6.5-7 6z" fill="currentColor" fill-opacity="0.25" />
          <path d="M12 14c0-3-2-5-6-5 0 3.5 2 5.5 6 5z" fill="currentColor" fill-opacity="0.25" />
        </svg>
      </span>
      <span class="font-extrabold tracking-tight" [class]="(size() === 'lg' ? 'text-2xl ' : 'text-lg ') + (inverse() ? 'text-white' : 'text-ink')">
        Florece
      </span>
    </span>
  `,
})
export class Brand {
  readonly size = input<'md' | 'lg'>('md');
  readonly inverse = input(false);
}
