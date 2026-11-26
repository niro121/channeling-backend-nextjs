import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { listDpayUserGroupsPageAction } from '@/app/actions/user-groups/user-group.actions';
import { checkPermission } from '@/lib/server-permissions';
import Loading from '../loading';
import { UserGroupsTable } from './user-groups-table';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function UserGroupsPage({ searchParams }: SearchParams) {
  if (!(await checkPermission('users', 'view'))) redirect('/unauthorized-access');

  const params = await searchParams;
  const { data, totalRecords } = await listDpayUserGroupsPageAction({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
  });
  const canAdd = await checkPermission('users', 'add');
  const canEdit = await checkPermission('users', 'edit');
  const canDelete = await checkPermission('users', 'delete');

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <UserGroupsTable
          data={data}
          totalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          canAdd={canAdd}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Suspense>
    </div>
  );
}
