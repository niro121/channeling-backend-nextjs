import React from 'react';
import { redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { getAllUserGroupsOptions } from '@/app/actions/user-usergrp-actions/user-group.actions';
import UserForm from '../user-form';

export default async function AddUserPage() {
  const canAdd = await checkPermission('users', 'add');
  if (!canAdd) {
    redirect('/unauthorized-access');
  }

  await fetchServerSession();
  const { data: userGroupOptions } = await getAllUserGroupsOptions();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add User</h2>
        <BackButton href="/users" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <UserForm
          user={null}
          userGroupOptions={userGroupOptions.map((group) => ({
            id: group.id,
            name: group.name
          }))}
        />
      </div>
    </div>
  );
}
