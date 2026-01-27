import React, { useState, useEffect } from "react"
import { User } from "@/types/user"
import { Row } from "@tanstack/react-table"
import { useToast } from "@/components/hooks/use-toast"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import CustomAlertDialog from "@/components/common/custom-alert-dialog"
import { CustomDialog } from "@/components/common/custom-dialog"
import UserForm from "./user-form"
import { deleteUser } from "@/app/actions/user.actions"
import { useSession } from "next-auth/react"
import { getAllUserGroupsOptions } from "@/app/actions/user-group.actions"
import { usePermissions } from "@/components/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { BinIcon } from "@/components/icons"

interface UserActionsProps<TData extends User> {
    row: Row<TData>
}

const UserRecordActions = <TData extends User>({
    row,
}: UserActionsProps<TData>) => {
    const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [loading, setLoading] = useState(false)
    const [userGroupOptions, setUserGroupOptions] = useState<{ id: string; name: string }[]>([])
    const { toast } = useToast()
    const { data: session } = useSession()
    const { has } = usePermissions()

    const user = row.original

    useEffect(() => {
        const fetchUserGroups = async () => {
            try {
                const { data } = await getAllUserGroupsOptions()
                setUserGroupOptions(data.map(ug => ({ id: ug.id, name: ug.name })))
            } catch (error) {
                console.error("Error fetching user groups:", error)
            }
        }
        fetchUserGroups()
    }, [])

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
                {has("users", "edit") && (
                    <Button
                        variant={'link'}
                        className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
                        onClick={() => setShowEditDialog(true)}
                    >
                        <Edit className="w-5 h-5" />
                        <span className="sr-only">Edit</span>
                    </Button>
                )}
                {has("users", "delete") && (
                    <Button
                        variant={'link'}
                        className="w-fit h-fit p-1 active:scale-95 transition duration-75 cursor-pointer"
                        onClick={() => showHideDeleteModal(true)}
                    >
                        <BinIcon className="w-5 h-5 text-red-600" />
                        <span className="sr-only">Delete</span>
                    </Button>
                )}
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
                <UserForm 
                    user={user} 
                    sessionUserType={session?.user?.userType}
                    userGroupOptions={userGroupOptions}
                />
            </CustomDialog>
        </>
    )
}

export default UserRecordActions
