"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User } from "@/types/user"
import UserRecordActions from "./record-actions"
import { CheckCircle2, XCircle } from "lucide-react"
import moment from "moment"

export const userColumns: ColumnDef<User>[] = [
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
        header: "User Name",
    },
    {
        accessorKey: "email",
        header: "Email",
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
                    {isActive ? "Published" : "Unpublished"}
                </Badge>
            )
        },
    },
    {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
            const date = row.original.updatedAt;
            const formatted = date ? moment(date).format("DD/MM/YYYY hh:mm A") : "—";
            return (
                <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{formatted}</span>
                </div>
            );
        },
    },
    {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
            const date = row.original.createdAt;
            const formatted = date ? moment(date).format("DD/MM/YYYY hh:mm A") : "—";
            return (
                <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{formatted}</span>
                </div>
            );
        },
    },
    {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => <UserRecordActions row={row} />,
    },
]
