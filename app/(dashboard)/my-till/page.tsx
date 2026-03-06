import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { TillBalanceSection } from './till-balance-section';
import { TillStatementSection } from './till-statement-section';

function BalanceSectionFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-lg bg-muted/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 w-20 rounded bg-muted" />
              <div className="mt-2 h-6 w-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatementSectionFallback() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-24 rounded bg-muted" />
        <div className="h-9 w-64 rounded bg-muted mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-64 rounded-lg bg-muted/50" />
      </CardContent>
    </Card>
  );
}

type PageProps = {
  searchParams?: Promise<{ from?: string; to?: string }>;
};

export default async function MyTillPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const from = params?.from ?? undefined;
  const to = params?.to ?? undefined;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">My Till</h2>
            <p className="text-sm text-muted-foreground">
              Your till balance and statement. All payment types are tracked separately.
            </p>
          </div>
        </div>
      </div>

      {/* Balance + linked account: loads separately */}
      <Suspense fallback={<BalanceSectionFallback />}>
        <TillBalanceSection />
      </Suspense>

      {/* Statement: loads separately (depends on date period) */}
      <Suspense fallback={<StatementSectionFallback />}>
        <TillStatementSection from={from} to={to} />
      </Suspense>
    </div>
  );
}
