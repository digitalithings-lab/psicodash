import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface PushStatus {
  enabled: boolean; // el servidor tiene claves VAPID
  publicKey: string;
  devices: number;
}

// Por qué este dispositivo no puede recibir avisos (o null si sí puede).
export type PushBlocker = 'unsupported' | 'ios-install' | 'denied' | null;

// Avisos push del navegador: registra el service worker y guarda la suscripción en el backend.
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly api = inject(ApiService);

  /** ¿Este navegador ya está suscrito? */
  readonly subscribed = signal(false);

  blocker(): PushBlocker {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const installed = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    if (ios && !installed) return 'ios-install';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return null;
  }

  async status(): Promise<PushStatus> {
    const status = await this.api.get<PushStatus>('/psy/me/push');
    this.subscribed.set(Boolean(await this.current()));
    return status;
  }

  async enable(publicKey: string): Promise<PushStatus> {
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('denied');
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
    const status = await this.api.post<PushStatus>('/psy/me/push', subscription.toJSON());
    this.subscribed.set(true);
    return status;
  }

  async disable(): Promise<PushStatus | null> {
    const subscription = await this.current();
    if (!subscription) return null;
    const status = await this.api.post<PushStatus>('/psy/me/push/remove', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    this.subscribed.set(false);
    return status;
  }

  test() {
    return this.api.post<{ devices: number }>('/psy/me/push/test');
  }

  private async current() {
    if (!('serviceWorker' in navigator)) return null;
    const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    return (await registration?.pushManager.getSubscription()) ?? null;
  }
}

function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
