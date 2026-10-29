import { Component, inject } from '@angular/core';
import { ThemeMode, ThemeService } from '../core/theme.service';
import { Icon } from './icon';

const OPTIONS: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: 'light', icon: 'sun', label: 'Tema claro' },
  { mode: 'dark', icon: 'moon', label: 'Tema oscuro' },
  { mode: 'system', icon: 'monitor', label: 'Usar el tema del sistema' },
];

// Selector segmentado de tema: claro, oscuro o el del sistema.
@Component({
  selector: 'app-theme-toggle',
  imports: [Icon],
  template: `
    <div class="inline-flex rounded-full border border-line bg-sand p-1" role="radiogroup" aria-label="Tema">
      @for (option of options; track option.mode) {
        <button
          type="button"
          role="radio"
          class="flex size-8 cursor-pointer items-center justify-center rounded-full transition-all duration-200"
          [class]="theme.mode() === option.mode ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink'"
          [attr.aria-checked]="theme.mode() === option.mode"
          [attr.aria-label]="option.label"
          [title]="option.label"
          (click)="theme.set(option.mode)"
        >
          <app-icon [name]="option.icon" size="sm" />
        </button>
      }
    </div>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly options = OPTIONS;
}
