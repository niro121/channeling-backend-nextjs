'use client';

import { useEffect } from 'react';
import { reloadOnceForStaleBuild } from '@/components/pwa/app-update';
import { isStaleBuildError } from '@/lib/pwa/version';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleBuildError(error.message) || error.name === 'ChunkLoadError';

  useEffect(() => {
    console.error(error);
    // The app was updated while this screen was open: load the new version instead.
    if (stale) reloadOnceForStaleBuild();
  }, [error, stale]);

  return (
    <main className="p-4 md:p-6">
      <div className="mb-8 space-y-4">
        <h1 className="font-semibold text-lg md:text-2xl">
          {stale ? 'Updating to the latest version…' : 'Something went wrong'}
        </h1>
        {!stale && (
          <button onClick={reset} className="text-sm text-primary underline">
            Try again
          </button>
        )}
      </div>
    </main>
  );
}
