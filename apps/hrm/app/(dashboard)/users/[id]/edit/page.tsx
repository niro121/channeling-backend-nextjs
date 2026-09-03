import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { userTypes } from '@archmage/shared';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { fetchUserById } from '@/app/actions/user-usergrp-actions/user.actions';
import { getAllUserGroupsOptions } from '@/app/actions/user-usergrp-actions/user-group.actions';
import type { HrmUser } from '@/types/user';
import UserForm from '../../user-form';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: PageProps) {
  const canEdit = await checkPermission('users', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  await fetchServerSession();

  let user: HrmUser;
  try {
    user = await fetchUserById(id);
  } catch {
    notFound();
  }

  if (user.userType === userTypes.admin) {
    notFound();
  }

  const { data: userGroupOptions } = await getAllUserGroupsOptions();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit User</h2>
        <BackButton href="/users" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <UserForm
          user={user}
          userGroupOptions={userGroupOptions.map((group) => ({
            id: group.id,
            name: group.name
          }))}
        />
      </div>
    </div>
  );
}
