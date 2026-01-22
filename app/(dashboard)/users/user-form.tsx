"use client"

import React, { useState } from "react"
import { User } from "@/types/user"
import { Form, Formik, FormikHelpers } from "formik"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { DisabledIcon, SaveIcon } from "@/components/icons"
import { Checkbox } from "@/components/ui/checkbox"
import * as Yup from "yup"
import { useDialog } from "@/components/common/custom-dialog"
import { Separator } from "@/components/ui/separator"
import { createNewUser, updateUser, updateUserPassword } from "@/app/actions/user.actions"
import { useToast } from "@/components/hooks/use-toast"
import { Label } from "@/components/ui/label"
import CustomSelectField from "@/components/common/custom-select-field"

type UserFormProps = {
    user: User | null
    sessionUserType: number | undefined
    userGroupOptions?: { id: string; name: string }[]
}

const UserForm = ({ user, sessionUserType, userGroupOptions = [] }: UserFormProps) => {
    const isEditMode = !!user && !!user.id
    const [tab, setTab] = useState(isEditMode ? "settings" : "main")
    const [loading, setLoading] = useState<boolean>(false)
    const [passwordLoading, setPasswordLoading] = useState<boolean>(false)
    const { setDialogOpen } = useDialog()
    const { toast } = useToast()

    // Initial values for user settings
    const settingsInitialValues = {
        name: user?.name || "",
        email: user?.email || "",
        userType: user?.userType || 2,
        userGroupId: user?.userGroupId || "",
        status: user?.status !== undefined ? user.status : 1,
    }

    // Initial values for password change
    const passwordInitialValues = {
        password: "",
        confirmPassword: "",
    }

    // Initial values for new user (includes password)
    const newUserInitialValues: User = {
        id: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        userType: 2,
        status: 1,
        userGroupId: "",
    }

    // Validation schema for user settings
    const settingsValidationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        email: Yup.string()
            .email("Invalid email address")
            .required("This field is mandatory"),
        userType: Yup.number()
            .oneOf([1, 2], "User type must be Admin (1) or Staff (2)")
            .required("This field is mandatory"),
    })

    // Validation schema for password change
    const passwordValidationSchema = Yup.object({
        password: Yup.string()
            .matches(
                /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
                "Password must only contain a mix of uppercase and lowercase letters, numbers, and special characters"
            )
            .min(8, "Must be at least 8 characters long")
            .required("This field is mandatory"),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref("password")], "Passwords must match")
            .required("This field is mandatory"),
    })

    // Validation schema for new user
    const newUserValidationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        email: Yup.string()
            .email("Invalid email address")
            .required("This field is mandatory"),
        password: Yup.string()
            .matches(
                /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
                "Password must only contain a mix of uppercase and lowercase letters, numbers, and special characters"
            )
            .min(8, "Must be at least 8 characters long")
            .required("This field is mandatory"),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref("password")], "Passwords must match")
            .required("This field is mandatory"),
        userType: Yup.number()
            .oneOf([1, 2], "User type must be Admin (1) or Staff (2)")
            .required("This field is mandatory"),
    })

    const handleSettingsSubmit = async (
        values: typeof settingsInitialValues,
        { resetForm }: FormikHelpers<typeof settingsInitialValues>
    ) => {
        try {
            setLoading(true)

            // Fetch current user to get the password
            const { fetchUserById } = await import("@/app/actions/user.actions")
            const currentUser = await fetchUserById(user!.id!)
            
            const userPayload: User = {
                ...currentUser,
                ...values,
                password: "", // Empty password means keep existing
            } as User

            const respond = await updateUser(user!.id!, userPayload, (currentUser as any).password)

            setLoading(false)

            if (respond.isError) {
                throw new Error(respond.errors.message)
            }

            toast({
                variant: "success",
                title: "Success",
                description: "User settings were saved successfully",
            })
            resetForm({ values: settingsInitialValues })
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "User settings save unsuccessful.",
            })
        }
    }

    const handlePasswordSubmit = async (
        values: typeof passwordInitialValues,
        { resetForm }: FormikHelpers<typeof passwordInitialValues>
    ) => {
        try {
            setPasswordLoading(true)

            const respond = await updateUserPassword(user!.id!, values.password)

            setPasswordLoading(false)

            if (respond.isError) {
                throw new Error(respond.errors.message)
            }

            toast({
                variant: "success",
                title: "Success",
                description: "Password was changed successfully",
            })
            resetForm()
        } catch (error: any) {
            setPasswordLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "Password change unsuccessful.",
            })
        }
    }

    const handleNewUserSubmit = async (
        values: User,
        { resetForm }: FormikHelpers<User>
    ) => {
        try {
            setLoading(true)

            const respond = await createNewUser(values)

            setLoading(false)

            if (respond.isError) {
                throw new Error(respond.errors.message)
            }

            toast({
                variant: "success",
                title: "Success",
                description: "User was created successfully",
            })
            resetForm({ values: newUserInitialValues })
            setDialogOpen(false)
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "User creation unsuccessful.",
            })
        }
    }

    const styleClasses = {
        parentDiv: "grid grid-cols-1 items-center gap-4 sm:grid-cols-4",
        labelClassName: "text-sm text-black font-semibold capitalize",
        inputClassName: "col-span-full sm:col-span-3",
    }

    // New User Form (single form with password)
    if (!isEditMode) {
        return (
            <Formik
                initialValues={newUserInitialValues}
                onSubmit={handleNewUserSubmit}
                validationSchema={newUserValidationSchema}
                enableReinitialize
            >
                {(formik) => (
                    <Form className="w-full">
                        <div className="grid gap-4 py-4">
                            <CustomFormField
                                type="text"
                                id="name"
                                placeholder="Full Name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomFormField
                                type="email"
                                id="email"
                                placeholder="Email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomFormField
                                type="password"
                                id="password"
                                placeholder="Password"
                                value={formik.values.password}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomFormField
                                type="password"
                                id="confirmPassword"
                                placeholder="Confirm Password"
                                value={formik.values.confirmPassword}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="userType"
                                placeholder="User Type"
                                value={formik.values.userType?.toString()}
                                onChange={(value) => formik.setFieldValue("userType", parseInt(value))}
                                required
                                options={[
                                    { id: "1", name: "Admin" },
                                    { id: "2", name: "Staff" }
                                ]}
                                styleClasses={styleClasses}
                            />

                            {userGroupOptions.length > 0 && (
                                <CustomSelectField
                                    id="userGroupId"
                                    placeholder="User Group"
                                    value={formik.values.userGroupId || "__none__"}
                                    onChange={(value) => {
                                        const newValue = value === "__none__" ? undefined : value;
                                        formik.setFieldValue("userGroupId", newValue);
                                    }}
                                    required={false}
                                    options={[
                                        { id: "__none__", name: "None" },
                                        ...userGroupOptions
                                    ]}
                                    styleClasses={styleClasses}
                                />
                            )}

                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                                    type="button"
                                    onClick={() => {
                                        setDialogOpen(false)
                                        formik.resetForm({ values: newUserInitialValues })
                                    }}
                                    disabled={loading}
                                >
                                    <DisabledIcon />
                                    <span>Cancel</span>
                                </Button>
                                <Button
                                    disabled={!sessionUserType || loading}
                                    size={"sm"}
                                    type="submit"
                                    className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                >
                                    <SaveIcon />
                                    <span>Save</span>
                                </Button>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        )
    }

    // Edit User Form (two tabs: Settings and Password)
    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="settings">User Settings</TabsTrigger>
                <TabsTrigger value="password">Change Password</TabsTrigger>
            </TabsList>

            {/* User Settings Tab */}
            <TabsContent value="settings">
                <Formik
                    initialValues={settingsInitialValues}
                    onSubmit={handleSettingsSubmit}
                    validationSchema={settingsValidationSchema}
                    enableReinitialize
                >
                    {(formik) => (
                        <Form className="w-full">
                            <div className="grid gap-4 py-4">
                                <CustomFormField
                                    type="text"
                                    id="name"
                                    placeholder="Full Name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    required
                                    styleClasses={styleClasses}
                                />

                                <CustomFormField
                                    type="email"
                                    id="email"
                                    placeholder="Email"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    required
                                    styleClasses={styleClasses}
                                />

                                <CustomSelectField
                                    id="userType"
                                    placeholder="User Type"
                                    value={formik.values.userType?.toString()}
                                    onChange={(value) => formik.setFieldValue("userType", parseInt(value))}
                                    required
                                    options={[
                                        { id: "1", name: "Admin" },
                                        { id: "2", name: "Staff" }
                                    ]}
                                    styleClasses={styleClasses}
                                />

                                {userGroupOptions.length > 0 && (
                                    <CustomSelectField
                                        id="userGroupId"
                                        placeholder="User Group"
                                        value={formik.values.userGroupId || "__none__"}
                                        onChange={(value) => {
                                            const newValue = value === "__none__" ? undefined : value;
                                            formik.setFieldValue("userGroupId", newValue);
                                        }}
                                        required={false}
                                        options={[
                                            { id: "__none__", name: "None" },
                                            ...userGroupOptions
                                        ]}
                                        styleClasses={styleClasses}
                                    />
                                )}

                                <Separator />

                                <div className="flex items-center align-middle mb-3">
                                    <Checkbox
                                        id="status"
                                        checked={formik.values.status === 1 ? true : false}
                                        onCheckedChange={(value) => {
                                            if (value) {
                                                formik.setFieldValue("status", 1)
                                            } else {
                                                formik.setFieldValue("status", 0)
                                            }
                                        }}
                                    />
                                    <Label
                                        htmlFor="status"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-1"
                                    >
                                        Active Login
                                    </Label>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                                        type="button"
                                        onClick={() => {
                                            setDialogOpen(false)
                                            formik.resetForm({ values: settingsInitialValues })
                                        }}
                                        disabled={loading}
                                    >
                                        <DisabledIcon />
                                        <span>Cancel</span>
                                    </Button>
                                    <Button
                                        disabled={!sessionUserType || loading}
                                        size={"sm"}
                                        type="submit"
                                        className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                    >
                                        <SaveIcon />
                                        <span>Save Settings</span>
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    )}
                </Formik>
            </TabsContent>

            {/* Change Password Tab */}
            <TabsContent value="password">
                <Formik
                    initialValues={passwordInitialValues}
                    onSubmit={handlePasswordSubmit}
                    validationSchema={passwordValidationSchema}
                    enableReinitialize
                >
                    {(formik) => (
                        <Form className="w-full">
                            <div className="grid gap-4 py-4">
                                <CustomFormField
                                    type="password"
                                    id="password"
                                    placeholder="New Password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    required
                                    styleClasses={styleClasses}
                                />

                                <CustomFormField
                                    type="password"
                                    id="confirmPassword"
                                    placeholder="Confirm New Password"
                                    value={formik.values.confirmPassword}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    required
                                    styleClasses={styleClasses}
                                />

                                <div className="flex flex-col sm:flex-row justify-end gap-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                                        type="button"
                                        onClick={() => {
                                            formik.resetForm()
                                        }}
                                        disabled={passwordLoading}
                                    >
                                        <DisabledIcon />
                                        <span>Cancel</span>
                                    </Button>
                                    <Button
                                        disabled={!sessionUserType || passwordLoading}
                                        size={"sm"}
                                        type="submit"
                                        className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                    >
                                        <SaveIcon />
                                        <span>Change Password</span>
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    )}
                </Formik>
            </TabsContent>
        </Tabs>
    )
}

export default UserForm
