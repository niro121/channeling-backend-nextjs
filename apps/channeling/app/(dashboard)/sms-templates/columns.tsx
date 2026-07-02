"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"
import moment from "moment"
import { SmsTemplateRecordActions } from "./record-actions"
import type { SmsTemplate } from "@/types/sms-template"
import { SMS_TEMPLATE_TYPES } from "@/types/sms-template"

export const SmsTemplateColumns: ColumnDef<SmsTemplate>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const name = row.getValue<string>("name")
      const id = row.original.id
      const content = name ?? "—"
      if (id) {
        return (
          <Link
            href={`/sms-templates/${id}/edit`}
            className="max-w-[200px] truncate block text-primary hover:underline underline-offset-2 cursor-pointer"
            title={`Edit ${name ?? "template"}`}
          >
            {content}
          </Link>
        )
      }
      return <div className="max-w-[200px] truncate" title={name}>{content}</div>
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type
      if (type == null) return "—"
      const label = SMS_TEMPLATE_TYPES.find((t) => t.id === type)?.name ?? `Type ${type}`
      return <span className="truncate block max-w-[220px]" title={label}>{label}</span>
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const msg = row.original.message
      const truncated = msg && msg.length > 50 ? `${msg.slice(0, 50)}…` : msg
      return (
        <span className="truncate block max-w-[280px] text-muted-foreground" title={msg ?? undefined}>
          {truncated ?? "—"}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as number | null | undefined
      const isActive = status === 1
      return (
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={
            isActive
              ? "gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0"
              : "gap-1 bg-muted text-muted-foreground hover:bg-muted"
          }
        >
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
  },
  {
    id: "updated",
    header: "Updated",
    cell: ({ row }) => {
      const date = row.original.updatedAt
        ? moment(row.original.updatedAt).format("DD/MM/YYYY hh:mm A")
        : "—"
      return <span className="text-xs text-muted-foreground">{date}</span>
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <SmsTemplateRecordActions row={row} />,
  },
]
