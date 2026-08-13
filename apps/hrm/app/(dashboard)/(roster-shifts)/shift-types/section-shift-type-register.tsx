'use client';

import { Suspense } from 'react';
import { Copy, Zap } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { usePermissions } from '@/components/hooks/use-permissions';
import { shiftTypeColumns } from './columns';
import type { ShiftTypeSample } from './sample-data';

type SectionShiftTypeRegisterProps = {
  items: ShiftTypeSample[];
};

const LATER = 'Will be wired in a later phase.';

function RegisterToolbarLeft() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() =>
              toast({ title: 'Duplicate Shift', description: LATER })
            }
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate Shift
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() =>
              toast({ title: 'Bulk Activate', description: LATER })
            }
          >
            <Zap className="h-3.5 w-3.5" />
            Bulk Activate
          </Button>
        </>
      ) : null}
      {canDelete ? <DataTableBulkDeleteFeature /> : null}
    </div>
  );
}

export default function SectionShiftTypeRegister({
  items
}: SectionShiftTypeRegisterProps) {
  const { has } = usePermissions();
  const canDelete = has('shift-roster', 'delete');

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading shift types...
        </div>
      }
    >
      <CommonDataTable
        heading="Shift Type Register"
        subHeading="Master shift definitions available for roster allocation."
        columns={shiftTypeColumns}
        data={items}
        rowCount={items.length}
        showPagination
        haveBulkDelete={canDelete}
        deleteServerAction={async (ids) => {
          // Phase 0: no Prisma — surface a single message via the table error path.
          throw new Error(
            `${ids.length} shift type${ids.length === 1 ? '' : 's'} selected. Bulk delete will be wired in a later phase.`
          );
        }}
        getBulkDeleteDescription={async (ids) =>
          `This will permanently delete ${ids.length} shift type${ids.length === 1 ? '' : 's'}. Saving is wired in a later phase.`
        }
        toolbarLeft={<RegisterToolbarLeft />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            serverData={async () => ({
              success: true,
              data: items.map((row) => ({
                code: row.code,
                name: row.name,
                category: row.category,
                startTime: row.startTime,
                endTime: row.endTime,
                durationHours: row.durationHours,
                nightShift: row.isNightShift ? 'Yes' : 'No',
                overnight: row.isOvernight ? 'Yes' : 'No',
                holidayEligible: row.holidayEligible ? 'Yes' : 'No',
                status: row.status
              }))
            })}
            columns={[
              'Shift Code',
              'Shift Name',
              'Category',
              'Start Time',
              'End Time',
              'Duration',
              'Night Shift',
              'Overnight',
              'Holiday Eligible',
              'Status'
            ]}
            keys={[
              'code',
              'name',
              'category',
              'startTime',
              'endTime',
              'durationHours',
              'nightShift',
              'overnight',
              'holidayEligible',
              'status'
            ]}
            title="Shift Types"
            fileName="shift-types"
          />
        }
      />
    </Suspense>
  );
}
