'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import CustomSelectField from '@/components/common/custom-select-field';
import { useRouter } from 'next/navigation';
import { Speciality, SpecialityFormValues } from '@/types/speciality';
import {
  createSpeciality,
  updateOneSpeciality
} from '@/app/actions/speciality.actions';

type SpecialityFormProps = {
  speciality: Speciality | null;
  isEditPage?: boolean;
  user?: {
    id?: string
    name?: string
  }
};

export default function SpecialityForm({ speciality, isEditPage = false, user }: SpecialityFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: SpecialityFormValues = {
    name: speciality?.name ? speciality.name : '',
    code: speciality?.code ? speciality.code : '',
    description: speciality?.description ? speciality.description : '',
    status: speciality?.status ? speciality.status : 0
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(100, 'Must be less than 100 characters')
      .required('This field is mandatory'),
    description: Yup.string().max(500, 'Must be less than 500 characters'),
    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: SpecialityFormValues,
    { setErrors, setTouched }: FormikHelpers<SpecialityFormValues>
  ) => {
    try {
      let respond: any;

      setLoading(true);

      if (speciality && speciality.id) {
        respond = await updateOneSpeciality(speciality.id, values);

        setLoading(false);

        if (!respond?.success) {
          if (respond?.error?.issues && typeof respond.error.issues === 'object') {
            const fieldErrors: Record<string, string> = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const err = respond.error.issues[key];
              if (Array.isArray(err) && err.length > 0) {
                fieldErrors[key] = err[0];
              }
            });
            if (Object.keys(fieldErrors).length > 0) {
              setErrors(fieldErrors);
              setTouched(
                Object.keys(fieldErrors).reduce(
                  (acc, key) => {
                    acc[key] = true;
                    return acc;
                  },
                  {} as Record<string, boolean>
                )
              );
            }
          }
          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond?.error?.message ?? 'Speciality update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Speciality was updated successfully'
        });
        router.push('/specialities');
      } else {
        respond = await createSpeciality(values, user);

        setLoading(false);

        if (!respond?.success) {
          if (respond?.error?.issues && typeof respond.error.issues === 'object') {
            const fieldErrors: Record<string, string> = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const err = respond.error.issues[key];
              if (Array.isArray(err) && err.length > 0) {
                fieldErrors[key] = err[0];
              }
            });
            if (Object.keys(fieldErrors).length > 0) {
              setErrors(fieldErrors);
              setTouched(
                Object.keys(fieldErrors).reduce(
                  (acc, key) => {
                    acc[key] = true;
                    return acc;
                  },
                  {} as Record<string, boolean>
                )
              );
            }
          }
          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond?.error?.message ?? 'Speciality save unsuccessful.'
          });
          return;
        }

        if (respond.data?.id) {
          router.push(`/specialities/${respond.data.id}/edit`);
        } else {
          router.push('/specialities');
        }
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Speciality was created successfully'
        });
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Speciality save unsuccessful.'
      });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize={isEditPage}
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

              <CustomFormField
                type="text"
                id="code"
                placeholder="Code (Auto Generated)"
                value={formik.values.code}
                disabled={true}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="textarea"
                id="description"
                placeholder="Description"
                value={formik.values.description || ''}
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
                    router.push('/specialities');
                  }}
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  disabled={loading}
                  size={'sm'}
                  type="submit"
                  className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                >
                  <Save className="h-4 w-4" />
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
