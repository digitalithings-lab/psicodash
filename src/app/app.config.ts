import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
import { isStaleBundleError, reloadTo } from './core/navigation';
import { ThemeService } from './core/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Tras un despliegue nuevo, los archivos de la versión anterior ya no existen: se recarga la página.
      withNavigationErrorHandler((navError) => {
        if (isStaleBundleError(navError.error)) reloadTo(navError.url);
      }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Recupera la sesión guardada antes de decidir a qué pantalla ir.
    provideAppInitializer(() => inject(AuthService).restore()),
    provideAppInitializer(() => void inject(ThemeService)),
  ],
};
