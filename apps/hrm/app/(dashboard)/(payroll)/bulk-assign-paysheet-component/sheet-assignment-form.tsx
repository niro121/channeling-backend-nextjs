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
import {
  EMPTY_PAYSHEET_ASSIGNMENT_FORM,
  type PaysheetAssignmentFormValues,
  type PaysheetAssignmentRecord
} from '@/types/payroll';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import type { BulkPaysheetFormSheetMode } from './bulk-assign-ui-context';

type SheetAssignmentFormProps = {
  open: boolean;
  mode: BulkPaysheetFormSheetMode;
  record: PaysheetAssignmentRecord | null;
  componentOptions?: PaysheetComponentOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const LATER = 'Will be wired in the dynamic phase.';

const validationSchema = Yup.object({
  componentId: Yup.string().required('Paysheet component is required'),
  effectiveFrom: Yup.date()
    .nullable()
    .required('Effective from date is required'),
  effectiveTo: Yup.date().nullable().required('Effective to date is required'),
  value: Yup.string().required('Value is required')
});

function recordToFormValues(
  record: PaysheetAssignmentRecord | null
): PaysheetAssignmentFormValues {
  if (!record) return EMPTY_PAYSHEET_ASSIGNMENT_FORM;
  return {
    staffId: record.staffId,
    staffCode: record.staffCode,
    componentId: record.componentId,
    effectiveFrom: record.effectiveFrom ? new Date(record.effectiveFrom) : null,
    effectiveTo: record.effectiveTo ? new Date(record.effectiveTo) : null,
    value: String(record.value ?? 0)
  };
}

export default function SheetAssignmentForm({
  open,
  mode,
  record,
  componentOptions = [],
  onOpenChange
}: SheetAssignmentFormProps) {
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(0);
  const initialValues = useMemo(() => recordToFormValues(record), [record]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
        else onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>Edit Paysheet Assignment</SheetTitle>
          <SheetDescription>
            Update the component assignment and effective date range.
          </SheetDescription>
        </SheetHeader>

        <Formik
          key={`${mode}-${record?.id ?? 'edit'}-${formKey}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={() => {
            toast({
              title: 'Save changes',
              description: LATER
            });
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomFormField
                  id="staffCode"
                  type="text"
                  placeholder="Employee Code"
                  value={formik.values.staffCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  disabled
                  styleClasses={fieldStyleClasses}
                />
                <div className={fieldStyleClasses.parentDiv}>
                  <p className={fieldStyleClasses.labelClassName}>Employee</p>
                  <p className="text-sm text-foreground">
                    {record?.staffName || '—'}
                  </p>
                </div>
                <CustomSelectField
                  id="componentId"
                  placeholder="Paysheet Component"
                  value={formik.values.componentId}
                  onChange={(value) =>
                    void formik.setFieldValue('componentId', value)
                  }
                  required
                  options={componentOptions}
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
                <CustomFormField
                  id="value"
                  type="text"
                  placeholder="Value (LKR)"
                  value={formik.values.value}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:bg-red-500 hover:text-white"
                  onClick={() => {
                    formik.resetForm({ values: initialValues });
                    setFormKey((key) => key + 1);
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
