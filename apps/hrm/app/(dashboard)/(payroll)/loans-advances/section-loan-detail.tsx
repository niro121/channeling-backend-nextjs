'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  CustomDatePickerField,
  CustomFormField,
  Label,
  CustomAlertDialog,
  useToast
} from '@archmage/ui';
import {
  createLoanAdvanceAction,
  deleteLoanAdvanceAction,
  updateLoanAdvanceAction
} from '@/app/actions/payroll-actions/loan-advance.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import { formatDateTime } from '@/lib/utils/date';
import { BANK_OPTIONS } from '@/types/bank';
import {
  EMPTY_LOAN_ADVANCE_FORM,
  type LoanAdvanceFormValues,
  type LoanAdvanceRecord,
  type PaysheetStaffOption
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import { useLoansAdvancesUi } from './loans-advances-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

type SectionLoanDetailProps = {
  componentOptions?: PaysheetComponentOption[];
  staffOptions?: PaysheetStaffOption[];
};

function recordToFormValues(
  record: LoanAdvanceRecord | null
): LoanAdvanceFormValues {
  if (!record) return EMPTY_LOAN_ADVANCE_FORM;
  return {
    componentId: record.componentId,
    staffId: record.staffId,
    loanNumber: record.loanNumber,
    bankId: record.bankId,
    branch: record.branch,
    accountNumber: record.accountNumber,
    startingBalance: String(record.startingBalance ?? ''),
    loanAmount: String(record.loanAmount ?? ''),
    monthlyInstallment: String(record.monthlyInstallment ?? ''),
    fromDate: record.fromDate ? new Date(record.fromDate) : null,
    toDate: record.toDate ? new Date(record.toDate) : null,
    comments: record.comments ?? '',
    scheduleForPaid: record.scheduleForPaid,
    completed: record.completed,
    completionDate: record.completionDate
      ? new Date(record.completionDate)
      : null
  };
}

function applyFieldErrors(
  helpers: FormikHelpers<LoanAdvanceFormValues>,
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

function numericRequired(label: string) {
  return Yup.string()
    .required(`${label} is required`)
    .test('numeric', `Enter a valid ${label.toLowerCase()}`, (v) => {
      if (!v?.trim()) return false;
      const n = Number(v);
      return !Number.isNaN(n) && n >= 0;
    });
}

export default function SectionLoanDetail({
  componentOptions = [],
  staffOptions = []
}: SectionLoanDetailProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { selectedRecord, clearSelection } = useLoansAdvancesUi();
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditing = selectedRecord != null;
  const canSave = isEditing ? has('payroll', 'edit') : has('payroll', 'add');
  const canDelete = has('payroll', 'delete');

  const initialValues = useMemo(
    () => recordToFormValues(selectedRecord),
    [selectedRecord]
  );

  useEffect(() => {
    setFormKey((key) => key + 1);
  }, [selectedRecord?.id]);

  const validationSchema = Yup.object({
    componentId: Yup.string().required('Loan component is required'),
    staffId: Yup.string().required('Employee is required'),
    loanNumber: Yup.string().required('Loan number is required'),
    bankId: Yup.string().required('Bank is required'),
    branch: Yup.string().required('Branch is required'),
    accountNumber: Yup.string().required('Account number is required'),
    startingBalance: numericRequired('Starting balance'),
    loanAmount: numericRequired('Loan amount'),
    monthlyInstallment: numericRequired('Monthly installment'),
    fromDate: Yup.date().nullable().required('From date is required'),
    toDate: Yup.date()
      .nullable()
      .required('To date is required')
      .min(Yup.ref('fromDate'), 'To date must be on or after from date'),
    comments: Yup.string(),
    scheduleForPaid: Yup.boolean(),
    completed: Yup.boolean(),
    completionDate: Yup.date()
      .nullable()
      .when('completed', {
        is: true,
        then: (schema) => schema.required('Completion date is required'),
        otherwise: (schema) => schema.nullable()
      })
  });

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Loan / Advance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            key={`${selectedRecord?.id ?? 'new'}-${formKey}`}
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
                  componentId: values.componentId,
                  staffId: values.staffId,
                  loanNumber: values.loanNumber.trim(),
                  bankId: values.bankId,
                  branch: values.branch.trim(),
                  accountNumber: values.accountNumber.trim(),
                  startingBalance: Number(values.startingBalance),
                  loanAmount: Number(values.loanAmount),
                  monthlyInstallment: Number(values.monthlyInstallment),
                  fromDate: values.fromDate as Date,
                  toDate: values.toDate as Date,
                  comments: values.comments.trim(),
                  scheduleForPaid: values.scheduleForPaid,
                  completed: values.completed,
                  completionDate: values.completed
                    ? values.completionDate
                    : null
                };

                const result =
                  isEditing && selectedRecord
                    ? await updateLoanAdvanceAction(selectedRecord.id, payload)
                    : await createLoanAdvanceAction(payload);

                if (result.isError || !result.data) {
                  applyFieldErrors(helpers, result.errors);
                  toast({
                    variant: 'destructive',
                    title: 'Save failed',
                    description:
                      (typeof result.errors?.message === 'string' &&
                        result.errors.message) ||
                      'Unable to save loan / advance.'
                  });
                  return;
                }

                toast({
                  title: isEditing
                    ? 'Loan / advance updated'
                    : 'Loan / advance created',
                  description: `${result.data.staffName} · ${result.data.loanNumber}`
                });
                clearSelection();
                helpers.resetForm({ values: EMPTY_LOAN_ADVANCE_FORM });
                setFormKey((key) => key + 1);
                router.refresh();
              } finally {
                setSaving(false);
              }
            }}
          >
            {(formik) => (
              <Form className="space-y-3">
                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Loan Component
                    <span className="text-red-600"> *</span>
                  </Label>
                  <Combobox
                    label="Select Loan Component"
                    options={componentOptions}
                    value={formik.values.componentId}
                    defaultValue=""
                    onChange={(v) => void formik.setFieldValue('componentId', v)}
                    clearable
                    triggerClassName="w-full max-w-none font-normal!"
                    popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                  />
                  {formik.touched.componentId && formik.errors.componentId ? (
                    <p className="text-sm text-red-600">
                      {formik.errors.componentId}
                    </p>
                  ) : null}
                </div>

                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Employee
                    <span className="text-red-600"> *</span>
                  </Label>
                  <Combobox
                    label="Select Employee"
                    options={staffOptions}
                    value={formik.values.staffId}
                    defaultValue=""
                    onChange={(v) => void formik.setFieldValue('staffId', v)}
                    clearable
                    triggerClassName="w-full max-w-none font-normal!"
                    popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                  />
                  {formik.touched.staffId && formik.errors.staffId ? (
                    <p className="text-sm text-red-600">
                      {formik.errors.staffId}
                    </p>
                  ) : null}
                </div>

                <CustomFormField
                  id="loanNumber"
                  type="text"
                  placeholder="Loan Number"
                  value={formik.values.loanNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Bank
                    <span className="text-red-600"> *</span>
                  </Label>
                  <Combobox
                    label="Select Bank"
                    options={BANK_OPTIONS}
                    value={formik.values.bankId}
                    defaultValue=""
                    onChange={(v) => void formik.setFieldValue('bankId', v)}
                    clearable
                    triggerClassName="w-full max-w-none font-normal!"
                    popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                  />
                  {formik.touched.bankId && formik.errors.bankId ? (
                    <p className="text-sm text-red-600">{formik.errors.bankId}</p>
                  ) : null}
                </div>

                <CustomFormField
                  id="branch"
                  type="text"
                  placeholder="Branch"
                  value={formik.values.branch}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="accountNumber"
                  type="text"
                  placeholder="Account Number"
                  value={formik.values.accountNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="startingBalance"
                  type="text"
                  placeholder="Starting Balance"
                  value={formik.values.startingBalance}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="loanAmount"
                  type="text"
                  placeholder="Loan Amount"
                  value={formik.values.loanAmount}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="monthlyInstallment"
                  type="text"
                  placeholder="Monthly Installment"
                  value={formik.values.monthlyInstallment}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomDatePickerField
                  id="fromDate"
                  placeholder="From Date"
                  required
                  value={formik.values.fromDate}
                  onChange={(value) =>
                    void formik.setFieldValue('fromDate', value ?? null)
                  }
                  onBlur={formik.handleBlur}
                  styleClasses={fieldStyleClasses}
                  useFormikError
                />

                <CustomDatePickerField
                  id="toDate"
                  placeholder="To Date"
                  required
                  value={formik.values.toDate}
                  onChange={(value) =>
                    void formik.setFieldValue('toDate', value ?? null)
                  }
                  onBlur={formik.handleBlur}
                  styleClasses={fieldStyleClasses}
                  useFormikError
                />

                <CustomFormField
                  id="comments"
                  type="textarea"
                  placeholder="Comments"
                  value={formik.values.comments}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formik.values.scheduleForPaid}
                      onCheckedChange={(checked) =>
                        void formik.setFieldValue(
                          'scheduleForPaid',
                          checked === true
                        )
                      }
                    />
                    Schedule For Paid
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formik.values.completed}
                        onCheckedChange={(checked) => {
                          const next = checked === true;
                          void formik.setFieldValue('completed', next);
                          if (!next) {
                            void formik.setFieldValue('completionDate', null);
                          }
                        }}
                      />
                      Completed
                    </label>
                    <div className="min-w-0 flex-1">
                      <CustomDatePickerField
                        id="completionDate"
                        placeholder="Completion Date"
                        required={formik.values.completed}
                        value={formik.values.completionDate}
                        onChange={(value) =>
                          void formik.setFieldValue(
                            'completionDate',
                            value ?? null
                          )
                        }
                        onBlur={formik.handleBlur}
                        disabled={!formik.values.completed}
                        styleClasses={fieldStyleClasses}
                        useFormikError
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={!canSave || saving || formik.isSubmitting}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5"
                    disabled={saving || deleting}
                    onClick={() => {
                      clearSelection();
                      formik.resetForm({ values: EMPTY_LOAN_ADVANCE_FORM });
                      setFormKey((key) => key + 1);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                  {canDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 text-red-500 hover:bg-red-500 hover:text-white"
                      disabled={!isEditing || saving || deleting}
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <p>
                    Created by:{' '}
                    <span className="text-foreground">
                      {isEditing && selectedRecord?.createdBy
                        ? `${selectedRecord.createdBy}${
                            selectedRecord.createdAt
                              ? ` - ${formatDateTime(selectedRecord.createdAt)}`
                              : ''
                          }`
                        : '—'}
                    </span>
                  </p>
                  <p>
                    Last updated:{' '}
                    <span className="text-foreground">
                      {isEditing && selectedRecord?.updatedBy
                        ? `${selectedRecord.updatedBy}${
                            selectedRecord.updatedAt
                              ? ` - ${formatDateTime(selectedRecord.updatedAt)}`
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

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Remove loan / advance?"
        description={
          selectedRecord
            ? `Remove ${selectedRecord.componentName} for ${selectedRecord.staffName} (${selectedRecord.loanNumber})?`
            : 'Remove this loan / advance record?'
        }
        loading={deleting}
        handleContinue={async () => {
          if (!selectedRecord) return;
          setDeleting(true);
          try {
            const result = await deleteLoanAdvanceAction(selectedRecord.id);
            setDeleteOpen(false);
            if (result.isError) {
              toast({
                variant: 'destructive',
                title: 'Remove failed',
                description:
                  (result.errors.message as string) ??
                  'Could not remove loan / advance.'
              });
              return;
            }
            toast({
              title: 'Loan / advance removed',
              description: `${selectedRecord.staffName} · ${selectedRecord.loanNumber}`
            });
            clearSelection();
            setFormKey((key) => key + 1);
            router.refresh();
          } finally {
            setDeleting(false);
          }
        }}
        className={{
          actionButton:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90'
        }}
      />
    </>
  );
}
