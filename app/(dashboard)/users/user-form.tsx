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
import { createNewUser, updateUser } from "@/app/actions/user.actions"
import { useToast } from "@/components/hooks/use-toast"
import { Label } from "@/components/ui/label"
import CustomSelectField from "@/components/common/custom-select-field"

type UserFormProps = {
    user: User | null
    sessionUserType: number | undefined
}

const UserForm = ({ user, sessionUserType }: UserFormProps) => {

    const [tab, setTab] = useState("main")
    const [initialValues, setInitialValues] = useState<User>({
        id: user?.id ? user.id : "",
        name: user?.name ? user.name : "",
        email: user?.email ? user.email : "",
        password: "",
        confirmPassword: "",
        userType: user?.userType ? user.userType : 2, // Default to staff (2)
        status: user?.status ? user.status : 1,
        createdAt: user?.createdAt ? user.createdAt : new Date(),
    })
    const [loading, setLoading] = useState<boolean>(false)
    const { setDialogOpen } = useDialog()
    const { toast } = useToast()

    const validationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),

        email: Yup.string()
            .email("Invalid email address")
            .required("This field is mandatory"),

        password: Yup.string().when([], ([]) => {
            return user
                ? Yup.string()
                    .matches(
                        /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
                        "Password must only contain a mix of uppercase and lowercase letters,\nnumbers, and special characters"
                    )
                    .min(8, "Must be at least 8 characters long")
                : Yup.string()
                    .matches(
                        /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
                        "Password must only contain a mix of uppercase and lowercase letters,\nnumbers, and special characters"
                    )
                    .min(8, "Must be at least 8 characters long")
                    .required("This field is mandatory")
        }),

        confirmPassword: Yup.string().when("password", ([password]) => {
            return password
                ? Yup.string()
                    .oneOf([Yup.ref("password")], "Passwords must match")
                    .required("This field is mandatory")
                : user
                    ? Yup.string().oneOf([Yup.ref("password")], "Passwords must match")
                    : Yup.string()
                        .oneOf([Yup.ref("password")], "Passwords must match")
                        .required("This field is mandatory")
        }),

        userType: Yup.number()
            .oneOf([1, 2], "User type must be Admin (1) or Staff (2)")
            .required("This field is mandatory"),
    })

    const handleSubmit = async (
        values: User,
        { resetForm }: FormikHelpers<User>
    ) => {
        try {
            let respond: any;

            setLoading(true)

            if (user && user.id) {
                respond = await updateUser(user.id, values, user.password)
            } else {
                respond = await createNewUser(values)
            }

            setLoading(false)

            if (respond.isError) {
                throw new Error(respond.errors.message)
            }

            toast({
                variant: "success",
                title: "Success",
                description: "User was saved successfully",
            })
            resetForm(initialValues)
            setDialogOpen(false)
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "User save unsuccessful.",
            })
        }
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
                        <Tabs defaultValue="app_version" className="w-full" value={tab}>

                            <TabsContent value="main">
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

                                    {user && (
                                        <>
                                            <Separator />

                                            <div className="flex items-center align-middle mb-3">
                                                <Checkbox
                                                    id="status"
                                                    checked={formik.values.status === 1 ? true : false}
                                                    onCheckedChange={(value) => {
                                                        if (value) {
                                                            formik.setFieldValue("status", "1")
                                                        } else {
                                                            formik.setFieldValue("status", "0")
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
                                        </>
                                    )}

                                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                                            type="reset"
                                            onClick={() => {
                                                setDialogOpen(false)
                                                formik.resetForm(initialValues)
                                            }}
                                            disabled={loading}
                                        >
                                            <DisabledIcon />
                                            <span>
                                                Cancel
                                            </span>
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
                            </TabsContent>

                        </Tabs>
                    </Form>
                )
            }}
        </Formik>
    )
}

export default UserForm
