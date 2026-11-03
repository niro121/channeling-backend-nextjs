'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ChevronRight, Download, LogOut } from 'lucide-react';
import { isInstalled, onInstallChange } from '@/lib/pwa/install';

/** "Install app" (hidden once installed) and sign out. */
export function AccountActions() {
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const refresh = () => setInstalled(isInstalled());
    refresh();
    return onInstallChange(refresh);
  }, []);

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {!installed && (
        <li>
          <Link href="/install" className="flex items-center gap-3 px-4 py-4 active:bg-muted">
            <Download className="h-5 w-5 text-primary" aria-hidden />
            <span className="flex-1 font-medium">Install app</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      )}
      <li>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 px-4 py-4 text-left text-destructive active:bg-muted"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          <span className="flex-1 font-medium">Sign out</span>
        </button>
      </li>
    </ul>
  );
}
