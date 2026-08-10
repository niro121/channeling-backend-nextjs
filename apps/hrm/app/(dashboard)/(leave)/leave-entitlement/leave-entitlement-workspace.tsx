'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { getLeaveEntitlementBalanceAction } from '@/app/actions/leave-actions/leave-entitlement.actions';
import type {
  LeaveEntitlementBalanceSummary,
  LeaveEntitlementRecord
} from '@/types/leave';
import { createLeaveEntitlementColumns } from './columns';
import FormEmployeeInfo from './form-employee-info';
import SectionLeaveBalance from './section-leave-balance';

type FilterOption = {
  id: string;
  name: string;
};

type LeaveEntitlementWorkspaceProps = {
  entitlements: LeaveEntitlementRecord[];
  balance: LeaveEntitlementBalanceSummary | null;
  employeeOptions: FilterOption[];
  leaveTypeOptions: FilterOption[];
  exportHandler: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function LeaveEntitlementWorkspace({
  entitlements,
  balance,
  employeeOptions,
  leaveTypeOptions,
  exportHandler
}: LeaveEntitlementWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] =
    useState<LeaveEntitlementRecord | null>(null);
  const [selectedBalance, setSelectedBalance] =
    useState<LeaveEntitlementBalanceSummary | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    const staffId = selectedRecord?.staffId;
    if (!staffId) {
      setSelectedBalance(null);
      setBalanceLoading(false);
      return;
    }

    let cancelled = false;
    setBalanceLoading(true);

    void (async () => {
      const result = await getLeaveEntitlementBalanceAction(staffId);
      if (cancelled) return;

      setSelectedBalance(result.isError ? null : (result.data ?? null));
      setBalanceLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRecord?.staffId]);

  const columns = useMemo(
    () =>
      createLeaveEntitlementColumns({
        onEdit: (record) => setSelectedRecord(record),
        onDeleted: () => setSelectedRecord(null)
      }),
    []
  );

  const displayedBalance = selectedRecord
    ? selectedBalance
    : balance;

  const emptyMessage = selectedRecord
    ? balanceLoading
      ? 'Loading leave balances…'
      : 'No leave balances found for this employee.'
    : 'Select an employee to view leave balances.';

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <FormEmployeeInfo
          employeeOptions={employeeOptions}
          leaveTypeOptions={leaveTypeOptions}
          selectedRecord={selectedRecord}
          onClearSelection={() => setSelectedRecord(null)}
        />
        <SectionLeaveBalance
          stats={balanceLoading && selectedRecord ? null : displayedBalance}
          emptyMessage={emptyMessage}
        />
      </div>

      <CommonDataTable
        heading="Entitlement Register"
        subHeading="Leave entitlement records grouped by employee."
        columns={columns}
        data={entitlements}
        rowCount={entitlements.length}
        showPagination={false}
        groupBy="staffName"
        groupByDefaultExpanded
        renderGroupHeader={({ value, subRowCount }) => (
          <span className="font-semibold text-foreground">
            {String(value || 'Unknown employee')}
            <span className="ml-2 font-normal text-muted-foreground">
              {subRowCount} entitlement{subRowCount === 1 ? '' : 's'}
            </span>
          </span>
        )}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            serverData={exportHandler}
            columns={[
              'Employee',
              'Leave Type',
              'From Date',
              'To Date',
              'Entitled',
              'Used',
              'Remaining',
              'Carry Forward',
              'Status'
            ]}
            keys={[
              'staffName',
              'leaveType',
              'fromDate',
              'toDate',
              'entitled',
              'used',
              'remaining',
              'carryForward',
              'status'
            ]}
            title="Leave Entitlement Register"
            fileName="leave-entitlement"
          />
        }
      />
    </>
  );
}
