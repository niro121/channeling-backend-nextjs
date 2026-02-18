import React from 'react';
import UserGroupForm from '../../user-group-form';
import { fetchUserGroupById } from '@/app/actions/user-group.actions';
import { fetchServerSession } from '@/lib/session';
import { notFound, redirect } from 'next/navigation';
import { checkPermission } from '@/lib/server-permissions';
import { BackButton } from '@/components/common/back-button';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const session = await fetchServerSession();
  
  // Check if user can edit user groups
  const canEdit = await checkPermission("users", "edit")
  if (!canEdit) {
    redirect("/unauthorized-access")
  }
  
  let userGroup;
  try {
    userGroup = await fetchUserGroupById(id);
  } catch (error) {
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
          userGroup={userGroup as any}
          sessionUserType={session?.user?.userType}
          isEditPage={true}
        />
      </div>
    </div>
  );
}
