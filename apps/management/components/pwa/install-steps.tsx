'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  canPromptInstall,
  installPlatform,
  isInstalled,
  onInstallChange,
  promptInstall,
  type InstallPlatform
} from '@/lib/pwa/install';

/** The iOS Share glyph, so the step matches what's on screen. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline size-5 align-[-3px] text-[#007AFF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-secondary p-4 text-[15px] leading-6">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

export const PRIMARY_BUTTON =
  'flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 active:opacity-90 disabled:opacity-50';

/** Install steps for the phone or tablet this is opened on (the send12 caddie's install page). */
export function InstallSteps() {
  const [info, setInfo] = useState<{ platform: InstallPlatform; installed: boolean; canPrompt: boolean } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const refresh = () =>
      setInfo({ platform: installPlatform(), installed: isInstalled(), canPrompt: canPromptInstall() });
    refresh();
    return onInstallChange(refresh);
  }, []);

  const openApp = (
    <Link href="/dashboard" className={PRIMARY_BUTTON}>
      Open Management <ArrowRight className="size-5" aria-hidden />
    </Link>
  );

  if (!info) return null;

  if (info.installed || done) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{done ? 'Installed 🎉' : 'You’re in the app'}</h2>
        <p className="text-[15px] text-muted-foreground">Open Management from your home screen and sign in.</p>
        {openApp}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Install the app</h2>

      {info.platform === 'android' || info.platform === 'desktop' ? (
        info.canPrompt ? (
          <>
            <p className="text-[15px] text-muted-foreground">
              One tap and Management is on your {info.platform === 'android' ? 'home screen' : 'computer'}.
            </p>
            <button type="button" className={PRIMARY_BUTTON} onClick={async () => setDone(await promptInstall())}>
              Install Management
            </button>
          </>
        ) : (
          <ol className="space-y-2">
            {info.platform === 'android' ? (
              <>
                <Step n={1}>Open the browser menu <b>⋮</b> (top right in Chrome).</Step>
                <Step n={2}>Tap <b>Install app</b> or <b>Add to Home screen</b>.</Step>
                <Step n={3}>Open <b>Management</b> from your home screen and sign in.</Step>
              </>
            ) : (
              <>
                <Step n={1}>In Chrome or Edge, click the install icon at the right of the address bar.</Step>
                <Step n={2}>Or open the browser menu and choose <b>Install Management</b>.</Step>
              </>
            )}
          </ol>
        )
      ) : info.platform === 'ios-safari' ? (
        <ol className="space-y-2">
          <Step n={1}>Tap the Share button <ShareIcon /> (bottom of Safari on iPhone, top right on iPad).</Step>
          <Step n={2}>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</Step>
          <Step n={3}>Open <b>Management</b> from your home screen and sign in.</Step>
        </ol>
      ) : (
        <ol className="space-y-2">
          <Step n={1}>On iPhone and iPad, apps install from <b>Safari</b>: copy this page’s link and open it in Safari.</Step>
          <Step n={2}>Tap Share <ShareIcon /> → <b>Add to Home Screen</b>.</Step>
        </ol>
      )}

      <div className="pt-2">
        <p className="mb-2 text-center text-xs text-muted-foreground">Or use it in the browser for now</p>
        {openApp}
      </div>
    </div>
  );
}
