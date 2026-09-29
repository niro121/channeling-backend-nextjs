'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
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

const LATER = 'Will be wired in the dynamic phase.';

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

export default function SectionLoanDetail({
  componentOptions = [],
  staffOptions = []
}: SectionLoanDetailProps) {
  const { toast } = useToast();
  const { selectedRecord, clearSelection } = useLoansAdvancesUi();
  const [formKey, setFormKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isEditing = selectedRecord != null;
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
    startingBalance: Yup.string().required('Starting balance is required'),
    loanAmount: Yup.string().required('Loan amount is required'),
    monthlyInstallment: Yup.string().required('Monthly installment is required'),
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
            onSubmit={() => {
              toast({
                title: isEditing ? 'Save changes' : 'Save loan / advance',
                description: LATER
              });
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
                  <Button type="submit" size="sm" className="h-9 gap-1.5">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      clearSelection();
                      formik.resetForm({ values: EMPTY_LOAN_ADVANCE_FORM });
                      setFormKey((key) => key + 1);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 gap-1.5 text-red-500 hover:bg-red-500 hover:text-white"
                    disabled={!isEditing}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
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
        loading={false}
        handleContinue={() => {
          setDeleteOpen(false);
          clearSelection();
          toast({
            title: 'Remove loan / advance',
            description: LATER
          });
        }}
        className={{
          actionButton:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90'
        }}
      />
    </>
  );
}
