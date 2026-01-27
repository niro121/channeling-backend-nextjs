"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Roster } from "@/types/roster"
import { CheckedState } from "@radix-ui/react-checkbox"
import { format } from "date-fns"
import RosterRecordActions from "./record-actions"
import { CircleCorrect, CircleX } from "@/components/icons"

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
        accessorKey: 'status',
        header: 'Published',
        cell: ({ row }) => {
          const show = row.getValue('status');
          return show === 1 ? (
            <CircleCorrect className="text-green-500 w-7 h-7" />
          ) : (
            <CircleX className="text-red-500 w-7 h-7" />
          );
        }
      },
    {
        accessorKey: "departmentId",
        header: "Department",
        cell: ({ row }) => {
            const roster = row.original as Roster;
            const departmentName = roster.department?.name || "-";
            return <div className="capitalize">{departmentName}</div>;
        },
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
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row }) => <RosterRecordActions row={row} />,
    },
]
