/**
 * Web Push in the browser: permission, subscription and the app icon badge.
 * Ported from klv-mobile's web-pwa.ts; the server side is /api/push → channeling.
 */
import { installPlatform, isInstalled } from './install';

export type PushState =
  | 'unsupported' // this browser can't do web push
  | 'needs-install' // iPhone/iPad: only the Home Screen app can get notifications
  | 'blocked' // the user said no; only the browser's settings can undo it
  | 'off' // can ask
  | 'on';

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers /sw.js once; later calls reuse it. */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  registration ??= navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
    console.error('[management] service worker registration failed', error);
    return null;
  });
  return registration;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported';
  const platform = installPlatform();
  if ((platform === 'ios-safari' || platform === 'ios-other') && !isInstalled()) return 'needs-install';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

async function api<T = { success?: boolean; message?: string }>(body?: unknown): Promise<T> {
  const res = await fetch('/api/push', {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin'
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

type PushConfig = { enabled: boolean; publicKey: string | null; badge?: number };

export function getPushConfig(): Promise<PushConfig> {
  return api<PushConfig>();
}

async function subscribe(reg: ServiceWorkerRegistration): Promise<void> {
  const { enabled, publicKey } = await getPushConfig();
  if (!enabled || !publicKey) throw new Error('Notifications are not set up on the server yet.');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }));
  await api({ action: 'subscribe', subscription: sub.toJSON(), userAgent: navigator.userAgent });
}

/** Must run from a tap: iOS only shows the permission prompt in response to one. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return pushState();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const reg = await registerServiceWorker();
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;
  await subscribe(reg);
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api({ action: 'unsubscribe', endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return pushState();
}

/**
 * After sign-in: if permission was already granted, re-send the subscription silently so this
 * device is linked to whoever is signed in now. Never prompts.
 */
export async function refreshPushRegistration(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const reg = await registerServiceWorker();
  if (!reg) return;
  await navigator.serviceWorker.ready;
  await subscribe(reg).catch(() => {});
}

export function sendTestPush() {
  return api<{ success: boolean; sent?: number }>({ action: 'test' });
}

/** App icon badge (installed app); ignored where unsupported. */
export function setAppBadge(count: number): void {
  const nav = navigator as Navigator & {
    setAppBadge?: (n: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (count > 0) nav.setAppBadge?.(count).catch(() => {});
  else nav.clearAppBadge?.().catch(() => {});
}
