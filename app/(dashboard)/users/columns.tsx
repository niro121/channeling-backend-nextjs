"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { User } from "@/types/user"
import UserRecordActions from "./record-actions"
import { CircleCorrect, CircleX } from "@/components/icons"

// DEFINE THE COLUMNS OF THE USER TABLE
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
        header: "User Status",
        cell: ({ row }) => {
            const show = row.getValue('status')
            return show === 1 ? (
                <CircleCorrect className="text-primary w-7 h-7" />
            ) : (
                <CircleX className="text-red-500 w-7 h-7" />
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <UserRecordActions row={row} />,
    },
]
