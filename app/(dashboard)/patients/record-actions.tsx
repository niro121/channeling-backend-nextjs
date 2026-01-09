"use client"

import React, { useState } from "react"
import { Patient } from "@/types/patient"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deletePatientAction } from "@/app/actions/patient.actions"
import Link from "next/link"

interface PatientActionsProps<TData extends Patient> {
    row: Row<TData>
}

const PatientRecordActions = <TData extends Patient>({
    row,
}: PatientActionsProps<TData>) => {
    const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const patient = row.original

    const showHideDeleteModal = (value: boolean) => {
        setShowDelConfirmation(value)
    }

    const onDeleteConfirmation = async () => {
        if (patient.id) {
            try {
                setLoading(true)
                await deletePatientAction(patient.id)

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Patient was deleted successfully",
                })
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? "Patient deletion unsuccessful",
                })
            } finally {
                setLoading(false)
                showHideDeleteModal(false)
            }
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Patient id not found.",
            })
        }
    }

    return (
        <>
            <DataTableRowActions>
                <DropdownMenuItem asChild>
                    <Link href={`/patients/${patient.id}/edit`}>
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
                            patient and remove the data from our servers."
                handleContinue={onDeleteConfirmation}
            />
        </>
    )
}

export default PatientRecordActions
