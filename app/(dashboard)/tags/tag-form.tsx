"use client"

import React, { useState } from "react"
import { Tag } from "@/types/tag"
import { Form, Formik, FormikHelpers } from "formik"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { DisabledIcon, SaveIcon } from "@/components/icons"
import * as Yup from "yup"
import { createNewTag, updateTag } from "@/app/actions/tag.actions"
import { useToast } from "@/components/hooks/use-toast"
import CustomSelectField from "@/components/common/custom-select-field"
import { useRouter } from "next/navigation"

type TagFormProps = {
    tag: Tag | null
    isEditPage?: boolean
}

const TagForm = ({ tag, isEditPage = false }: TagFormProps) => {

    const initialValues: Tag = {
        id: tag?.id ? tag.id : "",
        name: tag?.name ? tag.name : "",
        type: tag?.type ? tag.type : undefined, // No default - let validation catch it
        status: tag?.status !== undefined ? tag.status : 1, // Default Active (1)
        createdAt: tag?.createdAt ? tag.createdAt : new Date(),
        updatedAt: tag?.updatedAt ? tag.updatedAt : new Date(),
    }
    const [loading, setLoading] = useState<boolean>(false)
    const { toast } = useToast()
    const router = useRouter()

    const validationSchema = Yup.object({
        name: Yup.string()
            .min(1, "This field is mandatory")
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        type: Yup.number()
            .typeError("Type is required")
            .required("This field is mandatory")
            .min(1, "Type is required"),
        status: Yup.number()
            .oneOf([0, 1], "Status must be Inactive (0) or Active (1)")
            .required("This field is mandatory"),
    })

    const handleSubmit = async (
        values: Tag,
        { resetForm, setErrors, setTouched }: FormikHelpers<Tag>
    ) => {
        try {
            setLoading(true);
            let respond: any;

            if (tag && tag.id) {
                respond = await updateTag(tag.id, values);
                setLoading(false);

                if (!respond?.success) {
                    // Handle server-side validation errors
                    if (respond?.error?.issues) {
                        const fieldErrors: any = {};
                        const touchedFields: any = {};
                        Object.keys(respond.error.issues).forEach((key) => {
                            const errorArray = respond.error.issues[key];
                            if (Array.isArray(errorArray) && errorArray.length > 0) {
                                fieldErrors[key] = errorArray[0];
                                touchedFields[key] = true;
                            }
                        });
                        setErrors(fieldErrors);
                        setTouched(touchedFields);
                        toast({
                            variant: 'destructive',
                            title: 'Validation Error',
                            description: respond.error.message || 'Please check the form for errors.'
                        });
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: respond.error?.message || 'Tag update unsuccessful.'
                        });
                    }
                    return;
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Tag was saved successfully",
                })
                // Redirect back to list page after successful update
                router.push('/tags')
            } else {
                respond = await createNewTag(values);
                setLoading(false);

                if (!respond?.success) {
                    // Handle server-side validation errors
                    if (respond?.error?.issues) {
                        const fieldErrors: any = {};
                        const touchedFields: any = {};
                        Object.keys(respond.error.issues).forEach((key) => {
                            const errorArray = respond.error.issues[key];
                            if (Array.isArray(errorArray) && errorArray.length > 0) {
                                fieldErrors[key] = errorArray[0];
                                touchedFields[key] = true;
                            }
                        });
                        setErrors(fieldErrors);
                        setTouched(touchedFields);
                        toast({
                            variant: 'destructive',
                            title: 'Validation Error',
                            description: respond.error.message || 'Please check the form for errors.'
                        });
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: respond.error?.message || 'Tag save unsuccessful.'
                        });
                    }
                    return;
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Tag was created successfully",
                })
                
                // Redirect to edit page with the new tag id, or list
                 router.push('/tags')
            }
        } catch (error: any) {
            setLoading(false);
            // Handle client-side validation errors
            if (error.name === 'ValidationError') {
                const fieldErrors: any = {};
                const touchedFields: any = {};
                error.inner.forEach((err: any) => {
                    if (err.path) {
                        fieldErrors[err.path] = err.message;
                        touchedFields[err.path] = true;
                    }
                });
                setErrors(fieldErrors);
                setTouched(touchedFields);
                toast({
                    variant: 'destructive',
                    title: 'Validation Error',
                    description: 'Please check the form for errors.'
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? "Tag save unsuccessful.",
                })
            }
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
                                placeholder="Tag Name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="type"
                                placeholder="Type"
                                value={formik.values.type?.toString() || ""}
                                onChange={(value) => {
                                    formik.setFieldValue("type", parseInt(value));
                                    formik.setFieldTouched("type", true);
                                }}
                                required
                                options={[
                                    { id: "1", name: "Area" },
                                    { id: "2", name: "Bank" },
                                    { id: "3", name: "Staff Category" },
                                    { id: "4", name: "Staff Designation" },
                                    { id: "5", name: "Staff Grade" },
                                ]}
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="status"
                                placeholder="Status"
                                value={formik.values.status?.toString()}
                                onChange={(value) => formik.setFieldValue("status", parseInt(value))}
                                required={false}
                                options={[
                                    { id: "0", name: "Inactive" },
                                    { id: "1", name: "Active" }
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
                                        router.push('/tags')
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

export default TagForm
