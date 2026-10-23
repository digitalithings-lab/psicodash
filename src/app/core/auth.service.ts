import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './config';
import { AuthResponse, User } from './types';

const REFRESH_KEY = 'florece.panel.refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // El access token vive solo en memoria; el refresh token en el navegador para no pedir login en cada visita.
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly isPsychologist = computed(() => this.user()?.role === 'PSYCHOLOGIST');
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  get token(): string | null {
    return this.accessToken;
  }

  // Al abrir el panel, recupera la sesión si el refresh token sigue vigente.
  async restore(): Promise<void> {
    if (localStorage.getItem(REFRESH_KEY)) await this.refresh();
    this.ready.set(true);
  }

  async login(email: string, password: string): Promise<User> {
    return this.save(await firstValueFrom(this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password })));
  }

  async registerPsychologist(body: {
    email: string;
    password: string;
    fullName: string;
    licenseNumber: string;
    specialties: string[];
    timezone: string;
  }): Promise<User> {
    return this.save(
      await firstValueFrom(
        this.http.post<AuthResponse>(`${API_URL}/auth/register-psychologist`, { ...body, consents: ['TERMS', 'PRIVACY'] }),
      ),
    );
  }

  // Una sola renovación a la vez aunque varias peticiones fallen juntas.
  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) return false;
        try {
          this.save(await firstValueFrom(this.http.post<AuthResponse>(`${API_URL}/auth/refresh`, { refreshToken })));
          return true;
        } catch {
          this.clear();
          return false;
        }
      })().finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, { refreshToken })).catch(() => undefined);
    }
    this.clear();
    await this.router.navigateByUrl('/login');
  }

  home(): string {
    return this.isAdmin() ? '/admin' : '/inicio';
  }

  private save(response: AuthResponse): User {
    this.accessToken = response.accessToken;
    localStorage.setItem(REFRESH_KEY, response.refreshToken);
    this.user.set(response.user);
    return response.user;
  }

  private clear(): void {
    this.accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
    this.user.set(null);
  }
}
