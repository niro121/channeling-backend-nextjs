'use client';

import type { ReactNode } from 'react';
import { CustomDataTable } from '@archmage/ui';
import type { DpayUser } from '@/types/user';
import { userColumns } from './columns';

type UsersTableProps = {
  data: DpayUser[];
  totalRecords: number;
  page?: string;
  limit?: string;
  toolbarLeft: ReactNode;
  toolbarRight: ReactNode;
  deleteServerAction: (ids: string[]) => Promise<boolean>;
  getBulkDeleteDescription: (ids: string[]) => Promise<string>;
};

export function UsersTable({
  data,
  totalRecords,
  page,
  limit,
  toolbarLeft,
  toolbarRight,
  deleteServerAction,
  getBulkDeleteDescription
}: UsersTableProps) {
  return (
    <CustomDataTable
      heading="Users"
      subHeading="Manage DPAY staff login accounts, locations and group assignments."
      columns={userColumns}
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
