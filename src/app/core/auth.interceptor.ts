import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError, TimeoutError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from './config';

// Añade el token a cada petición al backend y, si expiró, lo renueva una vez y reintenta.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith(API_URL) || req.url.includes('/auth/')) return next(req);

  const withToken = (request: HttpRequest<unknown>) =>
    auth.token ? request.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } }) : request;

  return next(withToken(req)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      return from(auth.refresh()).pipe(
        switchMap((ok) => {
          if (!ok) {
            void router.navigateByUrl('/login');
            return throwError(() => error);
          }
          return next(withToken(req));
        }),
      );
    }),
  );
};

// Mensaje legible a partir de un error del backend.
export function errorMessage(error: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.'): string {
  if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento.';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if (error.status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.';
    const message = error.error?.message;
    if (Array.isArray(message)) return String(message[0]);
    if (typeof message === 'string') return message;
  }
  return fallback;
}
