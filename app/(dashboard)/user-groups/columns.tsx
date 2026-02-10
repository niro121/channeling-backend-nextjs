"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { UserGroup } from "@/types/user-group"
import UserGroupRecordActions from "./record-actions"
import { CheckCircle2, XCircle } from "lucide-react"

// DEFINE THE COLUMNS OF THE USER GROUP TABLE
export const userGroupColumns: ColumnDef<UserGroup>[] = [
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
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: "Group Name",
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
            const description = row.getValue("description") as string
            return description || "-"
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as number
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
                    {isActive ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <XCircle className="h-4 w-4" />
                    )}
                    {isActive ? "Active" : "Inactive"}
                </Badge>
            )
        },
    },
    {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => <UserGroupRecordActions row={row} />,
    },
]
