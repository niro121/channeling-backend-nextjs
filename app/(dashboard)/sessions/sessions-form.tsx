'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { DisabledIcon, SaveIcon } from '@/components/icons';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import CustomSelectField from '@/components/common/custom-select-field';
import { useRouter } from 'next/navigation';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { PlusCircle } from '@/components/icons';
import { SessionFormValues } from '@/types/sessions';
import { createSessions, updateSessions } from '@/app/actions/sessions.action';

type SessionsFormProps = {
  doctorId?: string;
  doctorOptions: { id: string; name: string }[];
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
  onClose: () => void
};

type SubmitAction = 'create' | 'update';

export default function SessionsForm({
  doctorId,
  doctorOptions,
  user,
  onClose
}: SessionsFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [submitAction, setSubmitAction] = React.useState<SubmitAction | null>(
    null
  );

  const initialValues: SessionFormValues = {
    doctorId: doctorId ?? '',
    fromDate: new Date(),
    toDate: new Date()
  };

  const validationSchema = Yup.object({
    doctorId: Yup.string().required('This field is mandatory')
  });

  const handleCreateSession = async (
    values: SessionFormValues,
    { resetForm }: FormikHelpers<SessionFormValues>
  ) => {
    try {
      setLoading(true);

      const respond = await createSessions();

      if (!respond?.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Session generation unsuccessful.'
        });
        setLoading(false);
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Session was generated successfully'
      });
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Session generation unsuccessful.'
      });
    }
  };

  const handleUpdateSession = async (
    values: SessionFormValues,
    { resetForm }: FormikHelpers<SessionFormValues>
  ) => {
    try {
      setLoading(true);

      const respond = await updateSessions();

      if (!respond?.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Session update unsuccessful.'
        });
        setLoading(false);
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Session was updated successfully'
      });
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Session update unsuccessful.'
      });
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, helpers) => {
        if (!submitAction) return;

        try {
          if (submitAction === 'create') {
            await handleCreateSession(values, helpers);
          }

          if (submitAction === 'update') {
            await handleUpdateSession(values, helpers);
          }
        } finally {
          setSubmitAction(null);
        }
      }}
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
                id="doctorId"
                placeholder="Select Doctor"
                value={formik.values.doctorId}
                onChange={(value) => formik.setFieldValue('doctorId', value)}
                required
                disabled={doctorOptions.length === 0}
                options={doctorOptions}
                styleClasses={styleClasses}
              />

              <CustomDatePickerField
                id="fromDate"
                placeholder="From Date"
                value={formik.values.fromDate}
                required
                onChange={(value) => formik.setFieldValue('fromDate', value)}
                onBlur={formik.handleBlur}
                styleClasses={styleClasses}
              />

              <CustomDatePickerField
                id="toDate"
                placeholder="To Date"
                value={formik.values.toDate}
                required
                onChange={(value) => formik.setFieldValue('toDate', value)}
                onBlur={formik.handleBlur}
                styleClasses={styleClasses}
              />

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                >
                  <DisabledIcon />
                  <span>Cancel</span>
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  onClick={() => setSubmitAction('create')}
                  className="gap-1 px-8 text-white hover:text-black"
                >
                  <PlusCircle />
                  <span className="sr-only sm:not-sr-only">
                    Analyse & Create
                  </span>
                </Button>

                <Button
                  size="sm"
                  type="submit"
                  onClick={() => setSubmitAction('update')}
                  className="gap-1 px-8 text-white hover:text-black"
                >
                  <SaveIcon />
                  <span className="sr-only sm:not-sr-only">Update Only</span>
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
