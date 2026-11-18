'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { Ban, CheckCircle2 } from 'lucide-react';
import { getPublicApiScopeLabel } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils/date';
import type { ApiClientRecord } from '@/types/api-client';
import ApiClientRecordActions from './record-actions';

export const apiClientColumns: ColumnDef<ApiClientRecord>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'clientId',
    header: 'Client ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs break-all">
        {row.original.clientId}
      </span>
    )
  },
  {
    id: 'actingUser',
    header: 'API User',
    cell: ({ row }) => row.original.actingUserName || '—'
  },
  {
    id: 'scopes',
    header: 'Scopes',
    cell: ({ row }) => {
      const scopes = row.original.scopes ?? [];
      if (!scopes.length) return <span className="text-xs">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {scopes.map((scope) => (
            <Badge
              key={scope}
              variant="secondary"
              className="text-[10px] font-normal"
              title={scope}
            >
              {getPublicApiScopeLabel(scope)}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const blocked = row.original.isBlocked;
      return (
        <Badge
          variant={blocked ? 'secondary' : 'default'}
          className={
            blocked
              ? 'gap-1 bg-muted text-muted-foreground hover:bg-muted border-0'
              : 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
          }
        >
          {blocked ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {blocked ? 'Blocked' : 'Active'}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.updatedAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <ApiClientRecordActions record={row.original} />
  }
];
