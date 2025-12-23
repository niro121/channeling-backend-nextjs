import React, { useState } from "react"
import { User } from "@/types/user"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { CustomDialog } from "@/components/common/custom-dialog"
import UserForm from "./user-form"
import { deleteUser } from "@/app/actions/user.actions"
import { useSession } from "next-auth/react"

interface UserActionsProps<TData extends User> {
    row: Row<TData>
}

const UserRecordActions = <TData extends User>({
    row,
}: UserActionsProps<TData>) => {
    const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const { data: session } = useSession()

    const user = row.original

    const showHideDeleteModal = (value: boolean) => {
        setShowDelConfirmation(value)
    }

    const onDeleteConfirmation = async () => {
        if (user.id) {
            try {
                setLoading(true)
                await deleteUser(user.id)

                toast({
                    variant: "success",
                    title: "Success",
                    description: "User was deleted successfully",
                })
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? "User deletion unsuccessful",
                })
            } finally {
                setLoading(false)
                showHideDeleteModal(false)
            }
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "User id not found.",
            })
        }
    }

    return (
        <>
            <DataTableRowActions>
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    Edit
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
                            user and remove the data from our servers."
                handleContinue={onDeleteConfirmation}
            />

            <CustomDialog
                open={showEditDialog}
                setOpen={setShowEditDialog}
                title="Edit User"
                width="800px"
            >
                <UserForm user={user} sessionRole={session?.user?.role} />
            </CustomDialog>
        </>
    )
}

export default UserRecordActions
