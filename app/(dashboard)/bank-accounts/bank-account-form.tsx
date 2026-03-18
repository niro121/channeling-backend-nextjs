'use client';

import React, { useState, useEffect } from 'react';
import type { BankAccount, BankAccountFormValues } from '@/types/bank-account';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/hooks/use-toast';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { createBankAccount, updateBankAccount, getBankOptions, getLocationOptions } from '@/app/actions/bank-account.actions';

const STATUS_OPTIONS = [
  { id: '1', name: 'Active' },
  { id: '0', name: 'Inactive' },
];

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required').max(150, 'Max 150 characters'),
  accountNumber: Yup.string().required('Account number is required').max(100, 'Max 100 characters'),
  bankId: Yup.string().required('Bank is required'),
  locationId: Yup.string().required('Institution is required'),
  status: Yup.number().required('Status is required').oneOf([0, 1], 'Must be Active or Inactive'),
});

const styleClasses = {
  parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'col-span-full sm:col-span-3',
};

type BankAccountFormProps = {
  bankAccount?: BankAccount | null;
};

export default function BankAccountForm({ bankAccount }: BankAccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [bankOptions, setBankOptions] = useState<{ id: string; name: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string; code: string }[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = !!bankAccount?.id;

  useEffect(() => {
    Promise.all([getBankOptions(), getLocationOptions()]).then(([bankRes, locRes]) => {
      if (bankRes.success && bankRes.data) setBankOptions(bankRes.data);
      if (locRes.success && locRes.data) setLocationOptions(locRes.data);
    });
  }, []);

  const initialValues: BankAccountFormValues = {
    name: bankAccount?.name ?? '',
    accountNumber: bankAccount?.accountNumber ?? '',
    bankId: bankAccount?.bankId ?? '',
    locationId: bankAccount?.locationId ?? '',
    status: bankAccount?.status !== undefined && bankAccount?.status !== null ? bankAccount.status : 1,
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={async (values) => {
        setLoading(true);
        try {
          const payload: BankAccountFormValues = {
            name: values.name.trim(),
            accountNumber: values.accountNumber.trim(),
            bankId: values.bankId,
            locationId: values.locationId,
            status: values.status,
          };
          const res = isEdit && bankAccount?.id
            ? await updateBankAccount(bankAccount.id, payload)
            : await createBankAccount(payload);

          if (res.success) {
            toast({
              variant: 'success',
              title: 'Success',
              description: isEdit ? 'Bank account updated.' : 'Bank account created.',
            });
            if (!isEdit && 'data' in res) {
              const data = res.data as { id?: string } | undefined;
              if (data?.id) router.push(`/bank-accounts/${data.id}/edit`);
              else router.refresh();
            } else {
              router.refresh();
            }
            return;
          }

          const err = res as { success: false; error?: { message?: string; issues?: Record<string, string[]> } };
          if (err.error?.issues && typeof err.error.issues === 'object') {
            toast({
              variant: 'destructive',
              title: 'Validation Error',
              description: err.error.message ?? 'Please check the form.',
            });
            return;
          }
          toast({
            variant: 'destructive',
            title: 'Error',
            description: err.error?.message ?? 'Save failed.',
          });
        } catch (e) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: e instanceof Error ? e.message : 'Save failed.',
          });
        } finally {
          setLoading(false);
        }
      }}
    >
      {(formik) => (
        <Form className="w-full space-y-6">
          <div className="grid gap-4 rounded-lg border p-6">
            <h3 className="text-lg font-medium">Bank account details</h3>
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
              id="accountNumber"
              placeholder="Account number"
              value={formik.values.accountNumber}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />
            <CustomSelectField
              id="bankId"
              label="Bank"
              placeholder="Select bank"
              value={formik.values.bankId}
              onChange={(v) => formik.setFieldValue('bankId', v)}
              options={bankOptions}
              required
              styleClasses={styleClasses}
            />
            <CustomSelectField
              id="locationId"
              label="Institution"
              placeholder="Select institution (location)"
              value={formik.values.locationId}
              onChange={(v) => formik.setFieldValue('locationId', v)}
              options={locationOptions.map((l) => ({ id: l.id, name: `${l.name} (${l.code})` }))}
              required
              styleClasses={styleClasses}
            />
            <CustomSelectField
              id="status"
              label="Status"
              placeholder="Select status"
              value={String(formik.values.status)}
              onChange={(v) => formik.setFieldValue('status', v === '' ? 1 : Number(v))}
              options={STATUS_OPTIONS}
              required
              styleClasses={styleClasses}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/bank-accounts')}>
              Cancel
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
