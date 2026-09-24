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
import { Save, BookOpen, ExternalLink, PlusCircle, Ban, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { formatLKR } from '@/lib/format-money';
import {
  createBankAccount,
  updateBankAccount,
  getBankOptions,
  getInstitutionOptions,
  createBankAccountLinkedAccount,
} from '@/app/actions/bank-account.actions';

const STATUS_OPTIONS = [
  { id: '1', name: 'Active' },
  { id: '0', name: 'Inactive' },
];

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required').max(150, 'Max 150 characters'),
  accountNumber: Yup.string().required('Account number is required').max(100, 'Max 100 characters'),
  bankId: Yup.string().required('Bank is required'),
  institution: Yup.string().required('Institution is required'),
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
  const [cancelLoading, setCancelLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [bankOptions, setBankOptions] = useState<{ id: string; name: string }[]>([]);
  const [institutionOptions, setInstitutionOptions] = useState<{ id: string; name: string }[]>([]);
  const saveAndCloseRef = React.useRef(false);
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = !!bankAccount?.id;

  useEffect(() => {
    Promise.all([getBankOptions(), getInstitutionOptions()]).then(([bankRes, institutionRes]) => {
      if (bankRes.success && bankRes.data) setBankOptions(bankRes.data);
      if (institutionRes.success && institutionRes.data) setInstitutionOptions(institutionRes.data);
    });
  }, []);

  const initialValues: BankAccountFormValues = {
    name: bankAccount?.name ?? '',
    accountNumber: bankAccount?.accountNumber ?? '',
    bankId: bankAccount?.bankId ?? '',
    institution: bankAccount?.institution !== undefined ? String(bankAccount.institution) : '',
    status: bankAccount?.status !== undefined && bankAccount?.status !== null ? bankAccount.status : 1,
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={async (values) => {
        const closeAfterSave = saveAndCloseRef.current;
        setLoading(true);
        try {
          const payload: BankAccountFormValues = {
            name: values.name.trim(),
            accountNumber: values.accountNumber.trim(),
            bankId: values.bankId,
            institution: values.institution,
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
            if (closeAfterSave) {
              router.push('/bank-accounts');
              return;
            }
            if (!isEdit && 'data' in res) {
              const data = res.data as { id?: string } | undefined;
              if (data?.id) router.push(`/bank-accounts/${data.id}/edit`);
              else router.push('/bank-accounts');
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
          {isEdit && bankAccount && (
            <div className="grid gap-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-6">
              <h3 className="text-lg font-semibold">Balance</h3>
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>Current cash balance</Label>
                <div className={styleClasses.inputClassName}>
                  <span className="font-medium tabular-nums">
                    {bankAccount.accountId ? formatLKR(Number(bankAccount.balance ?? 0)) : '—'}
                  </span>
                </div>
              </div>
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>Linked account</Label>
                <div className={styleClasses.inputClassName}>
                  {bankAccount.accountId ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">
                        {bankAccount.account?.name ?? bankAccount.account?.code ?? '—'}
                        {bankAccount.account?.code && bankAccount.account?.name ? ` (${bankAccount.account.code})` : ''}
                      </span>
                      <Button size="sm" variant="outline" className="gap-1.5" asChild>
                        <Link href={`/accounting/${bankAccount.accountId}/statement`}>
                          <BookOpen className="h-4 w-4" />
                          Statement
                        </Link>
                      </Button>
                      <Button size="sm" className="gap-1.5" asChild>
                        <Link href={`/accounting/${bankAccount.accountId}/edit`} target="_blank" rel="noopener noreferrer">
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
              {!bankAccount.accountId && (
                <>
                  <p className="text-muted-foreground text-sm">
                    This bank account has no linked GL account. Create and link one now.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={creatingAccount}
                    onClick={async () => {
                      if (!bankAccount.id) return;
                      setCreatingAccount(true);
                      try {
                        const res = await createBankAccountLinkedAccount(bankAccount.id);
                        if (res.success) {
                          toast({ variant: 'success', title: 'Success', description: res.message });
                          router.refresh();
                        } else {
                          toast({ variant: 'destructive', title: 'Error', description: res.message });
                        }
                      } finally {
                        setCreatingAccount(false);
                      }
                    }}
                  >
                    <PlusCircle className="h-4 w-4" />
                    {creatingAccount ? 'Creating…' : 'Create linked account'}
                  </Button>
                </>
              )}
            </div>
          )}
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
              id="institution"
              label="Institution"
              placeholder="Select institution"
              value={formik.values.institution}
              onChange={(v) => formik.setFieldValue('institution', v)}
              options={institutionOptions}
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
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
              type="button"
              onClick={() => {
                setCancelLoading(true);
                router.push('/bank-accounts');
              }}
              disabled={loading || cancelLoading}
            >
              {cancelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              <span>Cancel</span>
            </Button>
            <Button
              disabled={loading || cancelLoading}
              size="sm"
              type="button"
              className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
              onClick={() => {
                saveAndCloseRef.current = false;
                formik.submitForm();
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save</span>
            </Button>
            <Button
              disabled={loading || cancelLoading}
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
