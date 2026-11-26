'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BulkDeleteButton, Button, CustomDataTable, SearchInput } from '@archmage/ui';
import type { UserGroup } from '@archmage/shared';
import { bulkDeleteDpayUserGroupsAction } from '@/app/actions/user-groups/user-group.actions';
import { userGroupColumns } from './columns';

export function UserGroupsTable({
  data,
  totalRecords,
  page,
  limit,
  canAdd,
  canEdit,
  canDelete,
}: {
  data: UserGroup[];
  totalRecords: number;
  page?: string;
  limit?: string;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <CustomDataTable
      heading="User Groups"
      subHeading="Manage your user groups here."
      columns={userGroupColumns({ canAdd, canEdit, canDelete })}
      data={data}
      rowCount={totalRecords}
      deleteServerAction={canDelete ? bulkDeleteDpayUserGroupsAction : undefined}
      haveBulkDelete={canDelete}
      hideAutoBulkDelete
      page={page}
      limit={limit}
      toolbarLeft={
        <div className="relative w-full sm:max-w-sm">
          <SearchInput
            name="keyword"
            placeholder="Search by name, description"
            className="pl-8 w-full h-9"
          />
        </div>
      }
      toolbarRight={
        <div className="flex items-start gap-2 shrink-0">
          {canDelete ? <BulkDeleteButton /> : null}
          {canAdd ? (
            <Link href="/user-groups/add">
              <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add New</span>
              </Button>
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
