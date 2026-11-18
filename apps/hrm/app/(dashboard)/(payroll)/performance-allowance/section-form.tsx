'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Save, UsersRound, X } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  CustomDatePickerField,
  CustomFormField,
  Label,
  useToast
} from '@archmage/ui';
import {
  createPerformanceAllowanceAction,
  updatePerformanceAllowanceAction
} from '@/app/actions/payroll-actions/performance-allowance.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { formatDateTime } from '@/lib/utils/date';
import {
  EMPTY_PERFORMANCE_ALLOWANCE_FORM,
  type PerformanceAllowanceFormValues,
  type PerformanceAllowanceMode,
  type PerformanceAllowanceRecord,
  type PaysheetStaffOption
} from '@/types/payroll';
import { usePerformanceAllowanceUi } from './performance-allowance-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

type SectionFormProps = {
  mode: PerformanceAllowanceMode;
  staffOptions?: PaysheetStaffOption[];
};

function recordToFormValues(
  record: PerformanceAllowanceRecord | null
): PerformanceAllowanceFormValues {
  if (!record) return EMPTY_PERFORMANCE_ALLOWANCE_FORM;
  return {
    staffId: record.staffId,
    value: String(record.value ?? ''),
    effectiveFrom: record.effectiveFrom
      ? new Date(record.effectiveFrom)
      : null,
    effectiveTo: record.effectiveTo ? new Date(record.effectiveTo) : null
  };
}

function applyFieldErrors(
  helpers: FormikHelpers<PerformanceAllowanceFormValues>,
  errors: Record<string, unknown>
) {
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'message') continue;
    if (Array.isArray(value) && typeof value[0] === 'string') {
      fieldErrors[key] = value[0];
    } else if (typeof value === 'string') {
      fieldErrors[key] = value;
    }
  }
  if (Object.keys(fieldErrors).length) {
    helpers.setErrors(fieldErrors);
  }
}

export default function SectionForm({
  mode,
  staffOptions = []
}: SectionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { editingRecord, clearEdit } = usePerformanceAllowanceUi();
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const isEditing = editingRecord != null && editingRecord.mode === mode;
  const canSave = isEditing ? has('payroll', 'edit') : has('payroll', 'add');

  const initialValues = useMemo(
    () => recordToFormValues(isEditing ? editingRecord : null),
    [editingRecord, isEditing]
  );

  useEffect(() => {
    setFormKey((key) => key + 1);
  }, [mode, editingRecord?.id]);

  const validationSchema = Yup.object({
    staffId: Yup.string().required('Employee is required'),
    value: Yup.string()
      .required(mode === 'percentage' ? 'Percentage is required' : 'Value is required')
      .test('numeric', 'Enter a valid number', (v) => {
        if (!v?.trim()) return false;
        const n = Number(v);
        return !Number.isNaN(n) && n >= 0;
      })
      .test('pct-max', 'Percentage cannot exceed 100', (v) => {
        if (mode !== 'percentage') return true;
        return Number(v) <= 100;
      }),
    effectiveFrom: Yup.date()
      .nullable()
      .required('Effective from date is required'),
    effectiveTo: Yup.date()
      .nullable()
      .required('Effective to date is required')
      .min(
        Yup.ref('effectiveFrom'),
        'Effective to must be on or after effective from'
      )
  });

  const title =
    mode === 'percentage' ? 'Percentage Allowance' : 'Fixed Value Allowance';
  const valuePlaceholder =
    mode === 'percentage' ? 'Percentage' : 'Value (LKR)';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Formik
          key={`${mode}-${editingRecord?.id ?? 'new'}-${formKey}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values, helpers) => {
            if (!canSave) {
              toast({
                variant: 'destructive',
                title: 'Permission denied',
                description: 'You do not have permission to save.'
              });
              return;
            }
            setSaving(true);
            try {
              const payload = {
                staffId: values.staffId,
                mode,
                value: Number(values.value),
                effectiveFrom: values.effectiveFrom as Date,
                effectiveTo: values.effectiveTo as Date
              };

              const result =
                isEditing && editingRecord
                  ? await updatePerformanceAllowanceAction(
                      editingRecord.id,
                      payload
                    )
                  : await createPerformanceAllowanceAction(payload);

              if (result.isError || !result.data) {
                applyFieldErrors(helpers, result.errors);
                toast({
                  variant: 'destructive',
                  title: 'Save failed',
                  description:
                    (typeof result.errors?.message === 'string' &&
                      result.errors.message) ||
                    'Unable to save performance allowance.'
                });
                return;
              }

              toast({
                title: isEditing ? 'Allowance updated' : 'Allowance created',
                description: `${result.data.staffName} · ${
                  mode === 'percentage'
                    ? `${result.data.value}%`
                    : result.data.value
                }`
              });
              clearEdit();
              helpers.resetForm({
                values: EMPTY_PERFORMANCE_ALLOWANCE_FORM
              });
              setFormKey((key) => key + 1);
              router.refresh();
            } finally {
              setSaving(false);
            }
          }}
        >
          {(formik) => (
            <Form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Employee
                    <span className="text-red-600"> *</span>
                  </Label>
                  <div className={fieldStyleClasses.inputClassName}>
                    <Combobox
                      label="Select Employee"
                      options={staffOptions}
                      value={formik.values.staffId}
                      defaultValue=""
                      onChange={(value) =>
                        void formik.setFieldValue('staffId', value)
                      }
                      clearable
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>
                  {formik.touched.staffId && formik.errors.staffId ? (
                    <p className="text-sm text-red-600">
                      {formik.errors.staffId}
                    </p>
                  ) : null}
                </div>

                <CustomFormField
                  id="value"
                  type="text"
                  placeholder={valuePlaceholder}
                  value={formik.values.value}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomDatePickerField
                  id="effectiveFrom"
                  placeholder="Effective From"
                  required
                  value={formik.values.effectiveFrom}
                  onChange={(value) =>
                    void formik.setFieldValue('effectiveFrom', value ?? null)
                  }
                  onBlur={formik.handleBlur}
                  styleClasses={fieldStyleClasses}
                  useFormikError
                />

                <CustomDatePickerField
                  id="effectiveTo"
                  placeholder="Effective To"
                  required
                  value={formik.values.effectiveTo}
                  onChange={(value) =>
                    void formik.setFieldValue('effectiveTo', value ?? null)
                  }
                  onBlur={formik.handleBlur}
                  styleClasses={fieldStyleClasses}
                  useFormikError
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {canSave ? (
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                ) : null}
                {mode === 'percentage' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() =>
                      toast({
                        title: 'Bulk Update',
                        description:
                          'Bulk percentage update will ship in a later phase.'
                      })
                    }
                  >
                    <UsersRound className="h-4 w-4" />
                    Bulk Update
                  </Button>
                ) : null}
                {isEditing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 text-red-500 hover:bg-red-500 hover:text-white"
                    onClick={() => {
                      clearEdit();
                      formik.resetForm({
                        values: EMPTY_PERFORMANCE_ALLOWANCE_FORM
                      });
                      setFormKey((key) => key + 1);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel edit
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  Created by:{' '}
                  <span className="text-foreground">
                    {isEditing && editingRecord?.createdBy
                      ? `${editingRecord.createdBy}${
                          editingRecord.createdAt
                            ? ` - ${formatDateTime(editingRecord.createdAt)}`
                            : ''
                        }`
                      : '—'}
                  </span>
                </p>
                <p>
                  Last updated:{' '}
                  <span className="text-foreground">
                    {isEditing && editingRecord?.updatedBy
                      ? `${editingRecord.updatedBy}${
                          editingRecord.updatedAt
                            ? ` - ${formatDateTime(editingRecord.updatedAt)}`
                            : ''
                        }`
                      : '—'}
                  </span>
                </p>
              </div>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  );
}
