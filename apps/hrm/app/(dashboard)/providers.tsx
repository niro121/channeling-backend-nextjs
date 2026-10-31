'use client';

import { TooltipProvider } from '@archmage/ui';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

export default function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <TooltipProvider>{children}</TooltipProvider>
    </SessionProvider>
  );
}
