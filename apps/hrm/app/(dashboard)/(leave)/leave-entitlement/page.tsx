import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { CommonDataTable } from '@/components/common/common-data-table';
import {
  leaveEntitlementColumns,
  type LeaveEntitlementRecord
} from './columns';

const sampleEntitlements: LeaveEntitlementRecord[] = [
  {
    id: '1',
    leaveType: 'Annual Leave',
    year: 2026,
    entitled: 14,
    used: 5,
    remaining: 9,
    carryForward: 2,
    status: 'active'
  },
  {
    id: '2',
    leaveType: 'Casual Leave',
    year: 2026,
    entitled: 7,
    used: 2,
    remaining: 5,
    carryForward: 0,
    status: 'active'
  },
  {
    id: '3',
    leaveType: 'Medical Leave',
    year: 2026,
    entitled: 10,
    used: 1,
    remaining: 9,
    carryForward: 0,
    status: 'active'
  },
  {
    id: '4',
    leaveType: 'Annual Leave',
    year: 2025,
    entitled: 14,
    used: 14,
    remaining: 0,
    carryForward: 0,
    status: 'expired'
  },
  {
    id: '5',
    leaveType: 'Maternity Leave',
    year: 2026,
    entitled: 84,
    used: 0,
    remaining: 84,
    carryForward: 0,
    status: 'pending'
  }
];

export default function LeaveEntitlementPage() {
  return (
    <div className="space-y-6">
      {/* 1. Title + subheading */}
      <CommonManagerHeader
        title="Leave Entitlement"
        description="Configure per-employee leave entitlements and monitor real-time balances."
      />

      {/* 2. Filter Section Card */}
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
          <CardDescription>
            Search and filter employees to load entitlement details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          
        </CardContent>
      </Card>

      {/* 3. Employee Information + Leave Balance (2 col) */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-lg border border-border shadow-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-lg font-semibold">
              Employee Information
            </CardTitle>
            <CardDescription>Selected employee profile details.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Employee information */}
            <div className="min-h-40 rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Employee information placeholder
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border shadow-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
            <CardDescription>
              Current leave balances for the selected employee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Leave balance */}
            <div className="min-h-40 rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Leave balance placeholder
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Entitlement Register Card */}
      <CommonDataTable
        heading="Entitlement Register"
        subHeading="Leave entitlement records for the selected employee."
        columns={leaveEntitlementColumns}
        data={sampleEntitlements}
        rowCount={sampleEntitlements.length}
        showPagination={false}
      />
    </div>
  );
}
