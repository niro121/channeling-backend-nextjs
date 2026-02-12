"use client"

import Link from 'next/link'
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Zone } from "@/types/zone"
import ZoneRecordActions from "./record-actions"
import { CheckCircle2, XCircle } from "lucide-react"
import moment from 'moment'

// DEFINE THE COLUMNS OF THE ZONE TABLE
export const zoneColumns: ColumnDef<Zone>[] = [
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
        header: "Zone Name",
        cell: ({ row }) => {
            const name = row.getValue<string>('name');
            const id = row.original.id;
            const content = name ?? '—';
            if (id) {
                return (
                    <Link
                        href={`/zones/${id}/edit`}
                        className="max-w-28 truncate block text-primary hover:underline underline-offset-2 cursor-pointer"
                        title={`Edit ${name ?? 'zone'}`}
                    >
                        {content}
                    </Link>
                );
            }
            return <span className="max-w-28 truncate">{content}</span>;
        },
    },
    {
        accessorKey: "location.name",
        header: "Location",
        cell: ({ row }) => {
            const locationName = row.original.location?.name
            return locationName ? (
                <span>{locationName}</span>
            ) : (
                <span className="text-muted-foreground">-</span>
            )
        }
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
            const description = row.getValue('description') as string
            return description ? (
                <span className="max-w-[300px] truncate">{description}</span>
            ) : (
                <span className="text-muted-foreground">-</span>
            )
        },
    },
    {
        accessorKey: "visibility",
        header: "Visibility",
        cell: ({ row }) => {
            const value = row.getValue("visibility") as number
            const isActive = value === 1
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
                    {isActive ? "Visible" : "Hidden"}
                </Badge>
            )
        },
    },
    {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
            const name = row.original.updatedUser?.name ?? "—";
            const date = row.original.updatedAt
                ? moment(row.original.updatedAt).format("DD/MM/YYYY hh:mm A")
                : "—";
            return (
                <div className="flex flex-col gap-0.5 text-xs">
                    <span>{name}</span>
                    <span className="text-muted-foreground">{date}</span>
                </div>
            );
        },
    },
    {
        id: "created",
        header: "Created",
        cell: ({ row }) => {
            const name = row.original.createdUser?.name ?? "—";
            const date = row.original.createdAt
                ? moment(row.original.createdAt).format("DD/MM/YYYY hh:mm A")
                : "—";
            return (
                <div className="flex flex-col gap-0.5 text-xs">
                    <span>{name}</span>
                    <span className="text-muted-foreground">{date}</span>
                </div>
            );
        },
    },
    {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => <ZoneRecordActions row={row} />,
    },
]
