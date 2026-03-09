'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { createAccount, updateAccount } from '@/app/actions/accounting.actions';
import type { CreateAccountInput, UpdateAccountInput, AccountType, Account } from '@/types/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomFormField from '@/components/common/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Ban, Save } from 'lucide-react';

/** Format cents to currency units with exactly two decimals, no thousands separator. */
function balanceLimitToDisplay(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

type AccountFormValues = {
  name: string;
  code: string;
  minBalanceDisplay: string;
  maxBalanceDisplay: string;
  type: AccountType;
  parentAccountId: string;
  locationId: string;
  doctorId: string;
  agencyId: string;
  creditCustomerId: string;
};

const accountFormSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .max(200, 'Name must be at most 200 characters')
    .trim(),
  code: Yup.string().max(50, 'Code must be at most 50 characters').trim(),
  minBalanceDisplay: Yup.string()
    .trim()
    .test('valid-number', 'Enter a valid number', (val) => {
      if (!val || val === '') return true;
      const n = Number(val.replace(/,/g, ''));
      return Number.isFinite(n);
    }),
  maxBalanceDisplay: Yup.string()
    .trim()
    .test('valid-number', 'Enter a valid number', (val) => {
      if (!val || val === '') return true;
      const n = Number(val.replace(/,/g, ''));
      return Number.isFinite(n);
    }),
});

type AccountFormProps = {
  account?: Account | null;
  types: { value: AccountType; label: string }[];
  locations: { id: string; name: string }[];
  doctors: { id: string; name: string; code: string }[];
  agencies: { id: string; name: string; code: string | null }[];
  creditCustomers?: { id: string; name: string; code: string | null }[];
  cashAccounts: { id: string; name: string; code: string | null }[];
};

const styleClasses = {
  parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'col-span-full sm:col-span-3',
};

export default function AccountForm({
  account,
  types,
  locations,
  doctors,
  agencies,
  creditCustomers = [],
  cashAccounts,
}: AccountFormProps) {
  const isEdit = !!account?.id;
  const [loading, setLoading] = useState(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const initialValues: AccountFormValues = {
    name: account?.name ?? '',
    code: account?.code ?? '',
    minBalanceDisplay: balanceLimitToDisplay(account?.minBalanceAllowed ?? null),
    maxBalanceDisplay: balanceLimitToDisplay(account?.maxBalanceAllowed ?? null),
    type: (account?.type ?? 'CASH') as AccountType,
    parentAccountId: account?.parentAccountId ?? '__none__',
    locationId: account?.locationId ?? '__none__',
    doctorId: account?.doctorId ?? '__none__',
    agencyId: account?.agencyId ?? '__none__',
    creditCustomerId: account?.creditCustomerId ?? '__none__',
  };

  async function handleSubmit(
    values: AccountFormValues,
    { setErrors, setTouched }: FormikHelpers<AccountFormValues>
  ) {
    const closeAfterSave = saveAndCloseRef.current;
    const name = values.name.trim();
    const code = values.code.trim() || null;
    const minVal = values.minBalanceDisplay.trim();
    let minBalanceAllowed: number | null = null;
    if (minVal !== '') {
      const num = Number(minVal.replace(/,/g, ''));
      if (Number.isFinite(num)) minBalanceAllowed = Math.round(num * 100);
    }
    const maxVal = values.maxBalanceDisplay.trim();
    let maxBalanceAllowed: number | null = null;
    if (maxVal !== '') {
      const num = Number(maxVal.replace(/,/g, ''));
      if (Number.isFinite(num)) maxBalanceAllowed = Math.round(num * 100);
    }

    setLoading(true);
    try {
      if (isEdit && account?.id) {
        const payload: UpdateAccountInput = {
          name,
          code,
          minBalanceAllowed,
          maxBalanceAllowed,
        };
        if (values.type === 'CASH') {
          payload.parentAccountId = values.parentAccountId === '__none__' ? null : values.parentAccountId;
          payload.locationId = values.locationId === '__none__' ? null : values.locationId;
        } else if (values.type === 'PAYABLE' || values.type === 'RECEIVABLE') {
          payload.doctorId = values.doctorId === '__none__' ? null : values.doctorId;
          payload.agencyId = values.agencyId === '__none__' ? null : values.agencyId;
          payload.creditCustomerId = values.creditCustomerId === '__none__' ? null : values.creditCustomerId;
        }
        const result = await updateAccount(account.id, payload);
        if (result.success) {
          toast({
            variant: 'success',
            title: 'Success',
            description: result.message ?? 'Account was updated successfully',
          });
          if (closeAfterSave) router.push('/accounting');
          else router.refresh();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error ?? 'Account update unsuccessful.',
          });
        }
      } else {
        const payload: CreateAccountInput = {
          name,
          type: values.type,
          code,
          minBalanceAllowed,
          maxBalanceAllowed,
        };
        if (values.type === 'CASH') {
          if (values.parentAccountId !== '__none__') payload.parentAccountId = values.parentAccountId;
          if (values.locationId !== '__none__') payload.locationId = values.locationId;
        } else if (values.type === 'PAYABLE' || values.type === 'RECEIVABLE') {
          if (values.doctorId !== '__none__') payload.doctorId = values.doctorId;
          if (values.agencyId !== '__none__') payload.agencyId = values.agencyId;
          if (values.creditCustomerId !== '__none__') payload.creditCustomerId = values.creditCustomerId;
        }
        const result = await createAccount(payload);
        if (result.success) {
          toast({
            variant: 'success',
            title: 'Success',
            description: result.message ?? 'Account was created successfully',
          });
          if (closeAfterSave) router.push('/accounting');
          else if (result.data?.id) router.push(`/accounting/${result.data.id}/edit`);
          else router.push('/accounting');
          router.refresh();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error ?? 'Account creation unsuccessful.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={accountFormSchema}
      onSubmit={handleSubmit}
      enableReinitialize={!!account}
    >
      {(formik) => {
        const validateAndSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
          if (e) e.preventDefault();
          formik.validateForm().then((errors) => {
            const keys = Object.keys(errors);
            if (keys.length > 0) {
              formik.setTouched(
                keys.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>)
              );
              const firstMsg = Object.values(errors)[0];
              toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: typeof firstMsg === 'string' ? firstMsg : 'Please check the form.',
              });
            } else {
              formik.submitForm();
            }
          });
        };
        return (
        <Form className="w-full space-y-6" onSubmit={validateAndSubmit}>
          <div className="grid gap-4 rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Account details</h3>
            <p className="text-sm text-muted-foreground">Type, name, code and minimum balance.</p>

            <div className={styleClasses.parentDiv}>
              <Label htmlFor="type" className={styleClasses.labelClassName}>Type</Label>
              <div className={styleClasses.inputClassName}>
                <Select
                value={formik.values.type}
                onValueChange={(v) => formik.setFieldValue('type', v as AccountType)}
                name="type"
                disabled={isEdit}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                {isEdit && (
                  <p className="text-xs text-muted-foreground mt-1">Type cannot be changed after creation.</p>
                )}
              </div>
            </div>

            <CustomFormField
              type="text"
              id="name"
              placeholder="Account name *"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              styleClasses={styleClasses}
            />

            <CustomFormField
              type="text"
              id="code"
              placeholder="Code (optional) e.g. CB-001"
              value={formik.values.code}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required={false}
              styleClasses={styleClasses}
            />

            <div className={styleClasses.parentDiv}>
              <Label htmlFor="minBalanceDisplay" className={styleClasses.labelClassName}>
                Minimum balance allowed (optional, in currency units)
              </Label>
              <div className={styleClasses.inputClassName}>
                <Input
                  id="minBalanceDisplay"
                  name="minBalanceDisplay"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 0.00 = no negative; -50.00 = allowed to -50"
                  value={formik.values.minBalanceDisplay}
                  onChange={(e) => formik.setFieldValue('minBalanceDisplay', e.target.value)}
                  onBlur={() => {
                    formik.handleBlur({ target: { name: 'minBalanceDisplay' } } as any);
                    const n = Number(formik.values.minBalanceDisplay.trim().replace(/,/g, ''));
                    if (formik.values.minBalanceDisplay.trim() !== '' && Number.isFinite(n)) {
                      formik.setFieldValue('minBalanceDisplay', n.toFixed(2));
                    }
                  }}
                />
                {formik.touched.minBalanceDisplay && formik.errors.minBalanceDisplay && (
                  <div className="text-red-600 text-sm pt-1">{formik.errors.minBalanceDisplay}</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground col-span-full">
                Leave empty for no limit. 0.00 = cannot go negative. Negative = allowed down to that value.
              </p>
            </div>

            <div className={styleClasses.parentDiv}>
              <Label htmlFor="maxBalanceDisplay" className={styleClasses.labelClassName}>
                Maximum balance allowed (optional, in currency units)
              </Label>
              <div className={styleClasses.inputClassName}>
                <Input
                  id="maxBalanceDisplay"
                  name="maxBalanceDisplay"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 50000.00 = cap at 50,000 (for RECEIVABLE = credit limit)"
                  value={formik.values.maxBalanceDisplay}
                  onChange={(e) => formik.setFieldValue('maxBalanceDisplay', e.target.value)}
                  onBlur={() => {
                    formik.handleBlur({ target: { name: 'maxBalanceDisplay' } } as any);
                    const n = Number(formik.values.maxBalanceDisplay.trim().replace(/,/g, ''));
                    if (formik.values.maxBalanceDisplay.trim() !== '' && Number.isFinite(n)) {
                      formik.setFieldValue('maxBalanceDisplay', n.toFixed(2));
                    }
                  }}
                />
                {formik.touched.maxBalanceDisplay && formik.errors.maxBalanceDisplay && (
                  <div className="text-red-600 text-sm pt-1">{formik.errors.maxBalanceDisplay}</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground col-span-full">
                For RECEIVABLE (agency/credit customer): hard cap on how much they can owe. Leave empty for no cap.
              </p>
            </div>

            <Separator className="my-6" />

            {formik.values.type === 'CASH' && (
              <>
                <h4 className="text-base font-semibold">Cash account options</h4>
                <p className="text-sm text-muted-foreground">Parent cash book and location (branch) for this till.</p>
                <div className={styleClasses.parentDiv}>
                  <Label htmlFor="parentAccountId" className={styleClasses.labelClassName}>Parent Cash Book (for branch)</Label>
                  <div className={styleClasses.inputClassName}>
                    <Select
                      value={formik.values.parentAccountId}
                      onValueChange={(v) => formik.setFieldValue('parentAccountId', v)}
                    >
                      <SelectTrigger id="parentAccountId">
                        <SelectValue placeholder="Select parent (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None (main Cash Book)</SelectItem>
                        {cashAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code ?? a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className={styleClasses.parentDiv}>
                  <Label htmlFor="locationId" className={styleClasses.labelClassName}>Location (branch)</Label>
                  <div className={styleClasses.inputClassName}>
                    <Select
                      value={formik.values.locationId}
                      onValueChange={(v) => formik.setFieldValue('locationId', v)}
                    >
                      <SelectTrigger id="locationId">
                        <SelectValue placeholder="Select location (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {(formik.values.type === 'PAYABLE' || formik.values.type === 'RECEIVABLE') && (
              <>
                <h4 className="text-base font-semibold">
                  {formik.values.type === 'PAYABLE' ? 'Payable' : 'Receivable'} — link to entity
                </h4>
                <p className="text-sm text-muted-foreground">
                  Optionally link this account to a doctor, agency or credit customer.
                </p>
                <div className={styleClasses.parentDiv}>
                  <Label htmlFor="doctorId" className={styleClasses.labelClassName}>Doctor</Label>
                  <div className={styleClasses.inputClassName}>
                    <Select
                      value={formik.values.doctorId}
                      onValueChange={(v) => formik.setFieldValue('doctorId', v)}
                    >
                      <SelectTrigger id="doctorId">
                        <SelectValue placeholder="Select doctor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {doctors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className={styleClasses.parentDiv}>
                  <Label htmlFor="agencyId" className={styleClasses.labelClassName}>Agency</Label>
                  <div className={styleClasses.inputClassName}>
                    <Select
                      value={formik.values.agencyId}
                      onValueChange={(v) => formik.setFieldValue('agencyId', v)}
                    >
                      <SelectTrigger id="agencyId">
                        <SelectValue placeholder="Select agency (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {agencies.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.code ?? '-'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formik.values.type === 'RECEIVABLE' && creditCustomers.length > 0 && (
                  <div className={styleClasses.parentDiv}>
                    <Label htmlFor="creditCustomerId" className={styleClasses.labelClassName}>Credit customer</Label>
                    <div className={styleClasses.inputClassName}>
                      <Select
                        value={formik.values.creditCustomerId}
                        onValueChange={(v) => formik.setFieldValue('creditCustomerId', v)}
                      >
                        <SelectTrigger id="creditCustomerId">
                          <SelectValue placeholder="Select credit customer (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {creditCustomers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.code ?? '-'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
          type="button"
          onClick={() => router.push('/accounting')}
          disabled={loading}
        >
          <Ban className="h-4 w-4" />
          <span>Cancel</span>
        </Button>
        <Button
          disabled={loading}
          size="sm"
          type="submit"
          className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
          onClick={() => { saveAndCloseRef.current = false; }}
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
            validateAndSubmit();
          }}
        >
          <Save className="h-4 w-4" />
          <span>Save and Close</span>
        </Button>
      </div>
        </Form>
        );
      }}
    </Formik>
  );
}
