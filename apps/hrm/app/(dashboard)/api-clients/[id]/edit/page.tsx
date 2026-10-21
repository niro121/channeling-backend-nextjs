import { notFound, redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { checkPermission } from '@/lib/server-permissions';
import { getApiClientByIdAction } from '@/app/actions/api-client.actions';
import ApiClientForm from '../../api-client-form';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditApiClientPage({ params }: PageProps) {
  const canEdit = await checkPermission('users', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  let apiClient;
  try {
    apiClient = await getApiClientByIdAction(id);
  } catch {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit API Client</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update name, API user, scopes, or block access. Use Rotate Secret
            from the list to issue a new secret.
          </p>
        </div>
        <BackButton href="/api-clients" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <ApiClientForm apiClient={apiClient} />
      </div>
    </div>
  );
}
