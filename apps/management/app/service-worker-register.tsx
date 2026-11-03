'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/push';

/** Registers /sw.js everywhere (it skips file caching on localhost, so push can be tested in dev). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
