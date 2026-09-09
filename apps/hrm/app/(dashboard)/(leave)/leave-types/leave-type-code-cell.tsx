'use client';

import Link from 'next/link';
import { usePermissions } from '@/components/hooks/use-permissions';

type LeaveTypeCodeCellProps = {
  id?: string | null;
  code?: string | null;
};

export function LeaveTypeCodeCell({ id, code }: LeaveTypeCodeCellProps) {
  const { has } = usePermissions();
  const canEdit = has('leave-types', 'edit');

  if (!code) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!canEdit || !id) {
    return <span className="whitespace-nowrap font-medium">{code}</span>;
  }

  return (
    <Link
      href={`/leave-types/${id}/edit`}
      className="whitespace-nowrap font-medium text-primary hover:underline"
    >
      {code}
    </Link>
  );
}
