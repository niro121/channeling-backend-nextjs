'use client';

import React, { useMemo, useState } from 'react';
import { Form, Formik, FormikHelpers, FieldArray } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/hooks/use-toast';
import { BackButton } from '@/components/common/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelector } from '@/components/common/searchable-selector';
import { createJournalEntryAction } from '@/app/actions/accounting.actions';
import { Plus, Save, Trash2 } from 'lucide-react';

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CASH: 'Cash',
  PAYABLE: 'Payable',
  RECEIVABLE: 'Receivable',
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

/** Till buckets stored on JournalLine.paymentMethod. Same codes as receipts. */
const TILL_LINE_PAYMENT_OPTIONS = [
  { value: 0, label: 'Cash' },
  { value: 1, label: 'Card' },
  { value: 2, label: 'Slip' },
  { value: 3, label: 'Cheque' },
  { value: 6, label: 'E-Wallet' },
] as const;

const TILL_LINE_PAYMENT_VALUES = new Set<number>(
  TILL_LINE_PAYMENT_OPTIONS.map((option) => option.value)
);

function accountOptionLabel(account: JournalEntryFormAccount): string {
  const title = account.code ? `${account.code} – ${account.name}` : account.name;
  const type = ACCOUNT_TYPE_LABEL[account.type] ?? account.type;
  return `${title} (${type})`;
}

export type JournalEntryFormAccount = {
  id: string;
  name: string;
  code: string | null;
  type: string;
};

export type JournalEntryFormLocation = {
  id: string;
  name: string;
};

type JournalEntryLine = {
  accountId: string;
  debitLKR: number;
  creditLKR: number;
  /** Set only for CASH accounts: 0 cash, 1 card, 2 slip, 3 cheque, 6 e-wallet. */
  paymentMethod: number | null;
};

export type JournalEntryFormValues = {
  date: string;
  description: string;
  locationId: string;
  lines: JournalEntryLine[];
};

const initialLine: JournalEntryLine = {
  accountId: '',
  debitLKR: 0,
  creditLKR: 0,
  paymentMethod: null,
};

function buildValidationSchema(accounts: JournalEntryFormAccount[]) {
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const lineValidation = Yup.object({
    accountId: Yup.string().required('Account is required'),
    debitLKR: Yup.number().min(0, 'Debit must be ≥ 0').default(0),
    creditLKR: Yup.number().min(0, 'Credit must be ≥ 0').default(0),
    paymentMethod: Yup.number().nullable(),
  })
    .test(
      'debit-or-credit',
      'Each line must have either debit or credit (not both)',
      (obj) => {
        if (!obj) return false;
        const d = Number(obj.debitLKR) || 0;
        const c = Number(obj.creditLKR) || 0;
        return (d > 0 && c === 0) || (c > 0 && d === 0);
      }
    )
    .test('cash-payment-type', function (obj) {
      if (!obj?.accountId) return true;
      const account = accountById.get(obj.accountId);
      if (account?.type !== 'CASH') return true;
      if (
        obj.paymentMethod != null &&
        TILL_LINE_PAYMENT_VALUES.has(Number(obj.paymentMethod))
      ) {
        return true;
      }
      return this.createError({
        path: `${this.path}.paymentMethod`,
        message: 'Choose a type',
      });
    });

  return Yup.object({
    date: Yup.string().required('Date is required'),
    description: Yup.string().trim().required('Description is required'),
    locationId: Yup.string().nullable(),
    lines: Yup.array()
      .of(lineValidation)
      .min(2, 'At least two lines are required')
      .test(
        'balanced',
        'Total debits must equal total credits',
        (lines) => {
          if (!lines || lines.length < 2) return false;
          const totalDebit = lines.reduce((s, l) => s + (Number(l?.debitLKR) || 0), 0);
          const totalCredit = lines.reduce((s, l) => s + (Number(l?.creditLKR) || 0), 0);
          return Math.abs(totalDebit - totalCredit) < 0.01;
        }
      ),
  });
}

type JournalEntryFormProps = {
  accounts: JournalEntryFormAccount[];
  locations: JournalEntryFormLocation[];
};

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function JournalEntryForm({
  accounts,
  locations,
}: JournalEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const accountOptions = useMemo(
    () => accounts.map((account) => ({ id: account.id, name: accountOptionLabel(account) })),
    [accounts]
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const validationSchema = useMemo(() => buildValidationSchema(accounts), [accounts]);

  const initialValues: JournalEntryFormValues = {
    date: todayISO(),
    description: '',
    locationId: '',
    lines: [{ ...initialLine }, { ...initialLine }],
  };

  const handleSubmit = async (
    values: JournalEntryFormValues,
    { setErrors, setTouched }: FormikHelpers<JournalEntryFormValues>
  ) => {
    setLoading(true);
    try {
      const payload = {
        date: values.date,
        description: values.description.trim(),
        locationId: values.locationId?.trim() || null,
        lines: values.lines.map((l) => {
          const isCashAccount = accountById.get(l.accountId)?.type === 'CASH';
          return {
            accountId: l.accountId,
            debitLKR: Number(l.debitLKR) || 0,
            creditLKR: Number(l.creditLKR) || 0,
            paymentMethod: isCashAccount ? l.paymentMethod : null,
          };
        }),
      };

      const respond = await createJournalEntryAction(payload);

      if (respond.success) {
        toast({ title: respond.message ?? 'Journal entry created' });
        router.push('/accounting');
        router.refresh();
        return;
      }

      if (respond.issues && typeof respond.issues === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.entries(respond.issues).forEach(([key, messages]) => {
          const arr = Array.isArray(messages) ? messages : [messages];
          if (arr.length > 0 && arr[0]) fieldErrors[key] = String(arr[0]);
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors as Parameters<typeof setErrors>[0]);
          setTouched(
            Object.keys(fieldErrors).reduce(
              (acc, k) => ({ ...acc, [k]: true }),
              {} as Record<string, boolean>
            )
          );
        }
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description: respond.error ?? 'Failed to create journal entry',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add journal entry</h2>
        <BackButton href="/accounting" />
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue, errors, touched }) => (
          <Form className="space-y-6 max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={values.date}
                  onChange={(e) => setFieldValue('date', e.target.value)}
                  className="w-full"
                />
                {touched.date && errors.date && (
                  <p className="text-sm text-destructive">{errors.date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location (optional)</Label>
                <Select
                  value={values.locationId || '__none__'}
                  onValueChange={(v) =>
                    setFieldValue('locationId', v === '__none__' ? '' : v)
                  }
                >
                  <SelectTrigger id="locationId">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                name="description"
                value={values.description}
                onChange={(e) => setFieldValue('description', e.target.value)}
                placeholder="e.g. Opening balance for branch cash"
                className="w-full"
              />
              {touched.description && errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

              <div className="space-y-2">
              <div className="space-y-1">
                <Label>Lines (debits must equal credits) *</Label>
                <p className="text-xs text-muted-foreground">
                  Cash and till accounts can be tagged Cash, Card, Slip, Cheque, or E-Wallet so the amount is added to that type. Other accounts are not split by type.
                </p>
              </div>
              {typeof errors.lines === 'string' && (
                <p className="text-sm text-destructive">{errors.lines}</p>
              )}

              <FieldArray name="lines">
                {({ push, remove }) => (
                  <>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-2 text-left font-medium">Account</th>
                            <th className="p-2 text-left font-medium w-36">Type</th>
                            <th className="p-2 text-right font-medium w-32">Debit (LKR)</th>
                            <th className="p-2 text-right font-medium w-32">Credit (LKR)</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {values.lines.map((_, index) => (
                            <tr key={index} className="border-b last:border-0">
                              <td className="p-2">
                                <SearchableSelector
                                  label="account"
                                  placeholder="Select account"
                                  options={accountOptions}
                                  value={values.lines[index].accountId}
                                  onChange={(accountId) => {
                                    setFieldValue(`lines.${index}.accountId`, accountId);
                                    const selected = accountById.get(accountId);
                                    if (selected?.type === 'CASH') {
                                      if (values.lines[index].paymentMethod == null) {
                                        setFieldValue(`lines.${index}.paymentMethod`, 0);
                                      }
                                    } else {
                                      setFieldValue(`lines.${index}.paymentMethod`, null);
                                    }
                                  }}
                                  className="h-9 w-full font-normal"
                                  popoverClassName="min-w-[28rem]"
                                />
                                {touched.lines?.[index] &&
                                  (errors.lines as { [i: number]: { accountId?: string } })?.[index]?.accountId && (
                                    <p className="text-xs text-destructive mt-0.5">
                                      {(errors.lines as { [i: number]: { accountId?: string } })[index].accountId}
                                    </p>
                                  )}
                              </td>
                              <td className="p-2">
                                {accountById.get(values.lines[index].accountId)?.type === 'CASH' ? (
                                  <Select
                                    value={String(values.lines[index].paymentMethod ?? 0)}
                                    onValueChange={(value) =>
                                      setFieldValue(`lines.${index}.paymentMethod`, Number(value))
                                    }
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TILL_LINE_PAYMENT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={String(option.value)}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="px-2 text-sm text-muted-foreground">—</span>
                                )}
                                {touched.lines?.[index] &&
                                  (errors.lines as { [i: number]: { paymentMethod?: string } })?.[index]?.paymentMethod && (
                                    <p className="text-xs text-destructive mt-0.5">
                                      {(errors.lines as { [i: number]: { paymentMethod?: string } })[index].paymentMethod}
                                    </p>
                                  )}
                              </td>
                              <td className="p-2 text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="h-9 text-right w-28"
                                  value={
                                    values.lines[index].debitLKR === 0
                                      ? ''
                                      : values.lines[index].debitLKR
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const num = v === '' ? 0 : parseFloat(v) || 0;
                                    setFieldValue(`lines.${index}.debitLKR`, num);
                                    if (num > 0) setFieldValue(`lines.${index}.creditLKR`, 0);
                                  }}
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-2 text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="h-9 text-right w-28"
                                  value={
                                    values.lines[index].creditLKR === 0
                                      ? ''
                                      : values.lines[index].creditLKR
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const num = v === '' ? 0 : parseFloat(v) || 0;
                                    setFieldValue(`lines.${index}.creditLKR`, num);
                                    if (num > 0) setFieldValue(`lines.${index}.debitLKR`, 0);
                                  }}
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-1">
                                {values.lines.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => push({ ...initialLine })}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add line
                      </Button>
                    </div>
                  </>
                )}
              </FieldArray>
            </div>

            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Create journal entry'}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
