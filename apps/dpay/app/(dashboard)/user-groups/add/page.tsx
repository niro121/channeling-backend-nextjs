import { notFound, redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import type { UserGroup } from '@archmage/shared';
import { getDpayUserGroupAction } from '@/app/actions/user-groups/user-group.actions';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { UserGroupForm } from '../user-group-form';

const NAME_MAX = 100;

type PageProps = {
  searchParams?: Promise<{ copyFrom?: string }>;
};

export default async function AddUserGroupPage({ searchParams }: PageProps) {
  if (!(await checkPermission('users', 'add'))) redirect('/unauthorized-access');
  const session = await fetchServerSession();
  const copyFrom = (await searchParams)?.copyFrom?.trim();

  let userGroup: UserGroup | null = null;
  let copiedFromName: string | null = null;
  if (copyFrom) {
    const source = await getDpayUserGroupAction(copyFrom);
    if (!source) notFound();
    copiedFromName = source.name;
    userGroup = {
      name: `Copy of ${source.name.trim()}`.slice(0, NAME_MAX),
      description: source.description ?? '',
      status: source.status,
      app: 'dpay',
      permissions: source.permissions,
    };
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{copiedFromName ? 'Copy User Group' : 'Add User Group'}</h2>
          {copiedFromName ? (
            <p className="text-sm text-muted-foreground mt-1">
              Permissions, description, and status are copied from {copiedFromName}. Give this group a new name, then save.
            </p>
          ) : null}
        </div>
        <BackButton href="/user-groups" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <UserGroupForm userGroup={userGroup} sessionUserType={session?.user?.userType} />
      </div>
    </div>
  );
}
