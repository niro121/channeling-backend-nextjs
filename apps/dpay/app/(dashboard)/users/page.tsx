import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@archmage/ui';
import { Plus } from 'lucide-react';
import Loading from '../loading';
import { fetchServerSession } from '@/lib/session';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ExportWrapper } from '../export-wrapper';
import { UsersTable } from './users-table';
import UserFilterSection from './filter-section';
import {
  bulkDeleteUsers,
  getAllUsers,
  getAllUsersOptions,
  getUsersExport
} from '@/app/actions/user-usergrp-actions/user.actions';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    userId?: string;
    status?: string;
  }>;
};

export default async function UsersPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/users');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'users.visited',
      entityType: 'Users',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const [{ data, totalRecords }, { data: userOptionsData }] = await Promise.all(
    [
      getAllUsers({
        page: params?.page,
        limit: params?.limit,
        keyword: params?.keyword,
        userId: params?.userId,
        status: params?.status
      }),
      getAllUsersOptions({ activeOnly: false })
    ]
  );

  const userOptions = (userOptionsData ?? []).map((user) => ({
    id: user.id,
    name: user.name
  }));

  const canAdd = await checkPermission('users', 'add');

  const handleExport = async () => {
    'use server';

    const exportResponse = await getUsersExport({
      keyword: params?.keyword,
      userId: params?.userId,
      status: params?.status
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No users found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((user) => ({
        name: user.name || '-',
        email: user.email || '-',
        userGroup: user.userGroup?.name || 'Platform Admin',
        location: user.userLocation?.name
          ? user.userLocation.code
            ? `${user.userLocation.name} (${user.userLocation.code})`
            : user.userLocation.name
          : user.locationCode || '-',
        status: user.status === 1 ? 'Published' : 'Unpublished'
      }))
    };
  };

  const bulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} user${ids.length === 1 ? '' : 's'}. Platform admin accounts are excluded.`;
  };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <UsersTable
          data={data}
          totalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          deleteServerAction={bulkDeleteUsers}
          getBulkDeleteDescription={bulkDeleteDescription}
          toolbarLeft={
            <UserFilterSection
              userOptions={userOptions}
              userId={params?.userId}
              keyword={params?.keyword}
              status={params?.status}
            />
          }
          toolbarRight={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex items-start justify-end gap-2 shrink-0">
                {canAdd ? (
                  <Link href="/users/add">
                    <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Add New
                      </span>
                    </Button>
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center justify-end">
                <ExportWrapper
                  serverData={handleExport}
                  columns={[
                    'User Name',
                    'Email',
                    'User Group',
                    'Location',
                    'Status'
                  ]}
                  keys={['name', 'email', 'userGroup', 'location', 'status']}
                  title="Users List"
                  fileName="users"
                />
              </div>
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
