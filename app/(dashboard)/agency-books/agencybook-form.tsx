'use client';

import React, { useState } from 'react';
import { AgencyBook, AgencyBookFormValues } from '@/types/agencybook';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import * as Yup from 'yup';
import {
  createAgencyBook,
  updateAgencyBook
} from '@/app/actions/agencybook.actions';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';

type Option = {
  id: string;
  name: string;
};

type AgencyBookFormProps = {
  agencyBook?: AgencyBook | null;
  isEditPage?: boolean;
  agencyOptions?: Option[];
};

const AgencyBookForm = ({
  agencyBook,
  isEditPage = false,
  agencyOptions = []
}: AgencyBookFormProps) => {
  const initialValues: AgencyBookFormValues = {
    bookNumber: agencyBook?.bookNumber ? agencyBook.bookNumber : '',
    startNumber: agencyBook?.startNumber ? agencyBook.startNumber : '',
    endNumber: agencyBook?.endNumber ? agencyBook.endNumber : '',
    status: agencyBook?.status !== undefined && agencyBook.status !== null ? agencyBook.status : 1, // Default Active
    agencyId: agencyBook?.agencyId ? agencyBook.agencyId : ''
  };

  const [loading, setLoading] = useState<boolean>(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const validationSchema = Yup.object({
    bookNumber: Yup.string()
      .required('Book number is required')
      .max(100, 'Must be less than 100 characters'),
    startNumber: Yup.string()
      .required('Start number is required')
      .max(100, 'Must be less than 100 characters'),
    endNumber: Yup.string()
      .required('End number is required')
      .max(100, 'Must be less than 100 characters'),
    status: Yup.number()
      .required('Status is required')
      .oneOf([0, 1], 'Status must be either 0 or 1'),
    agencyId: Yup.string()
      .required('Agency is required')
      .min(1, 'Agency is required')
  });

  const handleSubmit = async (
    values: AgencyBookFormValues,
    { resetForm }: FormikHelpers<AgencyBookFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    try {
      let respond: any;

      setLoading(true);

      if (agencyBook && agencyBook.id) {
        respond = await updateAgencyBook(agencyBook.id, values);
        setLoading(false);

        if (respond.isError) {
          throw new Error(respond.errors.message);
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Agency book was updated successfully'
        });
        if (closeAfterSave) router.push('/agency-books');
        else router.refresh();
      } else {
        respond = await createAgencyBook(values);
        setLoading(false);

        if (respond.isError) {
          throw new Error(respond.errors.message);
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Agency book was created successfully'
        });
        const newId = respond?.data?.id;
        if (closeAfterSave) router.push('/agency-books');
        else if (newId) router.push(`/agency-books/${newId}/edit`);
        else router.push('/agency-books');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Agency book save unsuccessful.'
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
              {/* Agency Name */}
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Agency Name <span className="text-red-600">*</span>
                </Label>
                <div className={styleClasses.inputClassName}>
                  <CustomSelectField
                    id="agencyId"
                    placeholder="Select Agency"
                    value={formik.values.agencyId || ''}
                    onChange={(value) => {
                      formik.setFieldValue('agencyId', value);
                    }}
                    required
                    options={agencyOptions}
                    styleClasses={{
                      ...styleClasses,
                      parentDiv: '',
                      inputClassName: '',
                      labelClassName: 'hidden'
                    }}
                  />
                </div>
              </div>

              {/* Book Number */}
              <CustomFormField
                type="text"
                id="bookNumber"
                placeholder="Book Number"
                value={formik.values.bookNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {/* Start Number */}
              <CustomFormField
                type="text"
                id="startNumber"
                placeholder="Start Number"
                value={formik.values.startNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {/* End Number */}
              <CustomFormField
                type="text"
                id="endNumber"
                placeholder="End Number"
                value={formik.values.endNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              {/* Status */}
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Status <span className="text-red-600">*</span>
                </Label>
                <div className={styleClasses.inputClassName}>
                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status?.toString()}
                    onChange={(value) =>
                      formik.setFieldValue('status', parseInt(value))
                    }
                    required
                    options={[
                      { id: '0', name: 'Inactive' },
                      { id: '1', name: 'Active' }
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
                  onClick={() => router.push('/agency-books')}
                  disabled={loading}
                >
                  <Ban />
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
};

export default AgencyBookForm;

