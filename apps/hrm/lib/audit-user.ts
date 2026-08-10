import { fetchServerSession } from '@/lib/session';

export type AuditUser = {
  id?: string;
  name?: string;
};

export function toAuditUser(user?: AuditUser | null): AuditUser | undefined {
  const id = user?.id?.trim();
  if (!id) return undefined;
  return { id, name: user?.name?.trim() || undefined };
}

export async function getAuditUser(): Promise<AuditUser | undefined> {
  const session = await fetchServerSession();
  if (!session?.user?.id) return undefined;
  return {
    id: session.user.id,
    name: session.user.name ?? undefined
  };
}
