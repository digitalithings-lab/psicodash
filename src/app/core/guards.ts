import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './types';

// Solo deja pasar a quien tiene uno de los roles indicados; si no, lo manda a su inicio o al login.
export const requireRole =
  (...roles: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();
    if (!user) return router.parseUrl('/login');
    if (roles.includes(user.role)) return true;
    return router.parseUrl(user.role === 'USER' ? '/sin-acceso' : auth.home());
  };

export const guestOnly: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user() ? router.parseUrl(auth.home()) : true;
};
