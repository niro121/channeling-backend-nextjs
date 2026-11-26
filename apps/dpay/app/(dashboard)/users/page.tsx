import { redirect } from 'next/navigation';
import { checkPermission } from '@/lib/server-permissions';
import { getUserTypeLabel } from '@/lib/roles';
import { listDpayUsersAction } from '@/app/actions/user-groups/user-group.actions';
import { AssignGroupSelect } from './assign-group-select';

export default async function UsersPage() {
  if (!(await checkPermission('users', 'view'))) redirect('/unauthorized-access');
  const { users, groups } = await listDpayUsersAction();
  const canEdit = await checkPermission('users', 'edit');
  const options = groups.filter((group) => group.id && group.status === 1).map((group) => ({
    id: group.id as string,
    name: group.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Assign a DPAY group. A person in an HRM or other app group stays there.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">DPAY group</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const locked = Boolean(user.groupApp && user.groupApp !== 'dpay');
              return (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">{getUserTypeLabel(user.userType)}</td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span className="text-muted-foreground">{user.groupName} ({user.groupApp})</span>
                    ) : (
                      <AssignGroupSelect
                        userId={user.id}
                        groupId={user.groupId}
                        locked={false}
                        groups={options}
                        canEdit={canEdit}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
