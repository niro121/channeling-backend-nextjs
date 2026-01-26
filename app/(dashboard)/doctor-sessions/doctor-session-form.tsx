'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { DisabledIcon, SaveIcon } from '@/components/icons';
import {
  createLocation,
  updateOneLocation
} from '@/app/actions/location.action';
import { DoctorSessionFormValues } from '@/types/doctor.session';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DoctorSessionFormProps = {
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
};

export default function DoctorSessionForm({ user }: DoctorSessionFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: DoctorSessionFormValues = {};

  const validationSchema = Yup.object({});

  const handleSubmit = async (
    values: DoctorSessionFormValues,
    { resetForm }: FormikHelpers<DoctorSessionFormValues>
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
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Session Details</TabsTrigger>
                <TabsTrigger value="fees">Session Fees</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <div className="grid gap-4 border rounded-lg p-6"></div>
              </TabsContent>
              <TabsContent value="fees">Change your password here.</TabsContent>
            </Tabs>
          </Form>
        );
      }}
    </Formik>
  );
}
