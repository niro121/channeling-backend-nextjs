"use client"

import React, { useMemo, useState } from "react"
import { Zone } from "@/types/zone"
import { Form, Formik, FormikHelpers } from "formik"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Ban, Save } from "lucide-react"
import * as Yup from "yup"
import { createNewZone, updateZone } from "@/app/actions/zone.actions"
import { useToast } from "@/components/hooks/use-toast"
import CustomSelectField from "@/components/common/custom-select-field"
import { useRouter } from "next/navigation"
import { Location } from "@/types/location"

type ZoneFormProps = {
    zone: Zone | null
    isEditPage?: boolean
    locations: Location[]
}

const ZoneForm = ({ zone, isEditPage = false, locations }: ZoneFormProps) => {
    const locationOptions = useMemo(
        () => locations.map((l) => ({ id: String(l.id ?? ""), name: l.name })),
        [locations]
    )

    const initialValues: Zone = {
        id: zone?.id ? zone.id : "",
        name: zone?.name ? zone.name : "",
        description: zone?.description ? zone.description : undefined,
        locationId: zone?.locationId ? String(zone.locationId) : "",
        status: zone?.status !== undefined ? zone.status : 1,
        createdAt: zone?.createdAt ? zone.createdAt : new Date(),
        updatedAt: zone?.updatedAt ? zone.updatedAt : new Date(),
    }
    const [loading, setLoading] = useState<boolean>(false)
    const saveAndCloseRef = React.useRef<boolean>(false)
    const { toast } = useToast()
    const router = useRouter()


    const validationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        locationId: Yup.string()
            .required("This field is mandatory"),
        description: Yup.string()
            .max(500, "Must be less than 500 characters"),
        status: Yup.number()
            .oneOf([0, 1], "Status must be Unpublish (0) or Publish (1)")
            .required("This field is mandatory"),
    })

    const handleSubmit = async (
        values: Zone,
        _helpers: FormikHelpers<Zone>
    ) => {
        const closeAfterSave = saveAndCloseRef.current
        try {
            setLoading(true);
            let respond: any;

            if (zone && zone.id) {
                respond = await updateZone(zone.id, values);
                setLoading(false);

                if (!respond?.success) {
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: respond.error?.message || 'Zone update unsuccessful.'
                    });
                    return;
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Zone was saved successfully",
                })
                if (closeAfterSave) router.push('/zones')
                else router.refresh()
            } else {
                respond = await createNewZone(values);
                setLoading(false);

                if (!respond?.success) {
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: respond.error?.message || 'Zone save unsuccessful.'
                    });
                    return;
                }

                toast({
                    variant: "success",
                    title: "Success",
                    description: "Zone was created successfully",
                })
                const newId = respond?.data?.id
                if (closeAfterSave) router.push('/zones')
                else if (newId) router.push(`/zones/${newId}/edit`)
                else router.push('/zones')
            }
        } catch (error: any) {
            setLoading(false);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message ?? "Zone save unsuccessful.",
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
                                placeholder="Zone Name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required
                                styleClasses={styleClasses}
                            />

                            <CustomSelectField
                                id="locationId"
                                placeholder="Location"
                                value={
                                    formik.values.locationId &&
                                    locationOptions.some((o) => o.id === formik.values.locationId)
                                        ? formik.values.locationId
                                        : undefined
                                }
                                onChange={(value) => formik.setFieldValue("locationId", value)}
                                required
                                options={locationOptions}
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
                                    onClick={() => router.push('/zones')}
                                    disabled={loading}
                                >
                                    <Ban className="h-4 w-4" />
                                    <span>Cancel</span>
                                </Button>
                                <Button
                                    disabled={loading}
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
                                    disabled={loading}
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

export default ZoneForm
