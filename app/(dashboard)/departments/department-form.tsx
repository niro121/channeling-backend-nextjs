"use client"

import React, { useState } from "react"
import { Department } from "@/types/department"
import { Form, Formik, FormikHelpers } from "formik"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { DisabledIcon, SaveIcon } from "@/components/icons"
import * as Yup from "yup"
import { createNewDepartment, updateDepartment } from "@/app/actions/department.actions"
import { useToast } from "@/components/hooks/use-toast"
import CustomSelectField from "@/components/common/custom-select-field"
import { useRouter } from "next/navigation"

type DepartmentFormProps = {
    department: Department | null
    isEditPage?: boolean
}

const DepartmentForm = ({ department, isEditPage = false }: DepartmentFormProps) => {

    const initialValues: Department = {
        id: department?.id ? department.id : "",
        name: department?.name ? department.name : "",
        description: department?.description ? department.description : undefined,
        visibility: department?.visibility !== undefined ? department.visibility : 0,
        createdAt: department?.createdAt ? department.createdAt : new Date(),
        updatedAt: department?.updatedAt ? department.updatedAt : new Date(),
    }
    const [loading, setLoading] = useState<boolean>(false)
    const { toast } = useToast()
    const router = useRouter()

    const validationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        description: Yup.string()
            .max(500, "Must be less than 500 characters"),
        visibility: Yup.number()
            .oneOf([0, 1], "Visibility must be Unpublish (0) or Publish (1)")
            .required("This field is mandatory"),
    })

    const handleSubmit = async (
        values: Department,
        { resetForm }: FormikHelpers<Department>
    ) => {
        try {
            let respond: any;

            setLoading(true)

            if (department && department.id) {
                respond = await updateDepartment(department.id, values)
                
                setLoading(false)

                if (respond.isError) {
                    throw new Error(respond.errors.message)
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Department was saved successfully",
                })
                // Redirect back to list page after successful update
                router.push('/departments')
            } else {
                respond = await createNewDepartment(values)
                
                setLoading(false)

                if (respond.isError) {
                    throw new Error(respond.errors.message)
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Department was created successfully",
                })
                
                // Redirect to edit page with the new department id
                if (respond.data?.id) {
                    router.push(`/departments/${respond.data.id}/edit`)
                } else {
                    // Fallback: redirect to list if redirect fails
                    router.push('/departments')
                }
            }
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "Department save unsuccessful.",
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
                        <div className="grid gap-4 border rounded-lg p-6">
                            <CustomFormField
                                type="text"
                                id="name"
                                placeholder="Department Name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomFormField
                                type="textarea"
                                id="description"
                                placeholder="Description"
                                value={formik.values.description || ""}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required={false}
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="visibility"
                                placeholder="Visibility"
                                value={formik.values.visibility?.toString()}
                                onChange={(value) => formik.setFieldValue("visibility", parseInt(value))}
                                required
                                options={[
                                    { id: "0", name: "Unpublish" },
                                    { id: "1", name: "Publish" }
                                ]}
                                styleClasses={styleClasses}
                            />

                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                                    type="button"
                                    onClick={() => {
                                        router.push('/departments')
                                    }}
                                    disabled={loading}
                                >
                                    <DisabledIcon />
                                    <span>
                                        Cancel
                                    </span>
                                </Button>
                                <Button
                                    disabled={loading}
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
                )
            }}
        </Formik>
    )
}

export default DepartmentForm

