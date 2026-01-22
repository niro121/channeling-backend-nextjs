import React, { useState } from "react"
import { UserGroup } from "@/types/user-group"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { deleteUserGroup } from "@/app/actions/user-group.actions"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/components/hooks/use-permissions"

interface UserGroupActionsProps<TData extends UserGroup> {
    row: Row<TData>
}

const UserGroupRecordActions = <TData extends UserGroup>({
    row,
}: UserGroupActionsProps<TData>) => {
    const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()
    const { has } = usePermissions()

    const userGroup = row.original

    const showHideDeleteModal = (value: boolean) => {
        setShowDelConfirmation(value)
    }

    const onDeleteConfirmation = async () => {
        if (userGroup.id) {
            try {
                setLoading(true)
                await deleteUserGroup(userGroup.id)

                toast({
                    variant: "success",
                    title: "Success",
                    description: "User group was deleted successfully",
                })
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? "User group deletion unsuccessful",
                })
            } finally {
                setLoading(false)
                showHideDeleteModal(false)
            }
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "User group id not found.",
            })
        }
    }

    return (
        <>
            <DataTableRowActions>
                {has("users", "edit") && (
                    <DropdownMenuItem onClick={() => router.push(`/user-groups/${userGroup.id}/edit`)}>
                        Edit
                    </DropdownMenuItem>
                )}
                {has("users", "delete") && (
                    <DropdownMenuItem onClick={() => showHideDeleteModal(true)}>
                        Delete
                    </DropdownMenuItem>
                )}
            </DataTableRowActions>

            <CustomAlertDialog
                open={showDeleteConfirmation}
                handleVisibilityChange={showHideDeleteModal}
                loading={loading}
                title="Are you absolutely sure?"
                description="This action cannot be undone. This will permanently delete this
                            user group and remove the data from our servers."
                handleContinue={onDeleteConfirmation}
            />
        </>
    )
}

export default UserGroupRecordActions
