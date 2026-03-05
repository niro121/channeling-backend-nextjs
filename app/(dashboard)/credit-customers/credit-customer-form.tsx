'use client';

import React, { useState } from 'react';
import type { CreditCustomer, CreditCustomerFormValues } from '@/types/credit-customer';
import { Form, Formik } from 'formik';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save, BookOpen, ExternalLink, PlusCircle } from 'lucide-react';
import * as Yup from 'yup';
import Link from 'next/link';
import {
  createCreditCustomer,
  updateCreditCustomer,
  createCreditCustomerAccount,
} from '@/app/actions/credit-customer.actions';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';

type CreditCustomerFormProps = {
  creditCustomer?: CreditCustomer | null;
  isEditPage?: boolean;
};

const STATUS_OPTIONS = [
  { id: '1', name: 'Published' },
  { id: '0', name: 'Unpublished' },
];

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required').max(200, 'Max 200 characters'),
  code: Yup.string().max(50).nullable(),
  contactPersonName: Yup.string().required('Contact person name is required').max(200),
  phone: Yup.string().nullable(),
  mobile: Yup.string().nullable(),
  email: Yup.string().email('Invalid email').nullable(),
  addressLine1: Yup.string().max(200).nullable(),
  addressLine2: Yup.string().max(200).nullable(),
  city: Yup.string().max(100).nullable(),
  contactPersonPhone: Yup.string().nullable(),
  contactPersonEmail: Yup.string().email('Invalid email').nullable(),
  status: Yup.number().required('Status is required').oneOf([0, 1], 'Must be Published or Unpublished'),
});

export default function CreditCustomerForm({
  creditCustomer,
  isEditPage = false,
}: CreditCustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: CreditCustomerFormValues = {
    name: creditCustomer?.name ?? '',
    code: creditCustomer?.code ?? '',
    phone: creditCustomer?.phone ?? '',
    mobile: creditCustomer?.mobile ?? '',
    email: creditCustomer?.email ?? '',
    addressLine1: creditCustomer?.addressLine1 ?? '',
    addressLine2: creditCustomer?.addressLine2 ?? '',
    city: creditCustomer?.city ?? '',
    contactPersonName: creditCustomer?.contactPersonName ?? '',
    contactPersonPhone: creditCustomer?.contactPersonPhone ?? '',
    contactPersonEmail: creditCustomer?.contactPersonEmail ?? '',
    status: creditCustomer?.status !== undefined && creditCustomer?.status !== null ? creditCustomer.status : 1,
  };

  const styleClasses = {
    parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
    labelClassName: 'text-sm text-black font-semibold capitalize',
    inputClassName: 'col-span-full sm:col-span-3',
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values) => {
        try {
          await validationSchema.validate(values, { abortEarly: false });
          setLoading(true);
          const payload: CreditCustomerFormValues = {
            ...values,
            code: values.code?.trim() || undefined,
          };
          const respond = isEditPage && creditCustomer?.id
            ? await updateCreditCustomer(creditCustomer.id, payload)
            : await createCreditCustomer(payload);
          setLoading(false);

          if (respond.isError) {
            const err = respond.errors;
            if (err?.issues && typeof err.issues === 'object') {
              const fieldErrors: Record<string, string> = {};
              Object.entries(err.issues).forEach(([key, val]) => {
                const arr = Array.isArray(val) ? val : [val];
                if (arr.length) fieldErrors[key] = String(arr[0]);
              });
              toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: err.message ?? 'Please check the form.',
              });
              return;
            }
            toast({
              variant: 'destructive',
              title: 'Error',
              description: err?.message ?? 'Save failed.',
            });
            return;
          }

          toast({
            variant: 'success',
            title: 'Success',
            description: isEditPage ? 'Credit customer updated successfully' : 'Credit customer created successfully',
          });
          const closeAfterSave = saveAndCloseRef.current;
          if (closeAfterSave) {
            router.push('/credit-customers');
          } else if (isEditPage) {
            router.refresh();
          } else {
            const newId = (respond as { data?: { id?: string } })?.data?.id;
            if (newId) router.push(`/credit-customers/${newId}/edit`);
            else router.push('/credit-customers');
          }
        } catch (err: unknown) {
          setLoading(false);
          if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ValidationError') {
            const yupErr = err as { inner?: { path?: string; message?: string }[] };
            const errors = (yupErr.inner ?? []).reduce((acc: Record<string, string>, e) => {
              if (e.path) acc[e.path] = e.message ?? '';
              return acc;
            }, {});
            toast({
              variant: 'destructive',
              title: 'Validation Error',
              description: 'Please check the form for errors.',
            });
            return;
          }
          toast({
            variant: 'destructive',
            title: 'Error',
            description: err instanceof Error ? err.message : 'Save failed.',
          });
        }
      }}
      enableReinitialize
    >
      {(formik) => (
        <Form className="w-full space-y-6">
          {isEditPage && creditCustomer && (
            <div className="grid gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-6">
              <h3 className="text-lg font-semibold">Balance</h3>
              {creditCustomer.accountId ? (
                <>
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>Current balance (from account)</Label>
                    <div className={styleClasses.inputClassName}>
                      <span className="font-medium tabular-nums">
                        {Number(creditCustomer.balance ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className={styleClasses.parentDiv}>
                    <Label className={styleClasses.labelClassName}>Linked account</Label>
                    <div className={styleClasses.inputClassName}>
                      <span className="text-muted-foreground">
                        {creditCustomer.accountName ?? creditCustomer.accountCode ?? '—'}
                        {creditCustomer.accountCode && creditCustomer.accountName
                          ? ` (${creditCustomer.accountCode})`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      asChild
                    >
                      <Link href={`/accounting/${creditCustomer.accountId}/statement`}>
                        <BookOpen className="h-4 w-4" />
                        Statement
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      asChild
                    >
                      <Link href={`/accounting/${creditCustomer.accountId}/statement`} target="_blank" rel="noopener noreferrer">
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
                      if (!creditCustomer.id) return;
                      setCreatingAccount(true);
                      try {
                        const res = await createCreditCustomerAccount(creditCustomer.id);
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

          <div className="grid gap-4 rounded-lg border p-6">
            <h3 className="text-lg font-medium">Basic details</h3>
            <CustomFormField
              type="text"
              id="name"
              placeholder="Company name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="code"
              placeholder="Code (optional — auto-generated if blank)"
              value={formik.values.code ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
            <div className={styleClasses.parentDiv}>
              <Label className={styleClasses.labelClassName}>Status</Label>
              <div className={styleClasses.inputClassName}>
                <CustomSelectField
                  id="status"
                  placeholder="Select status"
                  value={String(formik.values.status)}
                  onChange={(v) => formik.setFieldValue('status', v === '1' ? 1 : 0)}
                  options={STATUS_OPTIONS}
                  styleClasses={{ ...styleClasses, parentDiv: '', inputClassName: '', labelClassName: 'hidden' }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border p-6">
            <h3 className="text-lg font-medium">Contact</h3>
            <CustomFormField
              type="text"
              id="phone"
              placeholder="Phone"
              value={formik.values.phone ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="mobile"
              placeholder="Mobile"
              value={formik.values.mobile ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="email"
              placeholder="Email"
              value={formik.values.email ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
          </div>

          <div className="grid gap-4 rounded-lg border p-6">
            <h3 className="text-lg font-medium">Address</h3>
            <CustomFormField
              type="text"
              id="addressLine1"
              placeholder="Address line 1"
              value={formik.values.addressLine1 ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="addressLine2"
              placeholder="Address line 2"
              value={formik.values.addressLine2 ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="city"
              placeholder="City"
              value={formik.values.city ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
          </div>

          <div className="grid gap-4 rounded-lg border p-6">
            <h3 className="text-lg font-medium">Contact person</h3>
            <CustomFormField
              type="text"
              id="contactPersonName"
              placeholder="Contact person name"
              value={formik.values.contactPersonName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="contactPersonPhone"
              placeholder="Contact person phone"
              value={formik.values.contactPersonPhone ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
            <CustomFormField
              type="text"
              id="contactPersonEmail"
              placeholder="Contact person email"
              value={formik.values.contactPersonEmail ?? ''}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
              type="button"
              onClick={() => router.push('/credit-customers')}
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
              onClick={() => {
                saveAndCloseRef.current = false;
                formik.submitForm();
              }}
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
              onClick={() => {
                saveAndCloseRef.current = true;
                formik.submitForm();
              }}
            >
              <Save className="h-4 w-4" />
              <span>Save and Close</span>
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
