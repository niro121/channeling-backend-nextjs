'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@archmage/ui';
import { assignDpayUserGroupAction } from '@/app/actions/user-groups/user-group.actions';

export function AssignGroupSelect({
  userId,
  groupId,
  locked,
  groups,
  canEdit,
}: {
  userId: string;
  groupId: string | null;
  locked: boolean;
  groups: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(groupId ?? '');
  const [pending, setPending] = useState(false);

  if (locked || !canEdit) {
    return <span className="text-muted-foreground">{locked ? 'Other app' : '—'}</span>;
  }

  const onChange = async (next: string) => {
    setValue(next);
    setPending(true);
    try {
      await assignDpayUserGroupAction(userId, next || null);
      toast({ title: 'User group updated. They must sign in again for it to apply.' });
      router.refresh();
    } catch (error) {
      setValue(groupId ?? '');
      toast({
        title: error instanceof Error ? error.message : 'Could not update the user group.',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="">No DPAY group</option>
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}
