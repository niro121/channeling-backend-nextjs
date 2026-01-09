'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Location, LocationFormValues } from '@/types/location';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { DisabledIcon, SaveIcon } from '@/components/icons';
import {
  createLocation,
  updateOneLocation
} from '@/app/actions/location.action';

type LocationFormProps = {
  location: Location | null;
  locationOptions: { id: string; name: string }[];
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
};

export default function DoctorForm({
  location,
  locationOptions,
  user
}: LocationFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: LocationFormValues = {
    name: location?.name ?? '',
    code: location?.code ?? '',
    addressLine1: location?.addressLine1 ?? '',
    addressLine2: location?.addressLine2 ?? '',
    city: location?.city ?? '',
    status: location?.status ?? 0,
    branchType: location?.branchType ? String(location?.branchType) : ''
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(150, 'Must be less than 150 characters')
      .required('This field is mandatory'),
    branchType: Yup.string()
      .oneOf(
        ['1', '2', '3'],
        'BranchType must be Main Location (1), Branch (2) or Collection Center(3)'
      )
      .required('This field is mandatory'),
    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: LocationFormValues,
    { resetForm }: FormikHelpers<LocationFormValues>
  ) => {
    try {
      setLoading(true);
      let respond: any;

      if (location && location.id) {
        respond = await updateOneLocation(location.id, values);
        setLoading(false);

        if (!respond?.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Location update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Location was updated successfully'
        });
        router.push('/locations');
      } else {
        respond = await createLocation(values, user);
        setLoading(false);

        if (!respond?.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Location save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Location was created successfully'
        });

        if (respond.data?.id) {
          router.push(`/locations/${respond.data.id}/edit`);
        } else {
          router.push('/locations');
        }
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'location save unsuccessful.'
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
                id="branchType"
                placeholder="Location Type"
                value={formik.values.branchType}
                onChange={(value) => formik.setFieldValue('branchType', value)}
                required
                options={locationOptions}
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
                id="code"
                placeholder="Short Code"
                value={formik.values.code}
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
                  onClick={() => {
                    router.push('/locations');
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
}
