import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { checkRouteAccess } from '@/lib/server-permissions';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getSalaryProcessingWorkspaceAction,
  listProcessablePayrollRunsAction
} from '@/app/actions/payroll-actions/salary-processing.actions';
import type {
  SalaryProcessingRunOption,
  SalaryProcessingWorkspaceData
} from '@/types/payroll';
import SalaryProcessingWorkspace from './salary-processing-workspace';

type SearchParams = {
  searchParams?: Promise<{
    runId?: string;
  }>;
};

export default async function SalaryProcessingPage({
  searchParams
}: SearchParams) {
  const canView = await checkRouteAccess('/salary-processing');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'salary-processing.visited',
      entityType: 'PayrollRun',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const [runsRes] = await Promise.all([listProcessablePayrollRunsAction()]);
  const runOptions: SalaryProcessingRunOption[] = runsRes.isError
    ? []
    : (runsRes.data ?? []);

  const selectedRunId =
    params?.runId ||
    runOptions.find((r) => r.status === 'generated')?.id ||
    runOptions.find((r) => r.status === 'on_hold')?.id ||
    runOptions[0]?.id ||
    null;

  let workspace: SalaryProcessingWorkspaceData | null = null;
  if (selectedRunId) {
    const wsRes = await getSalaryProcessingWorkspaceAction(selectedRunId);
    workspace = wsRes.isError ? null : (wsRes.data ?? null);
  }

  return (
    <SalaryProcessingWorkspace
      runOptions={runOptions}
      initialRunId={selectedRunId}
      initialWorkspace={workspace}
    />
  );
}
