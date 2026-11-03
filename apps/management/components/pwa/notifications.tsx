'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Loader2, X } from 'lucide-react';
import { Button } from '@archmage/ui';
import {
  disablePush,
  enablePush,
  getPushConfig,
  pushState,
  refreshPushRegistration,
  sendTestPush,
  setAppBadge,
  type PushState
} from '@/lib/pwa/push';

const DISMISS_KEY = 'management_push_dismissed_until';
const DISMISS_DAYS = 7;

const STATE_TEXT: Record<PushState, string> = {
  on: 'You get a notification when a request needs your approval.',
  off: 'Get a notification when a request needs your approval.',
  blocked: 'Notifications are blocked. Allow them for this site in your browser or phone settings.',
  'needs-install': 'On iPhone and iPad, notifications only work in the installed app. Install it to your Home Screen first.',
  unsupported: "This browser can't show notifications."
};

function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => {
    void pushState().then(setState);
  }, []);
  return [state, setState] as const;
}

/** Account page: turn notifications on or off, and send a test. */
export function NotificationSettings() {
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!state) return null;

  const run = async (fn: () => Promise<PushState | void>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await fn();
      if (next) setState(next);
      if (done) setMessage(done);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {state === 'on' ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">{STATE_TEXT[state]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state === 'off' && (
              <Button type="button" disabled={busy} onClick={() => void run(enablePush)}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Turn on notifications
              </Button>
            )}
            {state === 'on' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(async () => void (await sendTestPush()), 'Test notification sent.')}
                >
                  Send a test
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => void run(disablePush)}>
                  Turn off
                </Button>
              </>
            )}
            {state === 'needs-install' && (
              <Button asChild>
                <Link href="/install">How to install</Link>
              </Button>
            )}
          </div>
          {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function dismissedUntil(): number {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Top of the Approvals screen while notifications are off. "Not now" hides it for a week. */
export function NotificationsPrompt() {
  const [state, setState] = usePushState();
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHidden(Date.now() < dismissedUntil());
  }, []);

  if (hidden || (state !== 'off' && state !== 'needs-install')) return null;

  function notNow() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // storage unavailable — it just shows again next time
    }
    setHidden(true);
  }

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      setState(await enablePush());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not turn on notifications.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-secondary p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Bell className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{state === 'needs-install' ? 'Install to get notifications' : 'Turn on notifications'}</p>
        <p className="text-sm text-muted-foreground">{STATE_TEXT[state]}</p>
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        <div className="mt-3 flex gap-2">
          {state === 'off' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void turnOn()}
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Turn on
            </button>
          ) : (
            <Link
              href="/install"
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90"
            >
              Install
            </Link>
          )}
          <button type="button" onClick={notNow} className="h-9 rounded-full px-4 text-sm font-medium text-muted-foreground">
            Not now
          </button>
        </div>
      </div>
      <button type="button" onClick={notNow} className="-m-1 p-1 text-muted-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Mounted in the signed-in layout: links this device to the signed-in user (no prompt)
 * and syncs the app icon badge with the requests waiting for them.
 */
export function PushSync() {
  useEffect(() => {
    void refreshPushRegistration();
    getPushConfig()
      .then((config) => {
        if (typeof config.badge === 'number') setAppBadge(config.badge);
      })
      .catch(() => {});
  }, []);
  return null;
}
