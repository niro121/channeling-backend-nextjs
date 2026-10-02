import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { BackButton } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { fetchUserGroupById } from '@/app/actions/user-usergrp-actions/user-group.actions';
import type { UserGroup } from '@/types/user-group';
import UserGroupForm from '../../user-group-form';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUserGroupPage({ params }: PageProps) {
  const canEdit = await checkPermission('users', 'edit');
  if (!canEdit) {
    redirect('/unauthorized-access');
  }

  const { id } = await params;
  const session = await fetchServerSession();

  let userGroup;
  try {
    userGroup = await fetchUserGroupById(id);
  } catch {
    notFound();
  }

  if (!userGroup) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit User Group</h2>
        <BackButton href="/user-groups" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <UserGroupForm
          userGroup={userGroup as UserGroup}
          sessionUserType={session?.user?.userType}
        />
      </div>
    </div>
  );
}
