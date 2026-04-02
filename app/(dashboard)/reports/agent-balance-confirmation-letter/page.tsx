import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import { getAllAgenciesOptions } from '@/app/actions/agency.actions';
import AgentBalanceConfirmationLetterContent from './agent-balance-confirmation-letter-content';

export const dynamic = 'force-dynamic';

export default async function AgentBalanceConfirmationLetterPage() {
  const canView = await checkRouteAccess('/reports/agent-balance-confirmation-letter');
  if (!canView) redirect('/unauthorized-access');

  const agenciesRes = await getAllAgenciesOptions();
  const agentOptions: Array<{ id: string; name: string }> =
    agenciesRes.success && agenciesRes.data
      ? [
          { id: '__all__', name: 'Select Agent' },
          ...agenciesRes.data.map((a: any) => ({
            id: a.id || '',
            name: a.code && a.name ? `${a.name} (${a.code})` : a.name || '',
          })),
        ]
      : [{ id: '__all__', name: 'Select Agent' }];

  return <AgentBalanceConfirmationLetterContent agentOptions={agentOptions} />;
}
