'use client';

import Link from 'next/link';
import { usePermissions } from '@/components/hooks/use-permissions';

type StaffCodeCellProps = {
  id?: string | null;
  code?: string | null;
};

export function StaffCodeCell({ id, code }: StaffCodeCellProps) {
  const { has } = usePermissions();
  const canEdit = has('staff', 'edit');

  if (!code) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!canEdit || !id) {
    return <span className="whitespace-nowrap">{code}</span>;
  }

  return (
    <Link
      href={`/staff/${id}/edit`}
      className="whitespace-nowrap font-normal text-primary hover:underline"
    >
      {code}
    </Link>
  );
}
