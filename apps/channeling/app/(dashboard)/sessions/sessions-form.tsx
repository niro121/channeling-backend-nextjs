'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import { Button } from '@/components/ui/button';
import { DisabledIcon, SaveIcon, PlusCircle } from '@/components/icons';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import CustomSelectField from '@/components/common/custom-select-field';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { SessionFormValues } from '@/types/sessions';
// import { createSessions, updateSessions } from '@/app/actions/sessions.action';

type SessionsFormProps = {
  type: 'ONE_DOCTOR' | 'ALL_DOCTOR';
  doctorId?: string;
  doctorOptions: { id: string; name: string }[];
  onClose: () => void;
  user?: {id?: string, name?: string}
};

export default function SessionsForm({
  type,
  doctorId,
  doctorOptions,
  onClose
}: SessionsFormProps) {
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const initialValues: SessionFormValues = {
    doctorId: doctorId ?? null,
    fromDate: new Date(),
    toDate: new Date()
  };

  const validationSchema = Yup.object({
    doctorId: Yup.string().required('This field is mandatory')
  });

  const handleCreateSession = async (
    values: SessionFormValues,
    helpers: FormikHelpers<SessionFormValues>
  ) => {
    /* try {
      setLoading(true);

      const respond = await createSessions(values);

      if (!respond?.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Session generation unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Session was generated successfully'
      });

      helpers.resetForm();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Session generation unsuccessful.'
      });
    } finally {
      setLoading(false);
    } */
  };

  const handleUpdateSession = async (values: SessionFormValues) => {
    /* try {
      setLoading(true);

      const respond = await updateSessions(values);

      if (!respond?.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Session update unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Session was updated successfully'
      });

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Session update unsuccessful.'
      });
    } finally {
      setLoading(false);
    } */
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={() => {
        // submission is controlled manually by buttons
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
                disabled={type === 'ALL_DOCTOR' || doctorOptions.length === 0}
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
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <DisabledIcon />
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const errors = await formik.validateForm();
                    if (Object.keys(errors).length === 0) {
                      await handleCreateSession(formik.values, formik);
                    }
                  }}
                  className="gap-1 px-8 text-white hover:text-black"
                >
                  <PlusCircle />
                  Analyse & Create
                </Button>

                <Button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const errors = await formik.validateForm();
                    if (Object.keys(errors).length === 0) {
                      await handleUpdateSession(formik.values);
                    }
                  }}
                  className="gap-1 px-8 text-white hover:text-black"
                >
                  <SaveIcon />
                  Update Only
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
