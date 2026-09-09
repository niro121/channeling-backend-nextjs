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
import { userGroupColumns } from './columns';
import {
  bulkDeleteUserGroups,
  getAllUserGroups,
  getUserGroupsExport
} from '@/app/actions/user-usergrp-actions/user-group.actions';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
  }>;
};

export default async function UserGroupsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/user-groups');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'user-groups.visited',
      entityType: 'UserGroups',
      importance: 'low'
    });
  }

  const params = await searchParams;
  const { data, totalRecords } = await getAllUserGroups({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword
  });

  const canAdd = await checkPermission('users', 'add');

  const handleExport = async () => {
    'use server';

    const exportResponse = await getUserGroupsExport({
      keyword: params?.keyword
    });

    if (!exportResponse.success || !exportResponse.data?.length) {
      return {
        success: false,
        message: exportResponse.success
          ? 'No user groups found'
          : exportResponse.message
      };
    }

    return {
      success: true,
      data: exportResponse.data.map((ug) => ({
        name: ug.name || '-',
        description: ug.description || '-',
        status: ug.status === 1 ? 'Published' : 'Unpublished'
      }))
    };
  };

  const bulkDeleteDescription = async (ids: string[]) => {
    'use server';
    return `This will permanently delete ${ids.length} user group${ids.length === 1 ? '' : 's'}. This action cannot be undone.`;
  };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="User Groups"
          subHeading="Manage HRM user groups and permission matrices."
          columns={userGroupColumns}
          data={data}
          rowCount={totalRecords}
          page={params?.page}
          haveBulkDelete
          deleteServerAction={bulkDeleteUserGroups}
          getBulkDeleteDescription={bulkDeleteDescription}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by name, description"
                    className="pl-8 w-full h-9"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Group Name', 'Description', 'Status']}
                  keys={['name', 'description', 'status']}
                  title="User Groups List"
                  fileName="user-groups"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              {canAdd ? (
                <Link href="/user-groups/add">
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
