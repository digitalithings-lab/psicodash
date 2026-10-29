import { Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from './icon';

// Campo de contraseña con botón para mostrarla u ocultarla.
@Component({
  selector: 'app-password-field',
  imports: [FormsModule, Icon],
  template: `
    <div class="relative">
      <input
        [id]="inputId()"
        class="input pr-12"
        [type]="visible() ? 'text' : 'password'"
        [name]="inputId()"
        [autocomplete]="autocomplete()"
        [attr.aria-describedby]="describedBy() || null"
        [(ngModel)]="value"
        required
      />
      <button
        type="button"
        class="btn-icon absolute right-1 top-1/2 size-9 -translate-y-1/2"
        (click)="visible.set(!visible())"
        [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        [attr.aria-pressed]="visible()"
        [attr.aria-controls]="inputId()"
      >
        <app-icon [name]="visible() ? 'eyeSlash' : 'eye'" />
      </button>
    </div>
  `,
})
export class PasswordField {
  readonly value = model('');
  readonly inputId = input('password');
  readonly autocomplete = input('current-password');
  readonly describedBy = input('');
  protected readonly visible = signal(false);
}
