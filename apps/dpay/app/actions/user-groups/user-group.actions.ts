'use server';

import { revalidatePath } from 'next/cache';
import type { UserGroup } from '@archmage/shared';
import { requireAnyPermission, requirePermission } from '@/lib/server-permissions';
import { getAuditUser } from '@/lib/audit-user';
import {
  assignDpayUserGroup,
  deleteDpayUserGroup,
  deleteDpayUserGroups,
  getDpayUserGroup,
  listDpayAssignableUsers,
  listDpayUserGroups,
  listDpayUserGroupsPage,
  saveDpayUserGroup,
  updateDpayUserGroup,
} from '@/services/user-groups/user-group.service';

export async function listDpayUserGroupsAction() {
  await requirePermission('users', 'view');
  return listDpayUserGroups();
}

export async function listDpayUserGroupsPageAction(filter: {
  page?: string;
  limit?: string;
  keyword?: string;
}) {
  await requirePermission('users', 'view');
  return listDpayUserGroupsPage(filter);
}

export async function getDpayUserGroupAction(id: string) {
  await requireAnyPermission([
    { resource: 'users', action: 'view' },
    { resource: 'users', action: 'add' },
    { resource: 'users', action: 'edit' },
  ]);
  return getDpayUserGroup(id);
}

export async function saveDpayUserGroupAction(input: UserGroup) {
  await requirePermission('users', input.id ? 'edit' : 'add');
  const user = await getAuditUser();
  const saved = input.id
    ? await updateDpayUserGroup(input.id, input, user)
    : await saveDpayUserGroup(input, user);
  revalidatePath('/user-groups');
  return saved;
}

export async function deleteDpayUserGroupAction(id: string) {
  await requirePermission('users', 'delete');
  await deleteDpayUserGroup(id);
  revalidatePath('/user-groups');
}

export async function bulkDeleteDpayUserGroupsAction(ids: string[]) {
  await requirePermission('users', 'delete');
  await deleteDpayUserGroups(ids);
  revalidatePath('/user-groups');
  return true;
}

export async function listDpayUsersAction() {
  await requirePermission('users', 'view');
  const [users, groups] = await Promise.all([listDpayAssignableUsers(), listDpayUserGroups()]);
  return { users, groups };
}

export async function assignDpayUserGroupAction(userId: string, userGroupId: string | null) {
  await requirePermission('users', 'edit');
  await assignDpayUserGroup(userId, userGroupId);
  revalidatePath('/users');
}
