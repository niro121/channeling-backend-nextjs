"use client"

import React, { useState } from "react"
import { Roster } from "@/types/roster"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteRoster } from "@/app/actions/roster.actions"
import Link from "next/link"

interface RosterActionsProps<TData extends Roster> {
    row: Row<TData>
}

const RosterRecordActions = <TData extends Roster>({
    row,
}: RosterActionsProps<TData>) => {
    const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const roster = row.original

    const showHideDeleteModal = (value: boolean) => {
        setShowDelConfirmation(value)
    }

    const onDeleteConfirmation = async () => {
        if (roster.id) {
            try {
                setLoading(true)
                await deleteRoster(roster.id)

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Roster was deleted successfully",
                })
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? "Roster deletion unsuccessful",
                })
            } finally {
                setLoading(false)
                showHideDeleteModal(false)
            }
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Roster id not found.",
            })
        }
    }

    return (
        <>
            <DataTableRowActions>
                <DropdownMenuItem asChild>
                    <Link href={`/rosters/${roster.id}/edit`}>
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
                            roster and remove the data from our servers."
                handleContinue={onDeleteConfirmation}
            />
        </>
    )
}

export default RosterRecordActions
