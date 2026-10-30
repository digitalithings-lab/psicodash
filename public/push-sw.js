// Service worker del panel: recibe los avisos push aunque el panel esté cerrado.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Florece', {
      body: data.body || 'Tienes una novedad en tu panel.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: 'florece-cita',
      renotify: true,
      data: { url: data.url || '/agenda' },
    }),
  );
});

// Al tocar el aviso: enfoca el panel si ya está abierto; si no, lo abre en la ruta del aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/agenda', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.focus().then((w) => w.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
