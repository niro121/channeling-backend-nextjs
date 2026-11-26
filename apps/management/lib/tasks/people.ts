import 'server-only';
import { cache } from 'react';
import { authPrisma } from '@archmage/db-auth';
import { channelingUserJson } from '@/lib/channeling-user-api';

export type Person = { id: string; name: string; email: string };

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Names and emails by user id (auth DB — same users as channeling). Works without a session. */
export async function getPeopleByIds(ids: (string | null | undefined)[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id && OBJECT_ID.test(id)))];
  if (unique.length === 0) return new Map();
  const users = await authPrisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true }
  });
  return new Map(users.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]));
}

/**
 * People a task can be assigned to: management app access + task access, decided by channeling.
 * Cached per request.
 */
export const listAssignablePeople = cache(async (): Promise<Person[]> => {
  const result = await channelingUserJson<{ success: boolean; data?: Person[] }>('/api/management/tasks/people');
  return result.success && result.data ? result.data : [];
});
