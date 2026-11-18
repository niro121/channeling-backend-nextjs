'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { registerServiceWorker } from '@/lib/pwa/push';
import { APP_VERSION, BUILD_ID, compareVersions, isStaleBuildError, type ServerVersion } from '@/lib/pwa/version';

const CHECK_EVERY_MS = 30 * 60_000;
const RELOAD_GUARD_KEY = 'management_stale_reload_at';

/** Activates a waiting service worker (if any), then reloads onto the new build. */
async function applyUpdate(): Promise<void> {
  const reg = await registerServiceWorker();
  const waiting = reg?.waiting;
  if (waiting && navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
      waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(done, 3000); // don't hang if the worker never takes over
    });
  }
  window.location.reload();
}

/** Reload at most once a minute, so a real outage can't loop. */
function reloadOnceForStaleBuild() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // storage unavailable — still reload
  }
  void applyUpdate();
}

export { reloadOnceForStaleBuild };

/**
 * Keeps an installed app on the current build:
 * - checks /api/version when the app opens, comes back to the front, and every 30 minutes;
 * - a newer build shows an "Update" banner; MIN_APP_VERSION above ours updates straight away;
 * - errors from a replaced build (old chunks, unknown server actions) reload once.
 */
export function AppUpdate() {
  const [available, setAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (BUILD_ID === 'dev' || checking.current) return;
    checking.current = true;
    try {
      const reg = await registerServiceWorker();
      void reg?.update().catch(() => {});
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) return;
      const server = (await res.json()) as ServerVersion;
      if (server.minVersion && compareVersions(APP_VERSION, server.minVersion) < 0) {
        setUpdating(true);
        await applyUpdate();
        return;
      }
      if (server.buildId && server.buildId !== BUILD_ID) setAvailable(true);
    } catch {
      // offline — try again next time
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);

    const onError = (event: ErrorEvent) => {
      if (isStaleBuildError(event.message) || isStaleBuildError(event.error?.message)) reloadOnceForStaleBuild();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string; name?: string } | string | undefined;
      const message = typeof reason === 'string' ? reason : `${reason?.name ?? ''} ${reason?.message ?? ''}`;
      if (isStaleBuildError(message)) reloadOnceForStaleBuild();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [check]);

  if (!available && !updating) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <RefreshCw className="h-4 w-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">
          {updating ? 'Updating to the latest version…' : 'A new version is available.'}
        </p>
        {!updating && (
          <button
            type="button"
            onClick={() => {
              setUpdating(true);
              void applyUpdate();
            }}
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90"
          >
            Update
          </button>
        )}
        {updating && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
