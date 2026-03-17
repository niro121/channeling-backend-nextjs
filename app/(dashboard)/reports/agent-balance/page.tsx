import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AgentBalanceReportContent from './agent-balance-report-content';

export const dynamic = 'force-dynamic';

export default async function AgentBalanceReportPage() {
  const canView = await checkRouteAccess('/reports/agent-balance');
  if (!canView) redirect('/unauthorized-access');

  const agenciesRes = await getAllAgenciesOptions();

  const agentOptions: Array<{ id: string; name: string }> =
    agenciesRes.success && agenciesRes.data
      ? agenciesRes.data.map((a: any) => ({
          id: a.id || '',
          name: a.code && a.name ? `${a.name} (${a.code})` : a.name || ''
        }))
      : [];

  return (
    <AgentBalanceReportContent agentOptions={agentOptions} />
  );
}
