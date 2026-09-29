'use client';

import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Save, X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
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
import { formatDateTime } from '@/lib/utils/date';
import {
  DEPARTMENT_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_DESIGNATION_OPTIONS
} from '@/types/staff-employment-options';
import {
  DEDUCTION_CALC_METHOD_OPTIONS,
  DEDUCTION_STATUS_OPTIONS,
  DEDUCTION_TYPE_OPTIONS,
  EMPTY_DEDUCTION_FORM,
  type DeductionFormValues,
  type DeductionRecord,
  type DeductionStatus
} from '@/types/payroll';
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

const LATER = 'Will be wired in the dynamic phase.';

const validationSchema = Yup.object({
  code: Yup.string().trim(),
  name: Yup.string().trim().required('Deduction name is required'),
  deductionType: Yup.string().required('Deduction type is required'),
  calcMethod: Yup.string().required('Calculation method is required'),
  amountOrPercent: Yup.string()
    .trim()
    .required('Amount / percentage is required'),
  effectiveFrom: Yup.date()
    .nullable()
    .required('Effective from date is required')
});

const allOption = { id: '__all__', name: 'All' };

const staffCategoryOptions = [
  allOption,
  ...STAFF_CATEGORY_OPTIONS.map((item) => ({ id: item.id, name: item.name }))
];

const departmentOptions = [
  allOption,
  ...DEPARTMENT_OPTIONS.map((item) => ({ id: item.id, name: item.name }))
];

const designationOptions = [
  allOption,
  ...STAFF_DESIGNATION_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }))
];

const typeOptions = DEDUCTION_TYPE_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const calcMethodOptions = DEDUCTION_CALC_METHOD_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const statusOptions = DEDUCTION_STATUS_OPTIONS.map((item) => ({
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
    deductionType: record.deductionType ?? 'epf',
    calcMethod: record.calcMethod ?? 'fixed_per_month',
    amountOrPercent: record.amountOrPercent ?? '',
    staffCategory: record.staffCategoryId || '__all__',
    departmentId: record.departmentId || '__all__',
    designationId: record.designationId || '__all__',
    effectiveFrom: record.effectiveFrom
      ? new Date(record.effectiveFrom)
      : null,
    effectiveTo: record.effectiveTo ? new Date(record.effectiveTo) : null,
    status: record.status ?? 'active'
  };
}

export default function SheetDeductionForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetDeductionFormProps) {
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(0);

  const initialValues = useMemo(() => recordToFormValues(record), [record]);

  const title = mode === 'edit' ? 'Edit Deduction' : 'Add Deduction';
  const description =
    'Configure deduction calculation and applicability scope.';

  const handleClose = () => onOpenChange(false);

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
          key={`${mode}-${record?.id ?? 'new'}-${formKey}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={() => {
            toast({
              title: mode === 'edit' ? 'Save changes' : 'Save deduction',
              description: LATER
            });
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="code"
                    type="text"
                    placeholder="Deduction Code (Auto Generated)"
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
                    id="deductionType"
                    placeholder="Deduction Type"
                    value={formik.values.deductionType}
                    onChange={(value) =>
                      void formik.setFieldValue('deductionType', value)
                    }
                    required
                    options={typeOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="calcMethod"
                    placeholder="Calculation Method"
                    value={formik.values.calcMethod}
                    onChange={(value) =>
                      void formik.setFieldValue('calcMethod', value)
                    }
                    required
                    options={calcMethodOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="amountOrPercent"
                    type="text"
                    placeholder="Amount / Percentage"
                    value={formik.values.amountOrPercent}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="staffCategory"
                    placeholder="Applicable Staff Category"
                    value={formik.values.staffCategory}
                    onChange={(value) =>
                      void formik.setFieldValue('staffCategory', value)
                    }
                    options={staffCategoryOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="departmentId"
                    placeholder="Department"
                    value={formik.values.departmentId}
                    onChange={(value) =>
                      void formik.setFieldValue('departmentId', value)
                    }
                    options={departmentOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="designationId"
                    placeholder="Designation"
                    value={formik.values.designationId}
                    onChange={(value) =>
                      void formik.setFieldValue('designationId', value)
                    }
                    options={designationOptions}
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
                    value={formik.values.effectiveTo}
                    onChange={(value) =>
                      void formik.setFieldValue('effectiveTo', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError={false}
                  />
                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) =>
                      void formik.setFieldValue(
                        'status',
                        value as DeductionStatus
                      )
                    }
                    options={statusOptions}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Payroll rules follow the existing paysheet component flags
                  (Included For EPF / ETF / PayTax / OT / No Pay / PH). EPF 8%
                  staff, 12% employer and ETF 3% are read from HRM Variables.
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
                  onClick={() => {
                    formik.resetForm({ values: EMPTY_DEDUCTION_FORM });
                    setFormKey((key) => key + 1);
                    handleClose();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-9 gap-1.5">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
