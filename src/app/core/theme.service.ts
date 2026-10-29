import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'florece.panel.theme';

// Claro, oscuro o el del sistema. index.html aplica el guardado antes de que Angular arranque, para que no parpadee.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.read());
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.media.addEventListener('change', () => {
      if (this.mode() === 'system') this.apply();
    });
    this.apply();
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // sin almacenamiento el tema dura solo esta visita
    }
    this.apply();
  }

  private apply() {
    const dark = this.mode() === 'dark' || (this.mode() === 'system' && this.media.matches);
    document.documentElement.classList.toggle('dark', dark);
  }

  private read(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // se usa el del sistema
    }
    return 'system';
  }
}
