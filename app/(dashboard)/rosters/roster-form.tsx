"use client"

import React, { useState, useEffect } from "react"
import { Roster } from "@/types/roster"
import { Form, Formik, FormikHelpers } from "formik"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { DisabledIcon, SaveIcon } from "@/components/icons"
import * as Yup from "yup"
import { createNewRoster, updateRoster } from "@/app/actions/roster.actions"
import { useToast } from "@/components/hooks/use-toast"
import CustomSelectField from "@/components/common/custom-select-field"
import { useRouter } from "next/navigation"
import { getAllDepartments } from "@/app/actions/department.actions"

type RosterFormProps = {
    roster: Roster | null
    isEditPage?: boolean
}

const RosterForm = ({ roster, isEditPage = false }: RosterFormProps) => {

    const initialValues: Roster = {
        id: roster?.id ? roster.id : "",
        name: roster?.name ? roster.name : "",
        departmentId: roster?.departmentId ? roster.departmentId : "",
        shiftsPerPersonPerDay: roster?.shiftsPerPersonPerDay ? roster.shiftsPerPersonPerDay : 1,
        status: roster?.status !== undefined ? roster.status : 0,
        createdAt: roster?.createdAt ? roster.createdAt : new Date(),
        updatedAt: roster?.updatedAt ? roster.updatedAt : new Date(),
    }
    const [loading, setLoading] = useState<boolean>(false)
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        const fetchDepartments = async () => {
             try {
                const { data } = await getAllDepartments({ page: "0", limit: "100" }) // Fetch enough departments
                if (data) {
                    setDepartments(data.map(d => ({ id: d.id!, name: d.name })))
                }
             } catch (error) {
                 console.error("Failed to fetch departments", error)
             }
        }
        fetchDepartments()
    }, [])

    const validationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        departmentId: Yup.string()
             .required("This field is mandatory"),
        shiftsPerPersonPerDay: Yup.number()
            .min(1, "Must be at least 1")
            .required("This field is mandatory"),
        status: Yup.number()
            .oneOf([0, 1], "Status must be Unpublish (0) or Publish (1)")
            .required("This field is mandatory"),
    })

    const handleSubmit = async (
        values: Roster,
        { resetForm, setErrors, setTouched }: FormikHelpers<Roster>
    ) => {
        try {
            let respond: any;

            setLoading(true)

            if (roster && roster.id) {
                respond = await updateRoster(roster.id, values)
                
                setLoading(false)

                if (respond.isError) {
                    if (respond.errors?.issues) {
                        const fieldErrors: any = {};
                        const touchedFields: any = {};
                        Object.keys(respond.errors.issues).forEach((key) => {
                            const errorArray = respond.errors.issues[key];
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
                            description: respond.errors.message || 'Please check the form for errors.'
                        });
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: respond.errors?.message || 'Roster save unsuccessful.'
                        });
                    }
                    return;
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Roster was saved successfully",
                })
                // Redirect back to list page after successful update
                router.push('/rosters')
            } else {
                respond = await createNewRoster(values)
                
                setLoading(false)

                if (respond.isError) {
                    if (respond.errors?.issues) {
                        const fieldErrors: any = {};
                        const touchedFields: any = {};
                        Object.keys(respond.errors.issues).forEach((key) => {
                            const errorArray = respond.errors.issues[key];
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
                            description: respond.errors.message || 'Please check the form for errors.'
                        });
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: respond.errors?.message || 'Roster save unsuccessful.'
                        });
                    }
                    return;
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Roster was created successfully",
                })
                
                // Redirect to edit page with the new roster id
                if (respond.data?.id) {
                    router.push(`/rosters/${respond.data.id}/edit`)
                } else {
                    router.push('/rosters')
                }
            }
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "Roster save unsuccessful.",
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
                                placeholder="Roster Name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="departmentId"
                                placeholder="Department"
                                value={formik.values.departmentId}
                                onChange={(value) => {
                                    formik.setFieldValue("departmentId", value);
                                    formik.setFieldTouched("departmentId", true);
                                }}
                                required
                                options={departments}
                                styleClasses={styleClasses}
                            />

                            <CustomFormField
                                type="number"
                                id="shiftsPerPersonPerDay"
                                placeholder="Shifts Per Person Per Day"
                                value={formik.values.shiftsPerPersonPerDay}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="status"
                                placeholder="Status"
                                value={formik.values.status?.toString()}
                                onChange={(value) => formik.setFieldValue("status", parseInt(value))}
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
                                        router.push('/rosters')
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

export default RosterForm
