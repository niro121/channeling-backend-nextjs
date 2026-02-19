'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Doctor, DoctorFormValues, TITLE_OPTIONS, normalizeTitleForSelect } from '@/types/doctor';
import { createDoctor, updateOneDoctor } from '@/app/actions/doctor.actions';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import { sriLankaPhoneRegex, sriLankaMobileRegex } from '@/lib/regex';

type DoctorFormProps = {
  doctor: Doctor | null;
  specialities: { id: string; name: string }[];
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
};

export default function DoctorForm({
  doctor,
  specialities,
  user
}: DoctorFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: DoctorFormValues = {
    title: normalizeTitleForSelect(doctor?.title ?? ''),
    name: doctor?.name ?? '',
    code: doctor?.code ?? '',
    order: doctor?.order ?? 0,
    phone: doctor?.phone ?? '',
    mobile: doctor?.mobile ?? '',
    fax: doctor?.fax ?? '',
    addressLine1: doctor?.addressLine1 ?? '',
    addressLine2: doctor?.addressLine2 ?? '',
    city: doctor?.city ?? '',
    registrationNumber: doctor?.registrationNumber ?? '',
    qualification: doctor?.qualification ?? '',
    referralCharge: doctor?.referralCharge ?? 0,
    sessionNoPrefix: doctor?.sessionNoPrefix ?? '',
    status: doctor?.status ?? 1,
    specialityId: doctor?.specialityId ?? ''
  };

  const validationSchema = Yup.object({
    title: Yup.string().required('This field is mandatory'),
    name: Yup.string()
      .max(150, 'Must be less than 150 characters')
      .required('This field is mandatory'),
    specialityId: Yup.string().required('This field is mandatory'),
    order: Yup.number()
      .min(0, 'Must be 0 or greater')
      .required('This field is mandatory'),
    phone: Yup.string()
      .matches(sriLankaPhoneRegex, 'Phone Number Ex: 07x xxxxxxx')
      .nullable()
      .optional(),
    mobile: Yup.string()
      .matches(sriLankaMobileRegex, 'Mobile Number Ex: 07x xxxxxxx')
      .nullable()
      .optional(),
    registrationNumber: Yup.string().trim().nullable().optional(),
    qualification: Yup.string().trim().required("Qualification is required"),
    referralCharge: Yup.number().min(0, 'Must be 0 or greater').required(),
    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: DoctorFormValues,
    { resetForm }: FormikHelpers<DoctorFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    try {
      setLoading(true);
      let respond: any;

      if (doctor && doctor.id) {
        respond = await updateOneDoctor(doctor.id, values);
        setLoading(false);

        if (!respond?.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error.message || 'Doctor update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor was updated successfully'
        });
        if (closeAfterSave) router.push('/doctors');
        else router.refresh();
      } else {
        respond = await createDoctor(values, user);
        setLoading(false);

        if (!respond?.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error.message || 'Doctor save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor was created successfully'
        });
        const newId = respond?.data?.id;
        if (closeAfterSave) router.push('/doctors');
        else if (newId) router.push(`/doctors/${newId}/edit`);
        else router.push('/doctors');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Doctor save unsuccessful.'
      });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {(formik) => {
        const styleClasses = {
          parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
          labelClassName: 'text-sm text-black font-semibold capitalize',
          inputClassName: 'col-span-full sm:col-span-3'
        };

        return (
          <Form className="w-full">
            <div className="grid gap-4 border rounded-lg p-6">
              <CustomSelectField
                id="title"
                placeholder="Title"
                value={
                  formik.values.title && TITLE_OPTIONS.some((o) => o.id === formik.values.title)
                    ? formik.values.title
                    : undefined
                }
                onChange={(value) => formik.setFieldValue('title', value)}
                required
                options={TITLE_OPTIONS}
                styleClasses={styleClasses}
              />

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

              <CustomSelectField
                id="specialityId"
                placeholder="Speciality"
                value={formik.values.specialityId}
                onChange={(value) =>
                  formik.setFieldValue('specialityId', value)
                }
                required
                disabled={specialities.length === 0}
                options={specialities}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="code"
                placeholder="Code (Auto Generated)"
                value={formik.values.code}
                disabled
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="number"
                id="order"
                placeholder="List Order No"
                value={formik.values.order}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="phone"
                placeholder="Phone (Sri Lanka format)"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="mobile"
                placeholder="Mobile (Sri Lanka format)"
                value={formik.values.mobile}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="fax"
                placeholder="Fax"
                value={formik.values.fax}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="addressLine1"
                placeholder="Address Line 1"
                value={formik.values.addressLine1}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="addressLine2"
                placeholder="Address Line 2"
                value={formik.values.addressLine2}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="city"
                placeholder="City"
                value={formik.values.city}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="registrationNumber"
                placeholder="Registration No"
                value={formik.values.registrationNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="textarea"
                id="qualification"
                placeholder="Qualification"
                value={formik.values.qualification}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="number"
                id="referralCharge"
                placeholder="Referral Charge"
                value={formik.values.referralCharge}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="text"
                id="sessionNoPrefix"
                placeholder="Session No. Prefix"
                value={formik.values.sessionNoPrefix}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomSelectField
                id="status"
                placeholder="Status"
                value={formik.values.status?.toString()}
                onChange={(value) =>
                  formik.setFieldValue('status', parseInt(value))
                }
                required
                options={[
                  { id: '0', name: 'Unpublish' },
                  { id: '1', name: 'Publish' }
                ]}
                styleClasses={styleClasses}
              />

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={() => router.push('/doctors')}
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
                  onClick={() => { saveAndCloseRef.current = false; formik.submitForm(); }}
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
                  onClick={() => { saveAndCloseRef.current = true; formik.submitForm(); }}
                >
                  <Save className="h-4 w-4" />
                  <span>Save and Close</span>
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
