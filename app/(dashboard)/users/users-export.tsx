'use client';

import { ExportWrapper } from '../export-wrapper';
import { getUsersExportData } from '@/app/actions/user.actions';

export function UsersExport({ keyword }: { keyword?: string }) {
  return (
    <ExportWrapper
      serverData={() => getUsersExportData(keyword)}
      columns={['Name', 'Email', 'User Type', 'User Group', 'Status']}
      keys={['name', 'email', 'userType', 'userGroup', 'status']}
      title="Users List"
      fileName="users"
    />
  );
}
