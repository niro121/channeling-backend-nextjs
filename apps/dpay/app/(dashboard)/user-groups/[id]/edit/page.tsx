import { notFound, redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { getDpayUserGroupAction } from '@/app/actions/user-groups/user-group.actions';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { UserGroupForm } from '../../user-group-form';

export default async function EditUserGroupPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await checkPermission('users', 'edit'))) redirect('/unauthorized-access');
  const session = await fetchServerSession();
  const { id } = await params;
  const group = await getDpayUserGroupAction(id);
  if (!group) notFound();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit User Group</h2>
        <BackButton href="/user-groups" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <UserGroupForm userGroup={group} sessionUserType={session?.user?.userType} />
      </div>
    </div>
  );
}
