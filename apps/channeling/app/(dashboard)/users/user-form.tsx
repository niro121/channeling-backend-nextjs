"use client"

import React, { useState, useEffect } from "react"
import { User } from "@/types/user"
import { Form, Formik, FormikHelpers } from "formik"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CustomFormField from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Ban, Save } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import * as Yup from "yup"
import { MOBILE_REGEX, MOBILE_VALIDATION_MESSAGE } from "@/lib/validations/phone"
import { useDialog } from "@/components/common/custom-dialog"
import { Separator } from "@/components/ui/separator"
import { createNewUser, updateUser, updateUserPassword, getLocationOptions, getDoctorOptionsForUsers, fetchUserById, userHasOpenShiftAction } from "@/app/actions/user.actions"
import { getStaffOptionsAction } from "@/app/actions/staff.actions"
import { Combobox } from "@/components/common/combobox"
import { useToast } from "@/components/hooks/use-toast"
import { Label } from "@/components/ui/label"
import CustomSelectField from "@/components/common/custom-select-field"
import { CustomMultiSelect } from "@/components/common/custom-mulit-select"
import { CustomSwitch } from "@/components/common/custom-switch"
import { signOut } from "next-auth/react"
import { userTypes, USER_TYPE_OPTIONS } from "@/lib/roles"

type LocationOption = { id: string; name: string }
type StaffOption = { id: string; name: string; code: string }
type DoctorOption = { id: string; name: string }

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
    const [locationOptions, setLocationOptions] = useState<LocationOption[]>([])
    const [locationOptionsLoading, setLocationOptionsLoading] = useState(false)
    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
    const [staffOptionsLoading, setStaffOptionsLoading] = useState(false)
    const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([])
    const [doctorOptionsLoading, setDoctorOptionsLoading] = useState(false)
    const [linkedDoctorId, setLinkedDoctorId] = useState<string>(user?.doctorId ?? "")
    const [hasOpenShift, setHasOpenShift] = useState(false)
    const { setDialogOpen } = useDialog()
    const { toast } = useToast()

    useEffect(() => {
        const loadLocations = async () => {
            setLocationOptionsLoading(true)
            const res = await getLocationOptions()
            setLocationOptionsLoading(false)
            if (res.success && res.data) setLocationOptions(res.data)
        }
        loadLocations()
    }, [])

    useEffect(() => {
        const loadStaffOptions = async () => {
            setStaffOptionsLoading(true)
            const res = await getStaffOptionsAction()
            setStaffOptionsLoading(false)
            if (!res.isError && res.data) setStaffOptions(res.data)
        }
        loadStaffOptions()
    }, [])

    useEffect(() => {
        const loadDoctorOptions = async () => {
            setDoctorOptionsLoading(true)
            const res = await getDoctorOptionsForUsers()
            setDoctorOptionsLoading(false)
            if (res.success && res.data) {
                setDoctorOptions(res.data.map((d) => ({ id: d.id, name: d.name })))
            }
        }
        loadDoctorOptions()
    }, [])

    useEffect(() => {
        const loadLinkedDoctor = async () => {
            if (!isEditMode || !user?.id || user.userType !== userTypes.doctor) {
                setLinkedDoctorId("")
                return
            }
            if (user.doctorId) {
                setLinkedDoctorId(user.doctorId)
                return
            }
            try {
                const full = await fetchUserById(user.id)
                setLinkedDoctorId((full as User)?.doctorId ?? "")
            } catch {
                setLinkedDoctorId("")
            }
        }
        loadLinkedDoctor()
    }, [isEditMode, user?.id, user?.userType, user?.doctorId])

    useEffect(() => {
        const loadOpenShift = async () => {
            if (!isEditMode || !user?.id) {
                setHasOpenShift(false)
                return
            }
            try {
                setHasOpenShift(await userHasOpenShiftAction(user.id))
            } catch {
                setHasOpenShift(false)
            }
        }
        loadOpenShift()
    }, [isEditMode, user?.id])

    const bookingLocationIdsFromUser = (u: User | null): string[] => {
        if (!u?.bookingLocations?.length) return []
        return u.bookingLocations.map((b: any) => b.locationId ?? b.location?.id).filter(Boolean)
    }

    // Initial values for user settings
    const settingsInitialValues = {
        name: user?.name || "",
        email: user?.email || "",
        username: user?.username ?? "",
        phone: user?.phone ?? "",
        twoFactorEnabled: user?.twoFactorEnabled ?? false,
        userType: user?.userType || 2,
        userGroupId: user?.userGroupId || "",
        status: user?.status !== undefined ? user.status : 1,
        checkedDefaultLocation: user?.checkedDefaultLocation ?? false,
        defaultLocation: user?.defaultLocation ?? "",
        defaultBookingMethod: user?.defaultBookingMethod != null ? String(user.defaultBookingMethod) : "__none__",
        userLocationId: user?.userLocationId ?? "",
        staffId: user?.staffId ?? "__none__",
        doctorId: linkedDoctorId || "",
        bookingLocationIds: bookingLocationIdsFromUser(user),
    }

    // Initial values for password change
    const passwordInitialValues = {
        password: "",
        confirmPassword: "",
    }

    // Initial values for new user (includes password) – same fields as edit where applicable
    const newUserInitialValues: User = {
        id: "",
        name: "",
        email: "",
        username: "",
        phone: "",
        twoFactorEnabled: false,
        password: "",
        confirmPassword: "",
        userType: 2,
        status: 1,
        userGroupId: "",
        userLocationId: "",
        staffId: "",
        doctorId: "",
        defaultBookingMethod: null,
        checkedDefaultLocation: false,
        bookingLocationIds: [],
    }

    // Validation schema for user settings
    const settingsValidationSchema = Yup.object({
        name: Yup.string()
            .max(100, "Must be less than 100 characters")
            .required("This field is mandatory"),
        email: Yup.string()
            .email("Invalid email address")
            .required("This field is mandatory"),
        username: Yup.string()
            .max(50, "Must be less than 50 characters")
            .nullable()
            .transform((v) => (v === "" ? null : v)),
        phone: Yup.string()
            .nullable()
            .transform((v) => (v === "" ? null : v))
            .test("mobile", MOBILE_VALIDATION_MESSAGE, (v) => v == null || MOBILE_REGEX.test(v)),
        userType: Yup.number()
            .oneOf([1, 2, 3, 4], "User type must be Admin, Staff, Doctor, or API User")
            .required("This field is mandatory"),
        userLocationId: Yup.string().when("userType", {
            is: (t: number) => t === userTypes.apiUser,
            then: (schema) => schema.nullable().optional(),
            otherwise: (schema) =>
                schema
                    .required("User Location is mandatory")
                    .test("not-none", "User Location is mandatory", (v) => !!v && v !== "__none__"),
        }),
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
        username: Yup.string()
            .max(50, "Must be less than 50 characters")
            .nullable()
            .transform((v) => (v === "" ? null : v)),
        phone: Yup.string()
            .nullable()
            .transform((v) => (v === "" ? null : v))
            .test("mobile", MOBILE_VALIDATION_MESSAGE, (v) => v == null || MOBILE_REGEX.test(v)),
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
            .oneOf([1, 2, 3, 4], "User type must be Admin, Staff, Doctor, or API User")
            .required("This field is mandatory"),
        userLocationId: Yup.string().when("userType", {
            is: (t: number) => t === userTypes.apiUser,
            then: (schema) => schema.nullable().optional(),
            otherwise: (schema) =>
                schema
                    .required("User Location is mandatory")
                    .test("not-none", "User Location is mandatory", (v) => !!v && v !== "__none__"),
        }),
    })

    const handleSettingsSubmit = async (
        values: typeof settingsInitialValues,
        { setErrors, setTouched, resetForm }: FormikHelpers<typeof settingsInitialValues>
    ) => {
        try {
            setLoading(true)

            // Fetch current user to get the password
            const currentUser = await fetchUserById(user!.id!)
            
            // When checkedDefaultLocation is true, set defaultLocation to the first booking location
            const defaultLocation =
                values.checkedDefaultLocation && (values.bookingLocationIds?.length ?? 0) > 0
                    ? values.bookingLocationIds![0]
                    : "";

            const defaultBookingMethod =
                values.defaultBookingMethod === "__none__" || values.defaultBookingMethod === ""
                    ? null
                    : parseInt(values.defaultBookingMethod, 10)

            const staffId = values.staffId === "__none__" || values.staffId === "" ? null : values.staffId
            const doctorId =
                values.userType === userTypes.doctor && values.doctorId?.trim()
                    ? values.doctorId.trim()
                    : null
            const previousUserLocationId = (currentUser as any)?.userLocationId ?? user?.userLocationId ?? ""
            const nextUserLocationId = values.userLocationId ?? ""
            const didUserLocationChange = previousUserLocationId !== nextUserLocationId

            const userPayload: User = {
                ...currentUser,
                ...values,
                defaultLocation: defaultLocation || undefined,
                defaultBookingMethod: defaultBookingMethod !== undefined && !Number.isNaN(defaultBookingMethod) ? defaultBookingMethod : null,
                staffId: values.userType === userTypes.doctor ? null : staffId ?? undefined,
                doctorId: doctorId ?? undefined,
                bookingLocationIds: values.bookingLocationIds,
                password: "", // Empty password means keep existing
            } as User

            const respond = await updateUser(user!.id!, userPayload, (currentUser as any).password)

            setLoading(false)

            if (respond.isError) {
                // Map server-side validation errors to form fields
                if (respond.errors && typeof respond.errors === 'object' && !respond.errors.message) {
                    const fieldErrors: Record<string, string> = {};
                    Object.keys(respond.errors).forEach((key) => {
                        const errorMessages = (respond.errors as any)[key];
                        if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                            fieldErrors[key] = errorMessages[0];
                        }
                    });
                    setErrors(fieldErrors);
                    setTouched(
                        Object.keys(fieldErrors).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                        }, {} as Record<string, boolean>)
                    );
                }

                toast({
                    variant: "destructive",
                    title: "Error",
                    description: (respond.errors as any)?.message || "User settings save unsuccessful.",
                })
                return;
            }

            toast({
                variant: "success",
                title: "Success",
                description: "User settings were saved successfully",
            })

            if (didUserLocationChange) {
                toast({
                    variant: "success",
                    title: "Location updated",
                    description: "Please log in again to continue.",
                })
                await signOut({ callbackUrl: "/login" })
                return
            }

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
        { setErrors, setTouched, resetForm }: FormikHelpers<User>
    ) => {
        try {
            setLoading(true)

            const respond = await createNewUser(values)

            setLoading(false)

            if (respond.isError) {
                // Map server-side validation errors to form fields
                if (respond.errors && typeof respond.errors === 'object' && !respond.errors.message) {
                    const fieldErrors: Record<string, string> = {};
                    Object.keys(respond.errors).forEach((key) => {
                        const errorMessages = (respond.errors as any)[key];
                        if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                            fieldErrors[key] = errorMessages[0];
                        }
                    });
                    setErrors(fieldErrors);
                    setTouched(
                        Object.keys(fieldErrors).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                        }, {} as Record<string, boolean>)
                    );
                }

                toast({
                    variant: "destructive",
                    title: "Error",
                    description: (respond.errors as any)?.message || "User creation unsuccessful.",
                })
                return;
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

    const handleUserTypeChange = (
        formik: { setFieldValue: (f: string, v: unknown) => void; setFieldTouched: (f: string, t: boolean) => void },
        value: string
    ) => {
        const userType = parseInt(value, 10)
        formik.setFieldValue("userType", userType)
        formik.setFieldTouched("userType", true)
        if (userType === userTypes.doctor) {
            formik.setFieldValue("staffId", "")
        } else {
            formik.setFieldValue("doctorId", "")
        }
    }

    const renderLinkedStaffOrDoctor = (formik: {
        values: { userType: number; staffId?: string | null; doctorId?: string | null }
        setFieldValue: (field: string, value: unknown) => void
        setFieldTouched: (field: string, touched: boolean) => void
    }) => {
        if (formik.values.userType === userTypes.doctor) {
            return (
                <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>Linked doctor</Label>
                    <div className={styleClasses.inputClassName}>
                        <Combobox
                            label="Linked doctor"
                            options={doctorOptions}
                            value={formik.values.doctorId ?? ""}
                            defaultValue=""
                            loading={doctorOptionsLoading}
                            clearable
                            triggerClassName="w-full max-w-none font-normal!"
                            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                            onChange={(value) => {
                                formik.setFieldValue("doctorId", value)
                                formik.setFieldValue("staffId", "")
                                formik.setFieldTouched("doctorId", true)
                            }}
                        />
                    </div>
                </div>
            )
        }
        return (
            <CustomSelectField
                id="staffId"
                placeholder="Linked staff"
                value={formik.values.staffId ?? "__none__"}
                onChange={(value) => {
                    formik.setFieldValue("staffId", value === "__none__" ? "" : value)
                    formik.setFieldTouched("staffId", true)
                }}
                required={false}
                options={[
                    { id: "__none__", name: "None" },
                    ...staffOptions.map((s) => ({
                        id: s.id,
                        name: s.code ? `${s.name} (${s.code})` : s.name,
                    })),
                ]}
                styleClasses={styleClasses}
                loading={staffOptionsLoading}
            />
        )
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
                                type="text"
                                id="username"
                                placeholder="Username (optional; for login)"
                                value={formik.values.username ?? ""}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required={false}
                                styleClasses={styleClasses}
                            />

                            <CustomFormField
                                type="tel"
                                id="phone"
                                placeholder="Mobile (e.g. 07XXXXXXXX)"
                                value={formik.values.phone ?? ""}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                required={false}
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
                                onChange={(value) => handleUserTypeChange(formik, value)}
                                required
                                options={USER_TYPE_OPTIONS.map((o) => ({
                                    id: String(o.id),
                                    name: o.name,
                                }))}
                                styleClasses={styleClasses}
                            />

                            {userGroupOptions.length > 0 && formik.values.userType !== userTypes.apiUser && (
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

                            {formik.values.userType !== userTypes.apiUser && (
                                <>
                                <CustomSelectField
                                    id="userLocationId"
                                    placeholder="User Location"
                                    value={formik.values.userLocationId || "__none__"}
                                    onChange={(value) => {
                                        formik.setFieldValue("userLocationId", value === "__none__" ? "" : value);
                                        formik.setFieldTouched("userLocationId", true);
                                    }}
                                    required={true}
                                    options={[{ id: "__none__", name: "None" }, ...locationOptions]}
                                    styleClasses={styleClasses}
                                    loading={locationOptionsLoading}
                                />

                                <CustomSelectField
                                    id="defaultBookingMethod"
                                    placeholder="Default method"
                                    value={formik.values.defaultBookingMethod != null ? String(formik.values.defaultBookingMethod) : "__none__"}
                                    onChange={(value) => {
                                        formik.setFieldValue("defaultBookingMethod", value === "__none__" ? null : parseInt(value, 10));
                                        formik.setFieldTouched("defaultBookingMethod", true);
                                    }}
                                    required={false}
                                    options={[
                                        { id: "__none__", name: "No default" },
                                        { id: "0", name: "Cash" },
                                        { id: "1", name: "OnCall" },
                                        { id: "2", name: "Agent" },
                                        { id: "3", name: "Staff" },
                                        { id: "4", name: "Card" },
                                        { id: "5", name: "Slip" },
                                    ]}
                                    styleClasses={styleClasses}
                                />

                                {renderLinkedStaffOrDoctor(formik)}
                                </>
                            )}

                            {formik.values.userType === userTypes.apiUser && (
                                <p className="text-muted-foreground text-xs col-span-full">
                                    API Users are used only as createdBy on public API bookings. They cannot sign in to the dashboard.
                                </p>
                            )}

                            {formik.values.userType !== userTypes.apiUser && (
                                <>
                                <Separator />

                                <CustomMultiSelect
                                    id="bookingLocationIds"
                                    placeholder="Booking Locations"
                                    value={formik.values.bookingLocationIds ?? []}
                                    onChange={(values) => formik.setFieldValue("bookingLocationIds", values)}
                                    required={false}
                                    options={locationOptions}
                                    styleClasses={styleClasses}
                                />

                                <div>
                                    <CustomSwitch
                                    id="checkedDefaultLocation"
                                    placeholder="Use default location"
                                    checked={formik.values.checkedDefaultLocation}
                                    onChange={(checked) => formik.setFieldValue("checkedDefaultLocation", checked)}
                                    styleClasses={styleClasses}
                                />
                                    <p className="text-secondary-foreground text-xs">Make First Location Auto Selected ( In Channeling Module )</p>
                                </div>

                                {sessionUserType === 1 && (
                                    <div className="flex items-center">
                                        <Checkbox
                                            id="twoFactorEnabled"
                                            checked={formik.values.twoFactorEnabled === true}
                                            onCheckedChange={(value) => {
                                                formik.setFieldValue("twoFactorEnabled", !!value)
                                            }}
                                        />
                                        <Label
                                            htmlFor="twoFactorEnabled"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-1"
                                        >
                                            Require 2FA at login (Admin override)
                                        </Label>
                                    </div>
                                )}
                                </>
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
                                    <Ban className="h-4 w-4" />
                                    <span>Cancel</span>
                                </Button>
                                <Button
                                    disabled={!sessionUserType || loading}
                                    size={"sm"}
                                    type="submit"
                                    className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                >
                                    <Save className="h-4 w-4" />
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
            <TabsList className="grid w-full grid-cols-2 mb-4">
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
                            <div className="space-y-5 py-3">
                                {/* Profile */}
                                <section className="space-y-3">
                                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Profile</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
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
                                            type="text"
                                            id="username"
                                            placeholder="Username (optional; for login)"
                                            value={formik.values.username ?? ""}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            required={false}
                                            styleClasses={styleClasses}
                                        />
                                        <CustomFormField
                                            type="tel"
                                            id="phone"
                                            placeholder="Mobile (e.g. 07XXXXXXXX)"
                                            value={formik.values.phone ?? ""}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            required={false}
                                            styleClasses={styleClasses}
                                        />
                                        <CustomSelectField
                                            id="userType"
                                            placeholder="User Type"
                                            value={formik.values.userType?.toString()}
                                            onChange={(value) => handleUserTypeChange(formik, value)}
                                            required
                                            options={USER_TYPE_OPTIONS.map((o) => ({
                                                id: String(o.id),
                                                name: o.name,
                                            }))}
                                            styleClasses={styleClasses}
                                        />
                                        {formik.values.userType === userTypes.apiUser && (
                                            <p className="text-muted-foreground text-xs md:col-span-2">
                                                API Users are used only as createdBy on public API bookings. They cannot sign in to the dashboard.
                                            </p>
                                        )}
                                        {userGroupOptions.length > 0 && formik.values.userType !== userTypes.apiUser && (
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
                                        {formik.values.userType !== userTypes.apiUser && (
                                        <>
                                        <div>
                                        <CustomSelectField
                                            id="userLocationId"
                                            placeholder="User Location"
                                            value={formik.values.userLocationId || "__none__"}
                                            onChange={(value) => {
                                                formik.setFieldValue("userLocationId", value === "__none__" ? "" : value);
                                                formik.setFieldTouched("userLocationId", true);
                                            }}
                                            required={true}
                                            disabled={hasOpenShift}
                                            options={[{ id: "__none__", name: "None" }, ...locationOptions]}
                                            styleClasses={styleClasses}
                                            loading={locationOptionsLoading}
                                        />
                                        {hasOpenShift && (
                                            <p className="text-muted-foreground text-xs mt-1">
                                                Location cannot be changed while this user has an active, paused, or pending shift.
                                            </p>
                                        )}
                                        </div>
                                        <div>
                                            <CustomSelectField
                                                id="defaultBookingMethod"
                                                placeholder="Default method"
                                                value={formik.values.defaultBookingMethod ?? "__none__"}
                                                onChange={(value) => {
                                                    formik.setFieldValue("defaultBookingMethod", value);
                                                    formik.setFieldTouched("defaultBookingMethod", true);
                                                }}
                                                required={false}
                                                options={[
                                                    { id: "__none__", name: "No default" },
                                                    { id: "0", name: "Cash" },
                                                    { id: "1", name: "OnCall" },
                                                    { id: "2", name: "Agent" },
                                                    { id: "3", name: "Staff" },
                                                    { id: "4", name: "Card" },
                                                    { id: "5", name: "Slip" },
                                                ]}
                                                styleClasses={styleClasses}
                                            />
                                        </div>

                                        {renderLinkedStaffOrDoctor(formik)}
                                        </>
                                        )}
                                    </div>
                                </section>

                                {formik.values.userType !== userTypes.apiUser && (
                                <section className="space-y-3">
                                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Locations</h3>
                                    <CustomMultiSelect
                                        id="bookingLocationIds"
                                        placeholder="Booking Locations"
                                        value={formik.values.bookingLocationIds ?? []}
                                        onChange={(values) => formik.setFieldValue("bookingLocationIds", values)}
                                        required={false}
                                        options={locationOptions}
                                        styleClasses={styleClasses}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                        <div className="flex items-center gap-2">
                                            <CustomSwitch
                                                id="checkedDefaultLocation"
                                                placeholder="Use default location"
                                                checked={formik.values.checkedDefaultLocation}
                                                onChange={(checked) => formik.setFieldValue("checkedDefaultLocation", checked)}
                                                styleClasses={styleClasses}
                                            />
                                            <span className="text-muted-foreground text-xs">Auto-select first in Channeling</span>
                                        </div>
                                        {sessionUserType === 1 && formik.values.userType !== userTypes.apiUser && (
                                            <div className="flex items-center">
                                                <Checkbox
                                                    id="twoFactorEnabled"
                                                    checked={formik.values.twoFactorEnabled === true}
                                                    onCheckedChange={(value) => {
                                                        formik.setFieldValue("twoFactorEnabled", !!value)
                                                    }}
                                                />
                                                <Label
                                                    htmlFor="twoFactorEnabled"
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-1"
                                                >
                                                    Require 2FA at login (Admin override)
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                </section>
                                )}

                                <div className="flex items-center pt-2">
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
                                        Active
                                    </Label>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
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
                                        <Ban className="h-4 w-4" />
                                        <span>Cancel</span>
                                    </Button>
                                    <Button
                                        disabled={!sessionUserType || loading}
                                        size={"sm"}
                                        type="submit"
                                        className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                    >
                                        <Save className="h-4 w-4" />
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
                                        <Ban className="h-4 w-4" />
                                        <span>Cancel</span>
                                    </Button>
                                    <Button
                                        disabled={!sessionUserType || passwordLoading}
                                        size={"sm"}
                                        type="submit"
                                        className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                                    >
                                        <Save className="h-4 w-4" />
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
