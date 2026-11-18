'use client';

import { useEffect, useState } from 'react';
import type { Session } from 'next-auth';
import { Profile } from './profile';
import MobileNavClient from './mobile-nav-client';

export function HeaderClientControls({ session }: { session: Session | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <>
        <div className="sm:hidden h-10 w-10" aria-hidden />
        <div className="shrink-0 h-9 w-9" aria-hidden />
      </>
    );
  }

  return (
    <>
      <MobileNavClient session={session} />
      <div className="shrink-0"><Profile /></div>
    </>
  );
}
