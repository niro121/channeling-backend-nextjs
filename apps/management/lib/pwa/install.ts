/**
 * Installing the PWA ("Add to Home Screen"). Android and desktop Chrome/Edge offer a one-tap install
 * (the `beforeinstallprompt` event, kept here for whichever Install button is tapped); iPhone and
 * iPad need Share → Add to Home Screen in Safari. Same approach as the send12 caddie.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export type InstallPlatform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Running from the home screen (standalone), not in a browser tab. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function installPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac — touch points give it away.
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(ua) ? 'ios-other' : 'ios-safari';
  return /Android/i.test(ua) ? 'android' : 'desktop';
}

/** The browser can install it in one tap (Android / desktop Chrome and Edge). */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Show the browser's install dialog; true if they installed. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  notify();
  return outcome === 'accepted';
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
