import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getSalaryCycleOptionsAction } from '@/app/actions/hr-admin-actions/salary-cycle.actions';
import {
  getPayrollEmploymentFilterOptionsAction,
  getPayrollStaffOptionsAction
} from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import type { SalaryFilterOption } from '@/types/payroll';
import SalaryGenerationWorkspace from './salary-generation-workspace';

export default async function SalaryGenerationPage() {
  const canView = await checkRouteAccess('/salary-generation');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-generation.visited',
      entityType: 'PayrollRun',
      importance: 'low'
    });
  }

  const [optionsRes, staffRes, employmentOptsRes] = await Promise.all([
    getSalaryCycleOptionsAction(),
    getPayrollStaffOptionsAction(),
    getPayrollEmploymentFilterOptionsAction()
  ]);

  const cycleOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);
  const staffOptions: SalaryFilterOption[] = staffRes.isError
    ? []
    : (staffRes.data ?? []).map((item) => ({
        id: item.id,
        name: item.name
      }));
  const departmentOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.departments ?? []);
  const designationOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.designations ?? []);
  const rosterOptions: SalaryFilterOption[] = employmentOptsRes.isError
    ? []
    : (employmentOptsRes.data?.rosters ?? []);

  return (
    <SalaryGenerationWorkspace
      cycleOptions={cycleOptions}
      staffOptions={staffOptions}
      departmentOptions={departmentOptions}
      designationOptions={designationOptions}
      rosterOptions={rosterOptions}
    />
  );
}
