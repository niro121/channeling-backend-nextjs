"use client"

import React, { useState } from "react"
import { Zone } from "@/types/zone"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteZone } from "@/app/actions/zone.actions"
import Link from "next/link"

interface ZoneActionsProps<TData extends Zone> {
    row: Row<TData>
}

const ZoneRecordActions = <TData extends Zone>({
    row,
}: ZoneActionsProps<TData>) => {
    const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const zone = row.original

    const showHideDeleteModal = (value: boolean) => {
        setShowDelConfirmation(value)
    }

    const onDeleteConfirmation = async () => {
        if (zone.id) {
            try {
                setLoading(true)
                await deleteZone(zone.id)

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Zone was deleted successfully",
                })
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? "Zone deletion unsuccessful",
                })
            } finally {
                setLoading(false)
                showHideDeleteModal(false)
            }
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Zone id not found.",
            })
        }
    }

    return (
        <>
            <DataTableRowActions>
                <DropdownMenuItem asChild>
                    <Link href={`/zones/${zone.id}/edit`}>
                        Edit
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => showHideDeleteModal(true)}>
                    Delete
                </DropdownMenuItem>
            </DataTableRowActions>

            <CustomAlertDialog
                open={showDeleteConfirmation}
                handleVisibilityChange={showHideDeleteModal}
                loading={loading}
                title="Are you absolutely sure?"
                description="This action cannot be undone. This will permanently delete this
                            zone and remove the data from our servers."
                handleContinue={onDeleteConfirmation}
            />
        </>
    )
}

export default ZoneRecordActions
