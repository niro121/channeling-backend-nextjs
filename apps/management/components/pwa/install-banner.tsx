'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, X } from 'lucide-react';
import { canPromptInstall, installPlatform, isInstalled, onInstallChange, promptInstall } from '@/lib/pwa/install';

const DISMISS_KEY = 'management_install_dismissed_until';
const DISMISS_DAYS = 7;

function dismissedUntil(): number {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * "Install Management" at the top of the dashboard while it's open in a phone or tablet browser
 * (or a computer browser that can install it in one tap). "Not now" hides it for a week.
 */
export function InstallBanner() {
  const [hidden, setHidden] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [touchDevice, setTouchDevice] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setCanInstall(canPromptInstall());
      setTouchDevice(installPlatform() !== 'desktop');
      setHidden(isInstalled() || Date.now() < dismissedUntil());
    };
    refresh();
    return onInstallChange(refresh);
  }, []);

  if (hidden || !(touchDevice || canInstall)) return null;

  function notNow() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // storage unavailable — it just shows again next time
    }
    setHidden(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-secondary p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Download className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Install Management</p>
        <p className="text-sm text-muted-foreground">Open it from your home screen, like an app.</p>
        <div className="mt-3 flex gap-2">
          {canInstall ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:opacity-90"
            >
              Install
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
