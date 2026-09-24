import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getLeaveEntitlementBalanceAction,
  getLeaveEntitlementFormOptionsAction,
  getLeaveEntitlementsAction,
  getLeaveEntitlementsExport
} from '@/app/actions/leave-actions/leave-entitlement.actions';
import LeaveEntitlementFilterSection from './filter-section';
import LeaveEntitlementWorkspace from './leave-entitlement-workspace';
import { formatDate } from '@/lib/utils/date';
import type { LeaveEntitlementRecord } from '@/types/leave';

type SearchParams = {
  searchParams?: Promise<{
    employeeId?: string;
    departmentId?: string;
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function LeaveEntitlementPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/leave-entitlement');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'leave-entitlement.visited',
      entityType: 'LeaveEntitlement',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const staffId = params?.employeeId || undefined;
  const leaveTypeId =
    params?.leaveType && params.leaveType !== '__all__'
      ? params.leaveType
      : undefined;

  const [optionsRes, entitlementsRes, balanceRes] = await Promise.all([
    getLeaveEntitlementFormOptionsAction(),
    getLeaveEntitlementsAction({
      staffId,
      leaveTypeId,
      departmentId: params?.departmentId,
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      limit: process.env.DEFAULT_PAGE_SIZE
    }),
    staffId
      ? getLeaveEntitlementBalanceAction(staffId)
      : Promise.resolve({ isError: false, data: null, errors: {} })
  ]);

  const employeeOptions = (optionsRes.data?.staff ?? []).map((staff) => ({
    id: staff.id,
    name: staff.code ? `${staff.code} — ${staff.name}` : staff.name
  }));

  const leaveTypeOptions = (optionsRes.data?.leaveTypes ?? []).map((type) => ({
    id: type.id,
    name: type.code ? `${type.code} — ${type.name}` : type.name
  }));

  // Department master not built yet — keep filter UI with empty options.
  const departmentOptions: { id: string; name: string }[] = [];

  const entitlements = (
    entitlementsRes.isError ? [] : (entitlementsRes.data?.data ?? [])
  ) as LeaveEntitlementRecord[];

  const balance = balanceRes.isError ? null : (balanceRes.data ?? null);

  const handleExport = async () => {
    'use server';

    const exportResponse = await getLeaveEntitlementsExport({
      staffId,
      leaveTypeId,
      departmentId: params?.departmentId,
      fromDate: params?.fromDate,
      toDate: params?.toDate
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No entitlement records found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((row: any) => ({
        staffName: row.staffName
          ? row.staffCode
            ? `${row.staffName} (${row.staffCode})`
            : row.staffName
          : '-',
        leaveType: row.leaveTypeName ?? row.leaveType?.name ?? '-',
        fromDate: formatDate(row.fromDate),
        toDate: formatDate(row.toDate),
        entitled: row.entitled,
        used: row.used,
        remaining: row.remaining,
        carryForward: row.carryForward,
        status: row.status
      }))
    };
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Leave Entitlement"
        description="Configure per-employee leave entitlements and monitor real-time balances."
      />

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
          <CardDescription>
            Search and filter employees to load entitlement details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="h-10 text-sm text-muted-foreground">
                Loading filters...
              </div>
            }
          >
            <LeaveEntitlementFilterSection
              employeeOptions={employeeOptions}
              departmentOptions={departmentOptions}
              leaveTypeOptions={[
                { id: '__all__', name: 'All Leave Types' },
                ...leaveTypeOptions
              ]}
              employeeId={params?.employeeId}
              departmentId={params?.departmentId}
              leaveType={params?.leaveType}
              fromDate={params?.fromDate}
              toDate={params?.toDate}
            />
          </Suspense>
        </CardContent>
      </Card>

      <LeaveEntitlementWorkspace
        entitlements={entitlements}
        balance={balance}
        employeeOptions={employeeOptions}
        leaveTypeOptions={leaveTypeOptions}
        exportHandler={handleExport}
      />
    </div>
  );
}
