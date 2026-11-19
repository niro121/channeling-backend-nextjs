'use client';

import type { ReactNode } from 'react';
import { CustomDataTable } from '@archmage/ui';
import type { UserGroup } from '@/types/user-group';
import { userGroupColumns } from './columns';

type UserGroupsTableProps = {
  data: UserGroup[];
  totalRecords: number;
  page?: string;
  limit?: string;
  toolbarLeft: ReactNode;
  toolbarRight: ReactNode;
  deleteServerAction: (ids: string[]) => Promise<boolean>;
  getBulkDeleteDescription: (ids: string[]) => Promise<string>;
};

export function UserGroupsTable({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
  toolbarRight,
  deleteServerAction,
  getBulkDeleteDescription
}: UserGroupsTableProps) {
  return (
    <CustomDataTable
      heading="User Groups"
      subHeading="Manage DPAY user groups and permission matrices."
      columns={userGroupColumns}
      data={data}
      rowCount={totalRecords}
      page={page}
      limit={limit}
      haveBulkDelete
      deleteServerAction={deleteServerAction}
      getBulkDeleteDescription={getBulkDeleteDescription}
      toolbarLeft={toolbarLeft}
      toolbarRight={toolbarRight}
    />
  );
}
