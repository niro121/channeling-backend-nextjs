'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * When an open tab's session is superseded by a newer login, redirect to the
 * block screen so the user can acknowledge and sign out cleanly.
 */
export function SessionInvalidationGuard({
  children
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.error !== 'SessionInvalidated') return;
    if (pathname === '/session-ended') return;
    router.replace('/session-ended');
  }, [session?.error, status, pathname, router]);

  return <>{children}</>;
}
