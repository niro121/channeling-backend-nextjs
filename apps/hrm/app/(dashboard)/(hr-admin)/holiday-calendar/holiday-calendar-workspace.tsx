'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { HolidayCalendarUiRecord } from '@/types/holiday-calendar';
import SectionHolidayDetail from './section-holiday-detail';
import SectionHolidayList from './section-holiday-list';
import {
  HolidayCalendarUiProvider
} from './holiday-calendar-ui-context';

type Props = {
  initialRecords: HolidayCalendarUiRecord[];
  initialSelectedId?: string | null;
  initialYear?: number;
};

export default function HolidayCalendarWorkspace({
  initialRecords,
  initialSelectedId,
  initialYear
}: Props) {
  return (
    <HolidayCalendarUiProvider
      initialRecords={initialRecords}
      initialSelectedId={initialSelectedId}
      initialYear={initialYear}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Holiday Calendar"
          description="Manage institutional holidays used by roster, leave, and payroll."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)]">
          <SectionHolidayList />
          <SectionHolidayDetail />
        </div>
      </div>
    </HolidayCalendarUiProvider>
  );
}
