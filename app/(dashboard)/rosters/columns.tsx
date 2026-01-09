"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Roster } from "@/types/roster"
import { CheckedState } from "@radix-ui/react-checkbox"
import { format } from "date-fns"
import RosterRecordActions from "./record-actions"

export const rosterColumns: ColumnDef<Roster>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value: CheckedState) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value: CheckedState) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "shiftsPerPersonPerDay",
        header: "Shifts/Day",
        cell: ({ row }) => <div className="capitalize">{row.getValue("shiftsPerPersonPerDay")}</div>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as number
            return (
                <div
                    className={`font-medium ${status === 1 ? "text-green-600" : "text-gray-500"
                        }`}
                >
                    {status === 1 ? "Published" : "Unpublished"}
                </div>
            )
        },
    },
    {
        accessorKey: "departmentId",
        header: "Department",
        cell: ({ row }) => <div className="capitalize">{row.getValue("departmentId")}</div>,
    },
    // {
    //     accessorKey: "createdAt",
    //     header: "Created At",
    //     cell: ({ row }) => {
    //         const date = row.getValue("createdAt") as Date
    //         return <div>{format(date, "dd/MM/yyyy")}</div>
    //     },
    // },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => <RosterRecordActions row={row} />,
    },
]
