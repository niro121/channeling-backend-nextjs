import { authPrisma } from '@archmage/db-auth';
import type { Permissions, UserGroup } from '@archmage/shared';
import { DPAY_USER_GROUP_APP, dpayUserGroupAppFilter, isDpayUserGroup } from '@/lib/dpay-user-group-scope';
import { toAuditUser, type AuditUser } from '@/lib/audit-user';

function asPermissions(value: unknown): Permissions {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Permissions;
  return {};
}

type AuthUserGroupRow = {
  id: string;
  name: string;
  description: string | null;
  status: number;
  app: string | null;
  permissions: unknown;
  twoFactorEnabled: boolean;
  twoFactorMethods: string[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toGroup(row: AuthUserGroupRow): UserGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    app: row.app,
    permissions: asPermissions(row.permissions),
    twoFactorEnabled: row.twoFactorEnabled,
    twoFactorMethods: row.twoFactorMethods,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listDpayUserGroups(): Promise<UserGroup[]> {
  const rows = await authPrisma.userGroup.findMany({
    where: dpayUserGroupAppFilter,
    orderBy: { name: 'asc' },
  });
  return withAuditUsers(rows);
}

export async function listDpayUserGroupsPage(params: {
  page?: string;
  limit?: string;
  keyword?: string;
}): Promise<{ data: UserGroup[]; totalRecords: number }> {
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.limit ?? '10', 10) || 10));
  const keyword = params.keyword?.trim() ?? '';
  const where = {
    ...dpayUserGroupAppFilter,
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { description: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, totalRecords] = await Promise.all([
    authPrisma.userGroup.findMany({
      where,
      skip: page * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    authPrisma.userGroup.count({ where }),
  ]);

  return { data: await withAuditUsers(rows), totalRecords };
}

export async function getDpayUserGroup(id: string): Promise<UserGroup | null> {
  const row = await authPrisma.userGroup.findUnique({ where: { id } });
  if (!row || !isDpayUserGroup(row)) return null;
  return toGroup(row);
}

export async function saveDpayUserGroup(input: UserGroup, user?: AuditUser) {
  const auditUser = toAuditUser(user);
  const created = await authPrisma.userGroup.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status === 0 ? 0 : 1,
      app: DPAY_USER_GROUP_APP,
      permissions: input.permissions as object,
      twoFactorEnabled: false,
      twoFactorMethods: [],
      ...(auditUser?.id ? { createdBy: auditUser.id, updatedBy: auditUser.id } : {}),
    },
  });
  return toGroup(created);
}

export async function updateDpayUserGroup(id: string, input: UserGroup, user?: AuditUser) {
  const existing = await authPrisma.userGroup.findUnique({ where: { id } });
  if (!existing || !isDpayUserGroup(existing)) throw new Error('User group not found');
  const auditUser = toAuditUser(user);
  const updated = await authPrisma.userGroup.update({
    where: { id },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status === 0 ? 0 : 1,
      app: DPAY_USER_GROUP_APP,
      permissions: input.permissions as object,
      ...(auditUser?.id ? { updatedBy: auditUser.id } : {}),
      updatedAt: new Date(),
    },
  });
  return toGroup(updated);
}

export async function deleteDpayUserGroup(id: string) {
  await deleteDpayUserGroups([id]);
}

export async function deleteDpayUserGroups(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return;
  const groups = await authPrisma.userGroup.findMany({
    where: { id: { in: uniqueIds } },
    include: { users: { select: { id: true }, take: 1 } },
  });
  if (groups.length !== uniqueIds.length || groups.some((group) => !isDpayUserGroup(group))) {
    throw new Error('User group not found');
  }
  const blocked = groups.filter((group) => group.users.length > 0);
  if (blocked.length > 0) {
    const names = blocked.map((group) => group.name).join(', ');
    throw new Error(
      blocked.length === 1
        ? `Move the people in ${names} to another group before deleting it.`
        : `Move the people in ${names} to another group before deleting them.`
    );
  }
  await authPrisma.userGroup.deleteMany({ where: { id: { in: uniqueIds } } });
}

async function withAuditUsers(rows: AuthUserGroupRow[]): Promise<UserGroup[]> {
  const ids = [
    ...new Set(rows.flatMap((row) => [row.createdBy, row.updatedBy].filter((id): id is string => Boolean(id)))),
  ];
  const users =
    ids.length === 0
      ? []
      : await authPrisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, email: true },
        });
  const byId = new Map(users.map((user) => [user.id, user]));
  return rows.map((row) => ({
    ...toGroup(row),
    createdUser: row.createdBy ? byId.get(row.createdBy) ?? null : null,
    updatedUser: row.updatedBy ? byId.get(row.updatedBy) ?? null : null,
  }));
}

export type DpayUserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  userType: number;
  groupId: string | null;
  groupName: string | null;
  groupApp: string | null;
};

export async function listDpayAssignableUsers(): Promise<DpayUserRow[]> {
  const users = await authPrisma.user.findMany({
    where: { status: 1, userType: { in: [1, 2] } },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      userType: true,
      userGroup: { select: { id: true, name: true, app: true } },
    },
    orderBy: { name: 'asc' },
  });
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    userType: user.userType,
    groupId: user.userGroup?.id ?? null,
    groupName: user.userGroup?.name ?? null,
    groupApp: user.userGroup?.app ?? null,
  }));
}

/** Assign a DPAY group, or clear one. A group owned by another app is left alone. */
export async function assignDpayUserGroup(userId: string, userGroupId: string | null) {
  const user = await authPrisma.user.findUnique({
    where: { id: userId },
    include: { userGroup: { select: { id: true, app: true } } },
  });
  if (!user || user.status !== 1) throw new Error('User not found');
  if (user.userGroup && !isDpayUserGroup(user.userGroup)) {
    throw new Error('This person belongs to another app and cannot be moved from here.');
  }
  if (userGroupId) {
    const group = await authPrisma.userGroup.findUnique({ where: { id: userGroupId } });
    if (!group || !isDpayUserGroup(group)) throw new Error('User group not found');
  }
  await authPrisma.user.update({
    where: { id: userId },
    data: { userGroupId },
  });
}
