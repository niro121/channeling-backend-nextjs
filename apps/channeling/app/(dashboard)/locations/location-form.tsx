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
import { formatLKR } from '@/lib/format-money';
import { Label } from '@/components/ui/label';
import { Ban, Save, BookOpen, ExternalLink, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import {
  createLocation,
  updateOneLocation,
  createLocationAccount,
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

export default function LocationForm({
  location,
  locationOptions,
  isEditPage = false,
  user
}: LocationFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [creatingAccount, setCreatingAccount] = React.useState<boolean>(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: LocationFormValues = {
    name: location?.name ?? '',
    code: location?.code ?? '',
    addressLine1: location?.addressLine1 ?? '',
    addressLine2: location?.addressLine2 ?? '',
    city: location?.city ?? '',
    status: location?.status ?? 1,
    branchType: location?.branchType ? String(location?.branchType) : ''
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(150, 'Must be less than 150 characters')
      .required('This field is mandatory'),
    code: Yup.string()
      .max(100, 'Must be less than 100 characters')
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
    { resetForm, setErrors, setTouched }: FormikHelpers<LocationFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    try {
      setLoading(true);
      let respond: any;

      if (location && location.id) {
        respond = await updateOneLocation(location.id, values);
        setLoading(false);

        if (!respond?.success) {
          // Handle server-side validation errors
          if (respond?.error?.issues) {
            const fieldErrors: any = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errors = respond.error.issues[key];
              if (Array.isArray(errors) && errors.length > 0) {
                fieldErrors[key] = errors[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as any)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Location update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Location was updated successfully'
        });
        if (closeAfterSave) router.push('/locations');
        else router.refresh();
      } else {
        respond = await createLocation(values, user);
        setLoading(false);

        if (!respond?.success) {
          // Handle server-side validation errors
          if (respond?.error?.issues) {
            const fieldErrors: any = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errors = respond.error.issues[key];
              if (Array.isArray(errors) && errors.length > 0) {
                fieldErrors[key] = errors[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as any)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Location save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Location was created successfully'
        });
        const newId = respond?.data?.id;
        if (closeAfterSave) router.push('/locations');
        else if (newId) router.push(`/locations/${newId}/edit`);
        else router.push('/locations');
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Location save unsuccessful.'
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
            {isEditPage && location && (
              <div className="grid gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-6 mb-6">
                <h3 className="text-lg font-semibold">Balance</h3>
                <div className={styleClasses.parentDiv}>
                  <Label className={styleClasses.labelClassName}>Current cash balance</Label>
                  <div className={styleClasses.inputClassName}>
                    <span className="font-medium tabular-nums">
                      {location.accountId ? formatLKR(Number(location.balance ?? 0)) : '—'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Cash account',
                      id: location.accountId,
                      name: location.accountName,
                      code: location.accountCode,
                    },
                    {
                      label: 'Income account',
                      id: location.incomeAccountId,
                      name: location.incomeAccountName,
                      code: location.incomeAccountCode,
                    },
                    {
                      label: 'Expense account',
                      id: location.expenseAccountId,
                      name: location.expenseAccountName,
                      code: location.expenseAccountCode,
                    },
                  ].map((acc) => (
                    <div key={acc.label} className={styleClasses.parentDiv}>
                      <Label className={styleClasses.labelClassName}>{acc.label}</Label>
                      <div className={styleClasses.inputClassName}>
                        {acc.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">
                              {acc.name ?? acc.code ?? '—'}
                              {acc.code && acc.name ? ` (${acc.code})` : ''}
                            </span>
                            <Button size="sm" variant="outline" className="gap-1.5" asChild>
                              <Link href={`/accounting/${acc.id}/statement`}>
                                <BookOpen className="h-4 w-4" />
                                Statement
                              </Link>
                            </Button>
                            <Button size="sm" className="gap-1.5" asChild>
                              <Link href={`/accounting/${acc.id}/edit`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Open account
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not linked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {(!location.accountId || !location.incomeAccountId || !location.expenseAccountId) && (
                  <>
                    <p className="text-muted-foreground text-sm">
                      One or more location GL accounts are missing. Create missing cash, income, and expense accounts.
                    </p>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={creatingAccount}
                      onClick={async () => {
                        if (!location.id) return;
                        setCreatingAccount(true);
                        try {
                          const res = await createLocationAccount(location.id);
                          if (res.success) {
                            toast({
                              variant: 'success',
                              title: 'Success',
                              description: res.message ?? 'Location GL accounts created.',
                            });
                            router.refresh();
                          } else {
                            toast({
                              variant: 'destructive',
                              title: 'Error',
                              description: res.message ?? 'Failed to create missing location GL accounts.',
                            });
                          }
                        } finally {
                          setCreatingAccount(false);
                        }
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      {creatingAccount ? 'Creating…' : 'Create missing accounts'}
                    </Button>
                  </>
                )}
              </div>
            )}
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
                required
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
                  onClick={() => router.push('/locations')}
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
