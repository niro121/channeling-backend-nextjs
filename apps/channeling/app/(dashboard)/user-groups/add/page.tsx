import React from 'react';
import UserGroupForm from '../user-group-form';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { redirect, notFound } from 'next/navigation';
import { BackButton } from '@/components/common/back-button';
import { fetchUserGroupById } from '@/app/actions/user-group.actions';
import { UserGroup } from '@/types/user-group';

type PageProps = {
  searchParams?: Promise<{
    copyFrom?: string;
  }>;
};

const NAME_MAX = 100;

function copiedGroupName(name: string) {
  return `Copy of ${name.trim()}`.slice(0, NAME_MAX);
}

export default async function Page({ searchParams }: PageProps) {
  const session = await fetchServerSession();
  
  // Check if user can add user groups
  const canAdd = await checkPermission("user-groups", "add")
  if (!canAdd) {
    redirect("/unauthorized-access")
  }

  const resolvedSearchParams = await searchParams;
  const copyFrom = resolvedSearchParams?.copyFrom?.trim();
  let userGroup: UserGroup | null = null;
  let copiedFromName: string | null = null;

  if (copyFrom) {
    try {
      const source = await fetchUserGroupById(copyFrom);
      copiedFromName = source.name;
      userGroup = {
        name: copiedGroupName(source.name),
        description: source.description ?? "",
        status: source.status,
        permissions: source.permissions as UserGroup["permissions"],
        twoFactorEnabled: source.twoFactorEnabled ?? false,
        twoFactorMethods: Array.isArray(source.twoFactorMethods)
          ? (source.twoFactorMethods as UserGroup["twoFactorMethods"])
          : [],
      };
    } catch {
      notFound();
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {copiedFromName ? "Copy User Group" : "Add User Group"}
          </h2>
          {copiedFromName ? (
            <p className="text-sm text-muted-foreground mt-1">
              Permissions, description, status, and two-factor settings are copied from {copiedFromName}. Give this group a new name, then save.
            </p>
          ) : null}
        </div>
        <BackButton href="/user-groups" />
      </div>
      <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
        <UserGroupForm 
          userGroup={userGroup} 
          sessionUserType={session?.user?.userType}
          isEditPage={true}
        />
      </div>
    </div>
  );
}
