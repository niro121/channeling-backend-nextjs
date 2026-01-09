'use client';

import React, { useState } from 'react';
import { Patient } from '@/types/patient';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { DisabledIcon, SaveIcon } from '@/components/icons';
import * as Yup from 'yup';
import {
  createPatientAction,
  updatePatientAction
} from '@/app/actions/patient.actions';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Tag } from '@/types/tag';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';

const TITLE_LIST = [
  { id: 0, name: 'MR.' },
  { id: 1, name: 'MRS.' },
  { id: 2, name: 'MISS.' },
  { id: 3, name: 'MS.' },
  { id: 4, name: "Ma'am" },
  { id: 5, name: 'DR.' },
  { id: 6, name: 'DR.(MRS)' },
  { id: 7, name: 'DR.(MS)' },
  { id: 8, name: 'DR.(MISS)' },
  { id: 9, name: 'PROF.' },
  { id: 10, name: 'PROF.(MRS)' },
  { id: 11, name: 'MASTER.' },
  { id: 12, name: 'BABY.' },
  { id: 13, name: 'REV.' },
  { id: 14, name: 'RT.REV.' },
  { id: 15, name: 'HON.' },
  { id: 16, name: 'RT.HON.' },
  { id: 17, name: 'OTHER' },
  { id: 18, name: 'BABY OF' }
];

type PatientFormProps = {
  patient?: Patient | null;
  areas: Tag[];
  isEditPage?: boolean;
};

const PatientForm = ({
  patient,
  areas,
  isEditPage = false
}: PatientFormProps) => {
  const initialValues: Patient = {
    id: patient?.id ? patient.id : undefined,
    title: patient?.title ? patient.title : '',
    name: patient?.name ? patient.name : '',
    code: patient?.code ? patient.code : '',
    sex: patient?.sex ? patient.sex : '',
    dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth : undefined,
    age:
      patient?.age !== undefined && patient?.age !== null
        ? patient.age
        : undefined,
    phone: patient?.phone ? patient.phone : '',
    email: patient?.email ? patient.email : '',
    addressLine1: patient?.addressLine1 ? patient.addressLine1 : '',
    addressLine2: patient?.addressLine2 ? patient.addressLine2 : '',
    areaId: patient?.areaId ? patient.areaId : '',
    status: patient?.status !== undefined ? patient.status : 1 // Default Publish
  };

  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    name: Yup.string()
      .max(100, 'Must be less than 100 characters')
      .required('Name is required'),
    code: Yup.string().nullable(),
    sex: Yup.string().required('Gender is required'),
    dateOfBirth: Yup.number().nullable(),
    age: Yup.number().required('Age is required').min(0, 'Age must be valid'),
    phone: Yup.string().required('Phone is required'),
    email: Yup.string().email('Invalid email').nullable(),
    addressLine1: Yup.string().nullable(),
    addressLine2: Yup.string().nullable(),
    areaId: Yup.string().nullable(),
    status: Yup.number().required('Status is required').oneOf([0, 1])
  });

  const handleSubmit = async (
    values: Patient,
    { resetForm }: FormikHelpers<Patient>
  ) => {
    try {
      let respond: any;

      setLoading(true);

      if (patient && patient.id) {
        respond = await updatePatientAction(patient.id, values);
        setLoading(false);

        if (respond.isError) {
          throw new Error(respond.errors.message);
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Patient was updated successfully'
        });
        router.push('/patients');
      } else {
        respond = await createPatientAction(values);
        setLoading(false);

        if (respond.isError) {
          throw new Error(respond.errors.message);
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Patient was created successfully'
        });

        router.push('/patients');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Patient save unsuccessful.'
      });
    }
  };

  const styleClasses = {
    parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
    labelClassName: 'text-sm text-black font-semibold capitalize',
    inputClassName: 'col-span-full sm:col-span-3'
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {(formik) => {
        return (
          <Form className="w-full">
            <div className="grid gap-4 border rounded-lg p-6">
              {/* Title */}
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Title <span className="text-red-600">*</span>
                </Label>
                <div className={styleClasses.inputClassName}>
                  <CustomSelectField
                    id="title"
                    placeholder="Select Title"
                    value={formik.values.title}
                    onChange={(value) => formik.setFieldValue('title', value)}
                    required
                    options={TITLE_LIST.map((t) => ({
                      id: t.name,
                      name: t.name
                    }))}
                    styleClasses={{
                      ...styleClasses,
                      parentDiv: '',
                      inputClassName: '',
                      labelClassName: 'hidden'
                    }}
                  />
                </div>
              </div>

              {/* Name */}
              <CustomFormField
                type="text"
                id="name"
                placeholder="Patient Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {/* Code */}
              <CustomFormField
                type="text"
                id="code"
                placeholder="Patient Code"
                value={formik.values.code}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              {/* Gender */}
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Gender <span className="text-red-600">*</span>
                </Label>
                <div className={styleClasses.inputClassName}>
                  <CustomSelectField
                    id="sex"
                    placeholder="Select Gender"
                    value={formik.values.sex}
                    onChange={(value) => formik.setFieldValue('sex', value)}
                    required
                    options={[
                      { id: '0', name: 'Male' },
                      { id: '1', name: 'Female' },
                      { id: '2', name: 'Other' }
                    ]}
                    styleClasses={{
                      ...styleClasses,
                      parentDiv: '',
                      inputClassName: '',
                      labelClassName: 'hidden'
                    }}
                  />
                </div>
              </div>

              {/* Date of Birth */}
              {/* Date of Birth */}
              <CustomDatePickerField
                id="dateOfBirth"
                placeholder="Date of Birth"
                value={
                  formik.values.dateOfBirth
                    ? new Date(formik.values.dateOfBirth)
                    : undefined
                }
                onChange={(date) => {
                  formik.setFieldValue(
                    'dateOfBirth',
                    date ? date.getTime() : undefined
                  );
                }}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
                error={formik.errors.dateOfBirth as string}
                touched={formik.touched.dateOfBirth}
                captionLayout="dropdown"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />

              {/* Age */}
              <CustomFormField
                type="number"
                id="age"
                placeholder="Age"
                value={formik.values.age}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {/* Phone */}
              <CustomFormField
                type="text"
                id="phone"
                placeholder="Phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {/* Email */}
              <CustomFormField
                type="text"
                id="email"
                placeholder="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              {/* Address 1 */}
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

              {/* Address 2 */}
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

              {/* City */}
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>City</Label>
                <div className={styleClasses.inputClassName}>
                  <CustomSelectField
                    id="areaId"
                    placeholder="Select Area"
                    value={formik.values.areaId || ''}
                    onChange={(value) => formik.setFieldValue('areaId', value)}
                    required={false}
                    options={areas.map((a) => ({ id: a.id, name: a.name }))}
                    styleClasses={{
                      ...styleClasses,
                      parentDiv: '',
                      inputClassName: '',
                      labelClassName: 'hidden'
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Status <span className="text-red-600">*</span>
                </Label>
                <div className={styleClasses.inputClassName}>
                  <CustomSelectField
                    id="status"
                    placeholder="Visibility"
                    value={formik.values.status?.toString()}
                    onChange={(value) =>
                      formik.setFieldValue('status', parseInt(value))
                    }
                    required
                    options={[
                      { id: '0', name: 'Unpublish' },
                      { id: '1', name: 'Publish' }
                    ]}
                    styleClasses={{
                      ...styleClasses,
                      parentDiv: '',
                      inputClassName: '',
                      labelClassName: 'hidden'
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={() => {
                    router.push('/patients');
                  }}
                  disabled={loading}
                >
                  <DisabledIcon />
                  <span>Cancel</span>
                </Button>
                <Button
                  disabled={loading}
                  size={'sm'}
                  type="submit"
                  className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                >
                  <SaveIcon />
                  <span>Save</span>
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default PatientForm;
