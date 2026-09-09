import { Suspense } from 'react';
import { CommonDataTable } from '@/components/common/common-data-table';
import { overtimeRequestColumns } from './columns';
import type { OvertimeRequestSample } from './sample-data';

type SectionOtRequestsProps = {
  items: OvertimeRequestSample[];
};

export default function SectionOtRequests({ items }: SectionOtRequestsProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading OT requests...
        </div>
      }
    >
      <CommonDataTable
        heading="OT Requests"
        subHeading="Overtime requests matching the current view."
        columns={overtimeRequestColumns}
        data={items}
        rowCount={items.length}
        showPagination={false}
      />
    </Suspense>
  );
}
