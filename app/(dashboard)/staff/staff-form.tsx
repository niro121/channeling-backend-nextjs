'use client'

import React, { useState } from 'react'
import { Form, Formik, FormikHelpers } from 'formik'
import * as Yup from 'yup'
import CustomFormField from '@/components/common/form-field'
import CustomSelectField from '@/components/common/custom-select-field'
import CustomDatePickerField from '@/components/common/custom-date-picker-field'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Ban, Save } from 'lucide-react'
import { useToast } from '@/components/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Staff, GENDER_OPTIONS, STAFF_STATUS_OPTIONS } from '@/types/staff'
import { TITLE_OPTIONS } from '@/types/title'
import { createStaffAction, updateStaffAction } from '@/app/actions/staff.actions'

type StaffFormProps = {
  staff?: Staff | null
  isEditPage?: boolean
}

export default function StaffForm({ staff, isEditPage = false }: StaffFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const initialValues: Staff = {
    code: staff?.code ?? '',
    title: staff?.title ?? '',
    name: staff?.name ?? '',
    nic: staff?.nic ?? '',
    dateOfBirth: staff?.dateOfBirth ?? undefined,
    gender: staff?.gender ?? '',
    contactMobile: staff?.contactMobile ?? '',
    address: staff?.address ?? '',
    dateJoined: staff?.dateJoined ?? undefined,
    status: staff?.status !== undefined ? staff.status : 1,
  }

  const validationSchema = Yup.object({
    code: Yup.string().required('Staff Code is required').max(50, 'Must be less than 50 characters'),
    title: Yup.string().nullable(),
    name: Yup.string().required('Name is required').max(150, 'Must be less than 150 characters'),
    nic: Yup.string().required('NIC is required').max(20, 'Must be less than 20 characters'),
    dateOfBirth: Yup.date().nullable().required('Date of Birth is required'),
    gender: Yup.string().required('Gender is required'),
    contactMobile: Yup.string().required('Contact Mobile is required').max(15, 'Must be less than 15 characters'),
    address: Yup.string().required('Address is required').max(500, 'Must be less than 500 characters'),
    dateJoined: Yup.date().nullable().required('Date Joined is required'),
    status: Yup.number().required('Status is required').oneOf([0, 1]),
  })

  const handleSubmit = async (values: Staff, { setErrors, setTouched }: FormikHelpers<Staff>) => {
    try {
      setLoading(true)
      let respond: {
        isError?: boolean
        errors?: Record<string, string | string[]> | { message?: string }
        data?: { saved?: boolean; id?: string } | null
      }
      if (isEditPage && staff?.id) {
        respond = await updateStaffAction(staff.id, values)
      } else {
        respond = await createStaffAction(values)
      }
      setLoading(false)

      if (respond?.isError && respond?.errors && typeof respond.errors === 'object' && !Array.isArray(respond.errors)) {
        const fieldErrors: Record<string, string> = {}
        const errMap = respond.errors as Record<string, string | string[] | undefined>
        Object.keys(errMap).forEach((key) => {
          if (key === 'message') return
          const err = errMap[key]
          const msg = Array.isArray(err) && err.length > 0 ? err[0] : typeof err === 'string' ? err : undefined
          if (msg) fieldErrors[key] = msg
        })
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors)
          setTouched(
            Object.keys(fieldErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>)
          )
        }
        toast({
          variant: 'destructive',
          title: 'Error',
          description: (respond.errors as Record<string, unknown>)?.message as string ?? 'Staff save unsuccessful.',
        })
        return
      }

      if (isEditPage) {
        toast({ variant: 'success', title: 'Success', description: 'Staff was updated successfully.' })
        router.push('/staff')
      } else {
        router.push('/staff')
        toast({ variant: 'success', title: 'Success', description: 'Staff was created successfully.' })
      }
    } catch (error: unknown) {
      setLoading(false)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Staff save unsuccessful.',
      })
    }
  }

  const styleClasses = {
    parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
    labelClassName: 'text-sm text-black font-semibold capitalize',
    inputClassName: 'col-span-full sm:col-span-3',
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize={isEditPage}
    >
      {(formik) => (
        <Form className="w-full">
          <div className="grid gap-4 border rounded-lg p-6">
            {/* Staff Code * */}
            <CustomFormField
              type="text"
              id="code"
              placeholder="Staff Code"
              value={formik.values.code}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />

            {/* Title */}
            <div className={styleClasses.parentDiv}>
              <Label className={styleClasses.labelClassName}>Title</Label>
              <div className={styleClasses.inputClassName}>
                <CustomSelectField
                  id="title"
                  placeholder="Select Title"
                  value={formik.values.title}
                  onChange={(v) => formik.setFieldValue('title', v)}
                  required={false}
                  options={TITLE_OPTIONS}
                  styleClasses={{ ...styleClasses, parentDiv: '', inputClassName: '', labelClassName: 'hidden' }}
                />
              </div>
            </div>

            {/* Name * */}
            <CustomFormField
              type="text"
              id="name"
              placeholder="Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />

            {/* NIC * */}
            <CustomFormField
              type="text"
              id="nic"
              placeholder="NIC"
              value={formik.values.nic}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />

            {/* Date of Birth * */}
            <CustomDatePickerField
              id="dateOfBirth"
              placeholder="Date of Birth"
              value={formik.values.dateOfBirth ?? undefined}
              onChange={(date) => formik.setFieldValue('dateOfBirth', date ?? undefined)}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
              error={formik.errors.dateOfBirth as string}
              touched={formik.touched.dateOfBirth}
              captionLayout="dropdown"
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />

            {/* Gender * */}
            <div className={styleClasses.parentDiv}>
              <Label className={styleClasses.labelClassName}>
                Gender <span className="text-red-600">*</span>
              </Label>
              <div className={styleClasses.inputClassName}>
                <CustomSelectField
                  id="gender"
                  placeholder="Select Gender"
                  value={formik.values.gender}
                  onChange={(v) => formik.setFieldValue('gender', v)}
                  required
                  options={GENDER_OPTIONS.map((g) => ({ id: g.id, name: g.name }))}
                  styleClasses={{ ...styleClasses, parentDiv: '', inputClassName: '', labelClassName: 'hidden' }}
                />
              </div>
            </div>

            {/* Contact Mobile * */}
            <CustomFormField
              type="text"
              id="contactMobile"
              placeholder="Contact Mobile"
              value={formik.values.contactMobile}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />

            {/* Address * */}
            <CustomFormField
              type="text"
              id="address"
              placeholder="Address"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />

            {/* Date Joined * */}
            <CustomDatePickerField
              id="dateJoined"
              placeholder="Date Joined"
              value={formik.values.dateJoined ?? undefined}
              onChange={(date) => formik.setFieldValue('dateJoined', date ?? undefined)}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
              error={formik.errors.dateJoined as string}
              touched={formik.touched.dateJoined}
              captionLayout="dropdown"
              fromYear={1990}
              toYear={new Date().getFullYear() + 1}
            />

            {/* Status * */}
            <div className={styleClasses.parentDiv}>
              <Label className={styleClasses.labelClassName}>
                Status <span className="text-red-600">*</span>
              </Label>
              <div className={styleClasses.inputClassName}>
                <CustomSelectField
                  id="status"
                  placeholder="Select Status"
                  value={formik.values.status?.toString() ?? ''}
                  onChange={(v) => formik.setFieldValue('status', parseInt(v, 10))}
                  required
                  options={STAFF_STATUS_OPTIONS.map((s) => ({ id: s.id, name: s.name }))}
                  styleClasses={{ ...styleClasses, parentDiv: '', inputClassName: '', labelClassName: 'hidden' }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-24 gap-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                type="button"
                onClick={() => router.push('/staff')}
                disabled={loading}
              >
                <Ban className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                disabled={loading}
                size="sm"
                type="submit"
                className="w-full sm:w-24 gap-1 text-white px-6 hover:text-black"
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
