'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { SessionInvalidationGuard } from './session-invalidation-guard';

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider
      session={session}
      // Poll so an open tab notices when another login invalidated this session.
      refetchInterval={60}
      refetchOnWindowFocus
    >
      <SessionInvalidationGuard>
        <TooltipProvider>{children}</TooltipProvider>
      </SessionInvalidationGuard>
    </SessionProvider>
  );
}
