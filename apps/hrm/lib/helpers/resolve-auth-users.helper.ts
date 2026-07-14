'use server';

import { authPrisma } from '@archmage/db-auth';

export type AuthUserSummary = {
  id: string;
  name: string;
  email: string;
};

type AuditFields = {
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type WithAuthUsers<T extends AuditFields> = T & {
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export async function resolveAuthUser(
  userId: string | null | undefined
): Promise<AuthUserSummary | null> {
  if (!userId) return null;

  const user = await authPrisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true }
  });

  return user ?? null;
}

export async function resolveAuthUsers<T extends AuditFields>(
  records: T[]
): Promise<WithAuthUsers<T>[]> {
  if (records.length === 0) return [];

  const userIds = new Set<string>();
  for (const record of records) {
    if (record.createdBy) userIds.add(record.createdBy);
    if (record.updatedBy) userIds.add(record.updatedBy);
  }

  if (userIds.size === 0) {
    return records.map((record) => ({
      ...record,
      createdUser: null,
      updatedUser: null
    }));
  }

  const users = await authPrisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true, email: true }
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  return records.map((record) => ({
    ...record,
    createdUser: record.createdBy ? userMap.get(record.createdBy) ?? null : null,
    updatedUser: record.updatedBy ? userMap.get(record.updatedBy) ?? null : null
  }));
}
