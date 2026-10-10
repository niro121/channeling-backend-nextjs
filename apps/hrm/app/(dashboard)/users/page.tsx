import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  BulkDeleteButton,
  Button,
  CustomDataTable,
  SearchInput
} from '@archmage/ui';
import { Plus } from 'lucide-react';
import Loading from '../loading';
import { authOptions } from '@/lib/auth';
import { checkPermission, checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { ExportWrapper } from '../export-wrapper';
import { userColumns } from './columns';
import {
  bulkDeleteUsers,
  getAllUsers,
  getUsersExport
} from '@/app/actions/user-usergrp-actions/user.actions';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function UsersPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/users');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'users.visited',
      entityType: 'Users',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const { data, totalRecords } = await getAllUsers({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword
  });

  const canAdd = await checkPermission('users', 'add');

  const handleExport = async () => {
    'use server';

    const exportResponse = await getUsersExport({
      keyword: params?.keyword
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
        staff: user.staff?.name || '-',
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
        <CustomDataTable
          heading="Users"
          subHeading="Manage HRM staff login accounts and group assignments."
          columns={userColumns}
          data={data}
          rowCount={totalRecords}
          page={params?.page}
          haveBulkDelete
          deleteServerAction={bulkDeleteUsers}
          getBulkDeleteDescription={bulkDeleteDescription}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by name, email"
                    className="pl-8 w-full h-9"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['User Name', 'Email', 'User Group', 'Linked Staff', 'Status']}
                  keys={['name', 'email', 'userGroup', 'staff', 'status']}
                  title="Users List"
                  fileName="users"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
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
          }
          hideAutoBulkDelete
        />
      </Suspense>
    </div>
  );
}
