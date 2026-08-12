import React from 'react';
import { redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import UserGroupForm from '../user-group-form';

export default async function AddUserGroupPage() {
  const canAdd = await checkPermission('users', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  const session = await fetchServerSession();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add User Group</h2>
        <BackButton href="/user-groups" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <UserGroupForm
          userGroup={null}
          sessionUserType={session?.user?.userType}
        />
      </div>
    </div>
  );
}
