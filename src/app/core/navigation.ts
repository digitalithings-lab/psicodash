import { Router } from '@angular/router';

// Error al cargar una pantalla porque la página quedó con archivos de un despliegue anterior.
export function isStaleBundleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|Loading chunk|MIME type|Unexpected token '<'/i.test(message);
}

const RELOAD_KEY = 'florece.panel.reloadedAt';

// Recarga la página en esa dirección, pero como mucho una vez cada 30 s para no entrar en un bucle.
export function reloadTo(url: string): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sin sessionStorage se recarga igual
  }
  window.location.assign(url);
  return true;
}

// Va a una pantalla; si la navegación falla (p. ej. tras un despliegue), recarga la página completa en esa dirección.
export async function goTo(router: Router, url: string): Promise<void> {
  try {
    if (await router.navigateByUrl(url)) return;
  } catch {
    // se resuelve con la recarga de abajo
  }
  reloadTo(url);
}
