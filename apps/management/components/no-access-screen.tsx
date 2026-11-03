'use client';

import { signOut } from 'next-auth/react';
import { CloudOff, Lock } from 'lucide-react';
import { Button } from '@archmage/ui';

/** Full-screen block when the signed-in user may not use the app, or channeling can't be reached. */
export function NoAccessScreen({ reason, email }: { reason: 'denied' | 'unavailable'; email?: string | null }) {
  const denied = reason === 'denied';
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 pt-safe pb-safe">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {denied ? <Lock className="h-7 w-7" /> : <CloudOff className="h-7 w-7" />}
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold">{denied ? 'No access to Management' : "Can't reach channeling"}</h1>
          <p className="text-sm text-muted-foreground">
            {denied
              ? 'Your account is not allowed to use this app. Ask an admin to turn on “Sign in to Management app” for your user group.'
              : 'Access is checked with channeling, which is not responding. Try again in a moment.'}
          </p>
          {email && <p className="text-xs text-muted-foreground">Signed in as {email}</p>}
        </div>
        <div className="flex w-full flex-col gap-2">
          {!denied && (
            <Button type="button" className="h-11" onClick={() => window.location.reload()}>
              Try again
            </Button>
          )}
          <Button
            type="button"
            variant={denied ? 'default' : 'outline'}
            className="h-11"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
