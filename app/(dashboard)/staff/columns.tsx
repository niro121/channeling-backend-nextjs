'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Staff } from '@/types/staff'
import StaffRecordActions from './record-actions'
import { CheckCircle2, XCircle } from 'lucide-react'

export const staffColumns: ColumnDef<Staff>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => {
      const code = row.getValue('code') as string
      return code || <span className="text-muted-foreground">-</span>
    }
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const title = row.original.title
      const name = row.getValue('name') as string
      return (
        <span>
          {title ? `${title} ` : ''}{name}
        </span>
      )
    }
  },
  {
    accessorKey: 'nic',
    header: 'NIC',
    cell: ({ row }) => {
      const nic = row.getValue('nic') as string
      return nic || <span className="text-muted-foreground">-</span>
    }
  },
  {
    accessorKey: 'contactMobile',
    header: 'Contact'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as number
      const isActive = status === 1
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <StaffRecordActions row={row} />
  }
]
