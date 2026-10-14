'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { CheckCircle2, Circle, Save, X } from 'lucide-react';
import {
  Button,
  CustomFormField,
  CustomSelectField,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import {
  createDeductionAction,
  suggestDeductionOrderNoAction,
  updateDeductionAction
} from '@/app/actions/payroll-actions/deduction.actions';
import {
  DEDUCTION_KIND_OPTIONS,
  DEDUCTION_TYPE_OPTIONS,
  EMPTY_DEDUCTION_FORM,
  type DeductionFormValues,
  type DeductionRecord
} from '@/types/payroll';
import {
  PAYSHEET_COMPONENT_INCLUDED_FOR,
  PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS
} from '@/types/paysheet-component';
import type { DeductionFormSheetMode } from './deductions-ui-context';

type SheetDeductionFormProps = {
  open: boolean;
  mode: DeductionFormSheetMode;
  record: DeductionRecord | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Deduction name is required'),
  kind: Yup.string().required('Kind is required'),
  typeId: Yup.string().required('Deduction type is required'),
  orderNo: Yup.string()
    .required('Order no is required')
    .matches(/^-?\d+$/, 'Order no must be a whole number'),
  includedForIds: Yup.array().of(Yup.string())
});

const kindOptions = DEDUCTION_KIND_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const typeOptions = DEDUCTION_TYPE_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

function recordToFormValues(
  record: DeductionRecord | null
): DeductionFormValues {
  if (!record) return EMPTY_DEDUCTION_FORM;
  return {
    code: record.code ?? '',
    name: record.name ?? '',
    kind: record.kind ?? 'custom',
    typeId: record.typeId ?? 'fixed_deduction',
    orderNo: String(record.orderNo ?? 0),
    includedForIds: [...(record.includedForIds ?? [])]
  };
}

function toggleIncluded(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
}

function applyFieldErrors(
  helpers: FormikHelpers<DeductionFormValues>,
  errors: Record<string, unknown>
) {
  if (!errors || typeof errors !== 'object') return;
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'message') continue;
    if (Array.isArray(value) && value[0]) {
      fieldErrors[key] = String(value[0]);
    }
  }
  if (Object.keys(fieldErrors).length) {
    helpers.setErrors(fieldErrors);
  }
}

export default function SheetDeductionForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetDeductionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [suggestedOrder, setSuggestedOrder] = useState('1');

  const initialValues = useMemo(() => {
    if (mode === 'create') {
      return {
        ...EMPTY_DEDUCTION_FORM,
        orderNo: suggestedOrder
      };
    }
    return recordToFormValues(record);
  }, [mode, record, suggestedOrder]);

  useEffect(() => {
    if (!open || mode !== 'create') return;
    let cancelled = false;
    void (async () => {
      const result = await suggestDeductionOrderNoAction('custom');
      if (!cancelled && !result.isError && result.data != null) {
        setSuggestedOrder(String(result.data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, formKey]);

  const title = mode === 'edit' ? 'Edit Deduction' : 'Add Deduction';
  const description =
    'Creates or updates a paysheet component of type Fixed deduction, Loan, or Advance.';

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    values: DeductionFormValues,
    helpers: FormikHelpers<DeductionFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        kind: values.kind as 'system' | 'custom',
        typeId: values.typeId,
        orderNo: Number.parseInt(values.orderNo, 10),
        includedForIds: values.includedForIds.filter((id) =>
          (PAYSHEET_COMPONENT_INCLUDED_FOR as readonly string[]).includes(id)
        )
      };

      const result =
        mode === 'edit' && record
          ? await updateDeductionAction(record.id, payload)
          : await createDeductionAction(payload);

      if (result.isError || !result.data) {
        const errors = result.errors as Record<string, unknown>;
        applyFieldErrors(helpers, errors);
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description:
            (typeof errors?.message === 'string' && errors.message) ||
            (typeof (errors as any)?.name?.[0] === 'string' &&
              (errors as any).name[0]) ||
            (typeof (errors as any)?.orderNo?.[0] === 'string' &&
              (errors as any).orderNo[0]) ||
            'Unable to save deduction.'
        });
        return;
      }

      toast({
        title: mode === 'edit' ? 'Deduction updated' : 'Deduction created',
        description: `${result.data.code} — ${result.data.name}`
      });
      handleClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <Formik
          key={`${mode}-${record?.id ?? 'new'}-${formKey}-${suggestedOrder}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="code"
                    type="text"
                    placeholder="Code (Auto Generated)"
                    value={formik.values.code}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Deduction Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="kind"
                    placeholder="Kind"
                    value={formik.values.kind}
                    onChange={(value) => {
                      void formik.setFieldValue('kind', value);
                      if (mode === 'create') {
                        void suggestDeductionOrderNoAction(value).then(
                          (res) => {
                            if (!res.isError && res.data != null) {
                              void formik.setFieldValue(
                                'orderNo',
                                String(res.data)
                              );
                            }
                          }
                        );
                      }
                    }}
                    required
                    disabled={mode === 'edit'}
                    options={kindOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="typeId"
                    placeholder="Deduction Type"
                    value={formik.values.typeId}
                    onChange={(value) =>
                      void formik.setFieldValue('typeId', value)
                    }
                    required
                    options={typeOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="orderNo"
                    type="text"
                    placeholder="Order No"
                    value={formik.values.orderNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Included For
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PAYSHEET_COMPONENT_INCLUDED_FOR.map((id) => {
                      const checked =
                        formik.values.includedForIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={cn(
                            'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                            checked
                              ? 'border-primary/40 bg-primary/5 text-foreground'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                          )}
                          onClick={() =>
                            void formik.setFieldValue(
                              'includedForIds',
                              toggleIncluded(
                                formik.values.includedForIds,
                                id
                              )
                            )
                          }
                        >
                          {checked ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0" />
                          )}
                          <span>
                            {PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS[id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Amounts for fixed deductions, loans, and advances are set when
                  assigning the component or in Loans &amp; Advances. This
                  screen manages the shared paysheet component definition.
                </div>

                {mode === 'edit' ? (
                  <div className="grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      Created by:{' '}
                      <span className="text-foreground">
                        {record?.createdBy
                          ? `${record.createdBy}${
                              record.createdAt
                                ? ` — ${formatDateTime(record.createdAt)}`
                                : ''
                            }`
                          : '—'}
                      </span>
                    </p>
                    <p>
                      Last updated:{' '}
                      <span className="text-foreground">
                        {record?.updatedBy
                          ? `${record.updatedBy}${
                              record.updatedAt
                                ? ` — ${formatDateTime(record.updatedAt)}`
                                : ''
                            }`
                          : '—'}
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                  disabled={saving}
                  onClick={() => {
                    formik.resetForm({ values: EMPTY_DEDUCTION_FORM });
                    setFormKey((key) => key + 1);
                    handleClose();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 gap-1.5"
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
