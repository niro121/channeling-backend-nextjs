import { Suspense } from 'react';
import { InstallBanner } from '@/components/pwa/install-banner';
import { isChannelingUserApiConfigured } from '@/lib/channeling-user-api';
import { getInsightAccess } from '@/lib/insights';
import type { InsightModule, InsightRange } from '@/types/insights';
import { DateRangeBar } from './date-range-bar';
import {
  BookingBehaviourModule,
  BookingsModule,
  LeakageModule,
  ModuleSkeleton,
  RevenueModule,
  SessionFillModule,
  SpecialitiesModule,
  TopDoctorsModule
} from './insight-cards';

export const dynamic = 'force-dynamic';

/** Display order; each card needs management-overview.<module> in the user's channeling group. */
const LAYOUT: { module: InsightModule; Component: (props: { range: InsightRange }) => Promise<React.ReactNode>; wide?: boolean }[] = [
  { module: 'revenue', Component: RevenueModule, wide: true },
  { module: 'bookings', Component: BookingsModule },
  { module: 'top-doctors', Component: TopDoctorsModule },
  { module: 'session-fill', Component: SessionFillModule },
  { module: 'leakage', Component: LeakageModule },
  { module: 'booking-behaviour', Component: BookingBehaviourModule },
  { module: 'specialities', Component: SpecialitiesModule }
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;

  if (!isChannelingUserApiConfigured()) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Channeling is not connected. Set CHANNELING_API_URL and MANAGEMENT_APP_JWT_SECRET.
      </div>
    );
  }

  const access = await getInsightAccess(from, to);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <InstallBanner />

      {!access.success ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{access.message}</div>
      ) : access.modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No channel insights are switched on for your user group. Ask an admin to enable them under
          &ldquo;Management App Overview&rdquo; in channeling user groups.
        </div>
      ) : (
        <>
          <DateRangeBar
            from={access.range.from}
            to={access.range.to}
            previousFrom={access.range.previousFrom}
            previousTo={access.range.previousTo}
          />
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {LAYOUT.filter((item) => access.modules.includes(item.module)).map(({ module, Component, wide }) => (
              <Suspense
                key={`${module}-${access.range.from}-${access.range.to}`}
                fallback={<ModuleSkeleton className={wide ? 'lg:col-span-2' : undefined} />}
              >
                <div className={wide ? 'min-w-0 lg:col-span-2' : 'min-w-0'}>
                  <Component range={access.range} />
                </div>
              </Suspense>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
