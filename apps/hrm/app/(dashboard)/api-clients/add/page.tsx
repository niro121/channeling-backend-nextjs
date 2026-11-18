import { redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { checkPermission } from '@/lib/server-permissions';
import ApiClientForm from '../api-client-form';

export default async function AddApiClientPage() {
  const canAdd = await checkPermission('users', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add API Client</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generates a client ID and secret. The secret is shown only once.
          </p>
        </div>
        <BackButton href="/api-clients" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <ApiClientForm apiClient={null} />
      </div>
    </div>
  );
}
