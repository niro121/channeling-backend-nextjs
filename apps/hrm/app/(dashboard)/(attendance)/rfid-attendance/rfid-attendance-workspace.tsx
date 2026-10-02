'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { RfidAttendanceDashboard } from '@/types/attendance';
import { RfidAttendanceHeaderActions } from './header-actions';
import SectionRfidSummary from './section-summary';
import SectionLiveCheckins from './section-live-checkins';
import SectionFilters from './section-filters';
import SectionStatusLegend from './section-legend';

/** Auto-refresh interval for live RFID dashboard (ms). */
const RFID_POLL_INTERVAL_MS = 15_000;

type RfidAttendanceWorkspaceProps = {
  dashboard: RfidAttendanceDashboard;
  filters: {
    department?: string;
    location?: string;
    date?: string;
    shiftTypeId?: string;
    staffId?: string;
  };
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function RfidAttendanceWorkspace({
  dashboard,
  filters,
  onExport
}: RfidAttendanceWorkspaceProps) {
  const router = useRouter();
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, RFID_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [polling, router]);

  // Pause polling when the tab is hidden to avoid wasted refreshes.
  useEffect(() => {
    const onVisibility = () => {
      setPolling(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const description = `Live check-ins from ${dashboard.activeReaderCount} RFID reader${
    dashboard.activeReaderCount === 1 ? '' : 's'
  } · Today, ${dashboard.dateLabel}`;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="RFID Attendance"
        description={description}
        actions={
          <RfidAttendanceHeaderActions
            onExport={onExport}
            polling={polling}
            onRefresh={() => router.refresh()}
          />
        }
      />

      <SectionRfidSummary summary={dashboard.summary} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <SectionLiveCheckins
          rows={dashboard.liveRows}
          streaming={dashboard.streaming}
          polling={polling}
        />
        <aside className="space-y-4">
          <SectionFilters dashboard={dashboard} initial={filters} />
          <SectionStatusLegend />
        </aside>
      </div>
    </div>
  );
}
