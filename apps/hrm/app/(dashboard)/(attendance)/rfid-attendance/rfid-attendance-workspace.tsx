import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { RfidAttendanceDashboard } from '@/types/attendance';
import { RfidAttendanceHeaderActions } from './header-actions';
import SectionRfidSummary from './section-summary';
import SectionLiveCheckins from './section-live-checkins';
import SectionFilters from './section-filters';
import SectionStatusLegend from './section-legend';

type RfidAttendanceWorkspaceProps = {
  dashboard: RfidAttendanceDashboard;
  filters: {
    department?: string;
    location?: string;
    date?: string;
    shiftTypeId?: string;
    staffId?: string;
  };
};

export default function RfidAttendanceWorkspace({
  dashboard,
  filters
}: RfidAttendanceWorkspaceProps) {
  const description = `Live check-ins from ${dashboard.activeReaderCount} RFID reader${
    dashboard.activeReaderCount === 1 ? '' : 's'
  } · Today, ${dashboard.dateLabel}`;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="RFID Attendance"
        description={description}
        actions={<RfidAttendanceHeaderActions />}
      />

      <SectionRfidSummary summary={dashboard.summary} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <SectionLiveCheckins
          rows={dashboard.liveRows}
          streaming={dashboard.streaming}
        />
        <aside className="space-y-4">
          <SectionFilters dashboard={dashboard} initial={filters} />
          <SectionStatusLegend />
        </aside>
      </div>
    </div>
  );
}
