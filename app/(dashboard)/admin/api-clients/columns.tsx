"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ApiClient } from "@/types/api-client"
import ApiClientRecordActions from "./record-actions"
import { Badge } from "@/components/ui/badge"

export const ApiClientColumns: ColumnDef<ApiClient>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "clientId",
    header: "Client ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("clientId") as string}</span>
    ),
  },
  {
    accessorKey: "isBlocked",
    header: "Status",
    cell: ({ row }) => {
      const isBlocked = row.getValue("isBlocked") as boolean
      return (
        <Badge variant={isBlocked ? "destructive" : "secondary"}>
          {isBlocked ? "Blocked" : "Active"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const val = row.getValue("createdAt") as string
      return format(new Date(val), "yyyy-MM-dd")
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ApiClientRecordActions row={row} />,
    enableSorting: false,
  },
]
