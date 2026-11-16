'use client';

import {
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import type { DepartmentReportRow } from '@/types/reports';

type SheetDepartmentDetailProps = {
  open: boolean;
  record: DepartmentReportRow | null;
  periodLabel: string;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function SheetDepartmentDetail({
  open,
  record,
  periodLabel,
  onOpenChange
}: SheetDepartmentDetailProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{record?.name ?? 'Department detail'}</SheetTitle>
          <SheetDescription>
            Snapshot for {periodLabel}
            {record?.code ? ` · ${record.code}` : ''}
          </SheetDescription>
        </SheetHeader>

        {record ? (
          <div className="mt-6 space-y-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={
                  record.status === 'active'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }
              >
                {record.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <DetailRow label="Institution" value={record.institution} />
            <DetailRow label="Department Head" value={record.departmentHead} />
            <DetailRow label="Total Staff" value={String(record.totalStaff)} />
            <DetailRow label="Active Staff" value={String(record.activeStaff)} />
            <DetailRow
              label="Inactive Staff"
              value={String(record.inactiveStaff)}
            />
            <DetailRow label="Vacancies" value={String(record.vacancies)} />
            <DetailRow
              label="Present Staff"
              value={String(record.presentStaff)}
            />
            <DetailRow
              label="Absent Staff"
              value={String(record.absentStaff)}
            />
            <DetailRow label="Leave Count" value={String(record.leaveCount)} />
            <DetailRow
              label="Total OT Hours"
              value={String(record.totalOtHours)}
            />
            <DetailRow
              label="Payroll Expenditure"
              value={formatLkr(record.payrollExpenditure)}
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
