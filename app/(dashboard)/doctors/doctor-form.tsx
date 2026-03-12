'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Doctor, DoctorFormValues, TITLE_OPTIONS, normalizeTitleForSelect } from '@/types/doctor';
import { createDoctor, updateOneDoctor, createDoctorAccount } from '@/app/actions/doctor.actions';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save, BookOpen, ExternalLink, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { sriLankaPhoneRegex, sriLankaMobileRegex } from '@/lib/regex';
import { formatLKR } from '@/lib/format-money';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from 'formik';

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
  isEditPage = false,
  user
}: DoctorFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [creatingAccount, setCreatingAccount] = React.useState<boolean>(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  // Handler to allow only numeric input
  const handleNumericKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, and arrow keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))
    ) {
      return;
    }
    // Allow only numbers (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

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
      .transform((v) => (typeof v === 'string' ? v.trim().replace(/\s/g, '') : v))
      .required('Mobile number is required')
      .matches(sriLankaMobileRegex, 'Mobile Number Ex: 07x xxxxxxx'),
    registrationNumber: Yup.string().trim().nullable().optional(),
    qualification: Yup.string().trim().nullable().optional(),
    referralCharge: Yup.number().min(0, 'Must be 0 or greater').nullable().optional(),
    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: DoctorFormValues,
    { resetForm, setFieldError }: FormikHelpers<DoctorFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;
    try {
      setLoading(true);
      let respond: any;

      if (doctor && doctor.id) {
        respond = await updateOneDoctor(doctor.id, values);
        setLoading(false);

        if (!respond?.success) {
          if (respond?.error?.issues?.mobile) {
            setFieldError('mobile', Array.isArray(respond.error.issues.mobile) ? respond.error.issues.mobile[0] : respond.error.issues.mobile);
          }
          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Doctor update unsuccessful.'
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
          if (respond?.error?.issues?.mobile) {
            setFieldError('mobile', Array.isArray(respond.error.issues.mobile) ? respond.error.issues.mobile[0] : respond.error.issues.mobile);
          }
          toast({
            variant: 'destructive',
            title: 'Error',
            description: respond.error?.message || 'Doctor save unsuccessful.'
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
          labelClassName: 'text-sm text-black font-semibold capitalize sm:col-span-1',
          inputClassName: 'col-span-full sm:col-span-3 w-full'
        };

        return (
          <Form className="w-full">
            {isEditPage && doctor && (
              <div className="grid gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-6 mb-6">
                <h3 className="text-lg font-semibold">Balance</h3>
                {doctor.accountId ? (
                  <>
                    <div className={styleClasses.parentDiv}>
                      <Label className={styleClasses.labelClassName}>Current balance (from account)</Label>
                      <div className={styleClasses.inputClassName}>
                        <span className="font-medium tabular-nums">
                          {formatLKR(Number(doctor.balance ?? 0))}
                        </span>
                      </div>
                    </div>
                    <div className={styleClasses.parentDiv}>
                      <Label className={styleClasses.labelClassName}>Linked account</Label>
                      <div className={styleClasses.inputClassName}>
                        <span className="text-muted-foreground">
                          {doctor.accountName ?? doctor.accountCode ?? '—'}
                          {doctor.accountCode && doctor.accountName
                            ? ` (${doctor.accountCode})`
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" asChild>
                        <Link href={`/accounting/${doctor.accountId}/statement`}>
                          <BookOpen className="h-4 w-4" />
                          Statement
                        </Link>
                      </Button>
                      <Button size="sm" className="gap-1.5" asChild>
                        <Link href={`/accounting/${doctor.accountId}/statement`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Open account
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-sm">No GL account linked. Create one to track balance and view statement.</p>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={creatingAccount}
                      onClick={async () => {
                        if (!doctor.id) return;
                        setCreatingAccount(true);
                        try {
                          const res = await createDoctorAccount(doctor.id);
                          if (res.success) {
                            toast({
                              variant: 'success',
                              title: 'Success',
                              description: res.message ?? 'GL account created.',
                            });
                            router.refresh();
                          } else {
                            toast({
                              variant: 'destructive',
                              title: 'Error',
                              description: res.message ?? 'Failed to create GL account.',
                            });
                          }
                        } finally {
                          setCreatingAccount(false);
                        }
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      {creatingAccount ? 'Creating…' : 'Create GL account'}
                    </Button>
                  </>
                )}
              </div>
            )}
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

              <div className={styleClasses.parentDiv}>
                <Label htmlFor="phone" className={styleClasses.labelClassName}>
                  Phone
                </Label>
                <div className={styleClasses.inputClassName}>
                  <Input
                    className="p-2 border rounded focus-visible:ring-offset-0! w-full"
                    type="text"
                    id="phone"
                    name="phone"
                    placeholder="07X XXXXXXX"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    onKeyDown={handleNumericKeyPress}
                  />
                  <ErrorMessage
                    name="phone"
                    component="div"
                    className="invalid-feedback text-red-600 text-sm whitespace-pre-wrap pt-1 sm:pt-0"
                  />
                </div>
              </div>

              <div className={styleClasses.parentDiv}>
                <Label htmlFor="mobile" className={styleClasses.labelClassName}>
                  Mobile <span className="text-destructive">*</span>
                </Label>
                <div className={styleClasses.inputClassName}>
                  <Input
                    className="p-2 border rounded focus-visible:ring-offset-0! w-full"
                    type="text"
                    id="mobile"
                    name="mobile"
                    placeholder="07X XXXXXXX"
                    value={formik.values.mobile}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    onKeyDown={handleNumericKeyPress}
                  />
                  <ErrorMessage
                    name="mobile"
                    component="div"
                    className="invalid-feedback text-red-600 text-sm whitespace-pre-wrap pt-1 sm:pt-0"
                  />
                </div>
              </div>

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
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="textarea"
                id="qualification"
                placeholder="Qualification"
                value={formik.values.qualification}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="number"
                id="referralCharge"
                placeholder="Referral Charge"
                value={formik.values.referralCharge}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
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
