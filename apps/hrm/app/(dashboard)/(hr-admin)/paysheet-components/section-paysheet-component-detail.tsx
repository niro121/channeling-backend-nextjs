'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { CheckCircle2, Circle, SaveIcon, Trash2, X } from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  emptyPaysheetComponentFormValues,
  PAYSHEET_COMPONENT_INCLUDED_FOR,
  PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS,
  paysheetComponentTypeOptions,
  type PaysheetComponentFormValues
} from '@/types/paysheet-component';
import {
  createPaysheetComponentAction,
  deletePaysheetComponentAction,
  updatePaysheetComponentAction
} from '@/app/actions/hr-admin-actions/paysheet-component.actions';
import { paysheetComponentRecordToFormValues } from '@/lib/mappers/paysheet-component-form.mapper';
import { usePaysheetComponentUi } from './paysheet-component-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const typeOptions = paysheetComponentTypeOptions();

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  typeId: Yup.string().required('Component type is required'),
  orderNo: Yup.string()
    .required('Order no is required')
    .matches(/^-?\d+$/, 'Order no must be a whole number'),
  percentage: Yup.string().when('typeId', {
    is: 'percentage_allowance',
    then: (schema) =>
      schema
        .required('Percentage is required')
        .test('pct', 'Enter a valid percentage (0–100)', (value) => {
          if (value == null || value === '') return false;
          const n = Number(value);
          return Number.isFinite(n) && n >= 0 && n <= 100;
        }),
    otherwise: (schema) => schema.notRequired()
  }),
  includedForIds: Yup.array().of(Yup.string())
});

function formatAuditLine(
  name?: string,
  role?: string,
  at?: string | null
): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = role ? `${name} (${role})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

function toggleIncluded(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
}

function applyFieldErrors(
  helpers: FormikHelpers<PaysheetComponentFormValues>,
  errors: Record<string, unknown>
) {
  if (!errors || typeof errors !== 'object' || 'message' in errors) return;
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value) && value[0]) {
      fieldErrors[key] = String(value[0]);
    }
  }
  if (Object.keys(fieldErrors).length) {
    helpers.setErrors(fieldErrors);
  }
}

export default function SectionPaysheetComponentDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const {
    records,
    activeKind,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    detailFormHighlight
  } = usePaysheetComponentUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const kindRecords = useMemo(
    () => records.filter((record) => record.kind === activeKind),
    [records, activeKind]
  );

  const formKey = isNew
    ? `new-${activeKind}`
    : (selectedId ?? `empty-${activeKind}`);

  const initialValues = useMemo<PaysheetComponentFormValues>(() => {
    if (isNew || !selectedRecord) return emptyPaysheetComponentFormValues();
    return paysheetComponentRecordToFormValues(selectedRecord);
  }, [isNew, selectedRecord]);

  useEffect(() => {
    if (!detailFormHighlight) return;
    const timer = window.setTimeout(() => {
      document.getElementById('name')?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [detailFormHighlight, formKey]);

  const showEmptyState = !isNew && !selectedRecord;

  const handleSave = async (
    values: PaysheetComponentFormValues,
    helpers: FormikHelpers<PaysheetComponentFormValues>
  ) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        kind: activeKind,
        typeId: values.typeId,
        orderNo: Number.parseInt(values.orderNo, 10),
        percentage:
          values.typeId === 'percentage_allowance'
            ? Number(values.percentage)
            : null,
        includedForIds: values.includedForIds.filter((id) =>
          (PAYSHEET_COMPONENT_INCLUDED_FOR as readonly string[]).includes(id)
        )
      };

      const result =
        isNew || !selectedRecord
          ? await createPaysheetComponentAction(payload)
          : await updatePaysheetComponentAction(selectedRecord.id, payload);

      if (result.isError || !result.data) {
        const errors = result.errors as Record<string, unknown>;
        applyFieldErrors(helpers, errors);
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description:
            (typeof (errors as any)?.message === 'string' &&
              (errors as any).message) ||
            (typeof (errors as any)?.name?.[0] === 'string' &&
              (errors as any).name[0]) ||
            (typeof (errors as any)?.orderNo?.[0] === 'string' &&
              (errors as any).orderNo[0]) ||
            (typeof (errors as any)?.percentage?.[0] === 'string' &&
              (errors as any).percentage[0]) ||
            'Unable to save component.'
        });
        return;
      }

      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        title: 'Saved',
        description:
          isNew || !selectedRecord
            ? 'Paysheet component created.'
            : 'Paysheet component updated.'
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const result = await deletePaysheetComponentAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete component.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({ title: 'Deleted', description: 'Paysheet component removed.' });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="paysheet-component-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          Component Detail
        </h2>
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a component from the list or click Add to create one.
        </div>
      ) : (
        <Formik
          key={formKey}
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {(formik) => {
            const showPercentage =
              formik.values.typeId === 'percentage_allowance';

            return (
              <Form
                id="paysheet-component-form"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomFormField
                      id="code"
                      type="text"
                      placeholder="Auto-generated"
                      value={formik.values.code || 'Auto'}
                      onChange={() => undefined}
                      onBlur={() => undefined}
                      disabled
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomFormField
                      id="orderNo"
                      type="number"
                      placeholder="Order No"
                      value={formik.values.orderNo}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomSelectField
                      id="typeId"
                      placeholder="Select Component Type"
                      value={formik.values.typeId}
                      onChange={(value) => {
                        formik.setFieldValue('typeId', value);
                        if (value !== 'percentage_allowance') {
                          formik.setFieldValue('percentage', '');
                        }
                      }}
                      required
                      options={typeOptions}
                      styleClasses={fieldStyleClasses}
                    />

                    {showPercentage ? (
                      <CustomFormField
                        id="percentage"
                        type="number"
                        placeholder="Percentage (%)"
                        value={formik.values.percentage}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                    ) : (
                      <div className="hidden md:block" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Included for
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PAYSHEET_COMPONENT_INCLUDED_FOR.map((id) => {
                        const selected =
                          formik.values.includedForIds.includes(id);
                        const isWide = id === 'allowances_ph_day_off';
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              formik.setFieldValue(
                                'includedForIds',
                                toggleIncluded(formik.values.includedForIds, id)
                              )
                            }
                            className={cn(
                              'flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors',
                              isWide && 'sm:col-span-2',
                              selected
                                ? 'border-primary/40 bg-primary/10'
                                : 'border-primary/15 bg-background hover:border-primary/25 hover:bg-muted/40'
                            )}
                          >
                            {selected ? (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="text-sm text-foreground">
                              {PAYSHEET_COMPONENT_INCLUDED_FOR_LABELS[id]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">
                        Created by:
                      </span>
                      <span className="text-muted-foreground">
                        {selectedRecord && !isNew
                          ? formatAuditLine(
                              selectedRecord.createdByUser.name,
                              selectedRecord.createdByUser.role,
                              selectedRecord.createdAt
                            )
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-foreground">
                        Last updated:
                      </span>
                      <span className="text-muted-foreground">
                        {selectedRecord && !isNew
                          ? formatAuditLine(
                              selectedRecord.updatedByUser.name,
                              selectedRecord.updatedByUser.role,
                              selectedRecord.updatedAt
                            )
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-primary/10 px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                    disabled={saving}
                    onClick={() => {
                      if (isNew) {
                        setIsNew(false);
                        setSelectedId(kindRecords[0]?.id ?? null);
                        return;
                      }
                      formik.resetForm();
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    disabled={!selectedRecord || isNew || saving}
                    className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    type="submit"
                    form="paysheet-component-form"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={saving}
                  >
                    <SaveIcon className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </Form>
            );
          }}
        </Formik>
      )}

      <CustomAlertDialog
        open={deleteOpen}
        title="Delete component?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" from the paysheet component master? This cannot be undone.`
            : 'Remove this component?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
      />
    </div>
  );
}
