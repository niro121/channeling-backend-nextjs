"use client"

import React, { useState, useEffect } from "react"
import { UserGroup, RESOURCES, PERMISSION_ACTIONS, ResourcePermissions, Permissions, ResourceWithOptionalActions } from "@/types/user-group"
import { Form, Formik, FormikHelpers } from "formik"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Ban, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import * as Yup from "yup"
import { Separator } from "@/components/ui/separator"
import { createNewUserGroup, updateUserGroup } from "@/app/actions/user-group.actions"
import { useToast } from "@/components/hooks/use-toast"
import { Label } from "@/components/ui/label"
import CustomSelectField from "@/components/common/custom-select-field"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDialogSafe } from "@/components/common/custom-dialog"
import { Switch } from "@/components/ui/switch"
import { TWO_FACTOR_AUTH } from "@/types/2FA"

type UserGroupFormProps = {
    userGroup: UserGroup | null
    sessionUserType: number | undefined
    isEditPage?: boolean
}

const UserGroupForm = ({ userGroup, sessionUserType, isEditPage = false }: UserGroupFormProps) => {
    const [initialValues, setInitialValues] = useState<UserGroup>({
        id: userGroup?.id ? userGroup.id : "",
        name: userGroup?.name ? userGroup.name : "",
        description: userGroup?.description ? userGroup.description : "",
        status: userGroup?.status !== undefined ? userGroup.status : 1,
        permissions: userGroup?.permissions || initializePermissions(),
        twoFactorEnabled: (userGroup as any)?.twoFactorEnabled ?? false,
        twoFactorMethods: Array.isArray((userGroup as any)?.twoFactorMethods) ? (userGroup as any).twoFactorMethods : [],
        createdAt: userGroup?.createdAt ? userGroup.createdAt : new Date(),
    })
    const [loading, setLoading] = useState<boolean>(false)
    const saveAndCloseRef = React.useRef<boolean>(false)
    const dialogContext = useDialogSafe()
    const { toast } = useToast()
    const router = useRouter()
    
    // Use dialog context if available, otherwise use no-op function
    const setDialogOpen = dialogContext?.setDialogOpen || (() => {})

    function initializePermissions(): Permissions {
        const perms: Permissions = {}
        RESOURCES.forEach(resource => {
            perms[resource.id] = {
                view: false,
                add: false,
                edit: false,
                delete: false,
            }
        })
        return perms
    }

    const validationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        status: Yup.number()
            .oneOf([0, 1], "Status must be Active (1) or Inactive (0)")
            .required("This field is mandatory"),
    })

    const handleSubmit = async (
        values: UserGroup,
        { resetForm }: FormikHelpers<UserGroup>
    ) => {
        const closeAfterSave = saveAndCloseRef.current
        try {
            let respond: any;

            setLoading(true)

            if (userGroup && userGroup.id) {
                respond = await updateUserGroup(userGroup.id, values)
            } else {
                respond = await createNewUserGroup(values)
            }

            setLoading(false)

            if (respond.isError) {
                throw new Error(respond.errors.message)
            }

            toast({
                variant: "success",
                title: "Success",
                description: "User group was saved successfully",
            })

            if (dialogContext) {
                if (closeAfterSave) {
                    resetForm(initialValues)
                    setDialogOpen(false)
                }
                return
            }

            if (userGroup && userGroup.id) {
                if (closeAfterSave) router.push("/user-groups")
                else router.refresh()
            } else {
                const newId = respond?.data?.id
                if (closeAfterSave) router.push("/user-groups")
                else if (newId) router.push(`/user-groups/${newId}/edit`)
                else router.push("/user-groups")
            }
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "User group save unsuccessful.",
            })
        }
    }

    const handleSyncPermissions = (formik: any) => {
        // Sync all permissions - set all to true for all resources
        const syncedPermissions: Permissions = {}
        RESOURCES.forEach(resource => {
            syncedPermissions[resource.id] = {
                view: true,
                add: true,
                edit: true,
                delete: true,
            }
        })
        formik.setFieldValue("permissions", syncedPermissions)
    }

    const handleSelectAll = (formik: any, resource: ResourceWithOptionalActions) => {
        const currentPermissions = { ...formik.values.permissions }
        const actions = resource.actions?.length ? resource.actions : (["view", "add", "edit", "delete"] as const)
        currentPermissions[resource.id] = {
            view: actions.includes("view"),
            add: actions.includes("add"),
            edit: actions.includes("edit"),
            delete: actions.includes("delete"),
        }
        formik.setFieldValue("permissions", currentPermissions)
    }

    const handleDeselectAll = (formik: any, resource: ResourceWithOptionalActions) => {
        const currentPermissions = { ...formik.values.permissions }
        const actions = resource.actions?.length ? resource.actions : (["view", "add", "edit", "delete"] as const)
        currentPermissions[resource.id] = {
            view: actions.includes("view") ? false : (formik.values.permissions[resource.id]?.view ?? false),
            add: actions.includes("add") ? false : (formik.values.permissions[resource.id]?.add ?? false),
            edit: actions.includes("edit") ? false : (formik.values.permissions[resource.id]?.edit ?? false),
            delete: actions.includes("delete") ? false : (formik.values.permissions[resource.id]?.delete ?? false),
        }
        formik.setFieldValue("permissions", currentPermissions)
    }

    const handlePermissionChange = (
        formik: any,
        resourceId: string,
        action: "view" | "add" | "edit" | "delete",
        value: boolean
    ) => {
        const currentPermissions = { ...formik.values.permissions }
        if (!currentPermissions[resourceId]) {
            currentPermissions[resourceId] = {
                view: false,
                add: false,
                edit: false,
                delete: false,
            }
        }
        currentPermissions[resourceId] = {
            ...currentPermissions[resourceId],
            [action]: value,
        }
        formik.setFieldValue("permissions", currentPermissions)
    }

    return (
        <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validationSchema={validationSchema}
            enableReinitialize
        >
            {(formik) => {
                const styleClasses = {
                    parentDiv: "grid grid-cols-1 items-center gap-4 sm:grid-cols-4",
                    labelClassName: "text-sm text-black font-semibold capitalize",
                    inputClassName: "col-span-full sm:col-span-3",
                }

                return (
                    <Form className="w-full">
                        <div className="grid gap-4 py-4">
                            {/* Basic Information Section */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Basic Information</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Enter the basic details for this user group.
                                    </p>
                                </div>

                                <CustomFormField
                                    type="text"
                                    id="name"
                                    placeholder="Group Name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    required
                                    styleClasses={styleClasses}
                                />

                                <div className={styleClasses.parentDiv}>
                                    <Label className={styleClasses.labelClassName}>
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Description"
                                        value={formik.values.description || ""}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className={styleClasses.inputClassName}
                                        rows={3}
                                    />
                                </div>

                                <CustomSelectField
                                    id="status"
                                    placeholder="Status"
                                    value={formik.values.status?.toString()}
                                    onChange={(value) => formik.setFieldValue("status", parseInt(value))}
                                    required
                                    options={[
                                        { id: "1", name: "Active" },
                                        { id: "0", name: "Inactive" }
                                    ]}
                                    styleClasses={styleClasses}
                                />
                            </div>

                            <Separator />

                            {/* Two-factor authentication */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Two-factor authentication</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        When enabled, users in this group must enter a verification code (authenticator app or SMS) at login. (Email method is currently unavailable.)
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="twoFactorEnabled"
                                        checked={formik.values.twoFactorEnabled ?? false}
                                        onCheckedChange={(checked) =>
                                            formik.setFieldValue("twoFactorEnabled", !!checked)
                                        }
                                    />
                                    <Label htmlFor="twoFactorEnabled" className="text-sm font-medium">
                                        Require 2FA for this group
                                    </Label>
                                </div>
                                {formik.values.twoFactorEnabled && (
                                    <div className="space-y-2 pl-2">
                                        <Label className="text-sm font-medium">Allowed methods</Label>
                                        {/* EMAIL ('3') is currently unavailable — not shown in TWO_FACTOR_AUTH */}
                                        <div className="flex flex-wrap gap-4">
                                            {TWO_FACTOR_AUTH.map((method) => {
                                                const methods = formik.values.twoFactorMethods ?? [];
                                                const isChecked = methods.includes(method.id);
                                                return (
                                                    <div
                                                        key={method.id}
                                                        className="flex items-center space-x-2"
                                                    >
                                                        <Checkbox
                                                            id={`2fa-${method.id}`}
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => {
                                                                const next = checked
                                                                    ? [...methods, method.id]
                                                                    : methods.filter((m) => m !== method.id);
                                                                formik.setFieldValue("twoFactorMethods", next);
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`2fa-${method.id}`}
                                                            className="text-sm font-normal cursor-pointer"
                                                        >
                                                            {method.option}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Permissions Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-1">Permissions</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Select the permissions for this user group. Permissions are organized by resource.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSyncPermissions(formik)}
                                        className="gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Sync Permissions
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {RESOURCES.map((resource) => {
                                        const resourcePermissions = formik.values.permissions[resource.id] || {
                                            view: false,
                                            add: false,
                                            edit: false,
                                            delete: false,
                                        }

                                        return (
                                            <div key={resource.id} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-base font-semibold">
                                                        {resource.name}
                                                    </Label>
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectAll(formik, resource)}
                                                            className="text-sm text-muted-foreground hover:text-foreground underline"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeselectAll(formik, resource)}
                                                            className="text-sm text-muted-foreground hover:text-foreground underline"
                                                        >
                                                            Deselect All
                                                        </button>
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const actionsToShow = resource.actions?.length
                                                        ? PERMISSION_ACTIONS.filter((a) => resource.actions!.includes(a.id))
                                                        : PERMISSION_ACTIONS
                                                    return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {actionsToShow.map((action) => {
                                                        const label = resource.actionLabels?.[action.id] ?? action.name
                                                        const description = resource.actionLabels?.[action.id] ? "" : action.description
                                                        return (
                                                        <div
                                                            key={action.id}
                                                            className="flex items-center space-x-2 p-3 border rounded-md"
                                                        >
                                                            <Checkbox
                                                                id={`${resource.id}-${action.id}`}
                                                                checked={resourcePermissions[action.id] || false}
                                                                onCheckedChange={(checked) =>
                                                                    handlePermissionChange(
                                                                        formik,
                                                                        resource.id,
                                                                        action.id,
                                                                        checked as boolean
                                                                    )
                                                                }
                                                            />
                                                            <div className="flex-1">
                                                                <Label
                                                                    htmlFor={`${resource.id}-${action.id}`}
                                                                    className="text-sm font-medium cursor-pointer"
                                                                >
                                                                    {label}
                                                                </Label>
                                                                {description ? (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {description}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        )
                                                    })}
                                                </div>
                                                    )
                                                })()}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <Separator />

                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                                    type="button"
                                    onClick={() => {
                                        if (dialogContext) {
                                            setDialogOpen(false)
                                            formik.resetForm(initialValues)
                                        } else {
                                            router.push("/user-groups")
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    <Ban className="h-4 w-4" />
                                    <span>Cancel</span>
                                </Button>
                                <Button
                                    disabled={!sessionUserType || loading}
                                    size="sm"
                                    type="button"
                                    className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                    onClick={() => {
                                        saveAndCloseRef.current = false
                                        formik.submitForm()
                                    }}
                                >
                                    <Save className="h-4 w-4" />
                                    <span>Save</span>
                                </Button>
                                <Button
                                    disabled={!sessionUserType || loading}
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                    className="w-full sm:w-auto gap-1 px-6"
                                    onClick={() => {
                                        saveAndCloseRef.current = true
                                        formik.submitForm()
                                    }}
                                >
                                    <Save className="h-4 w-4" />
                                    <span>Save and Close</span>
                                </Button>
                            </div>
                        </div>
                    </Form>
                )
            }}
        </Formik>
    )
}

export default UserGroupForm
