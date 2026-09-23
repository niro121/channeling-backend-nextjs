'use client';

import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Save, X } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomDatePickerField,
  CustomFormField,
  Label,
  Selector,
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
  PAYSHEET_COMPONENT_OPTIONS,
  type PaysheetAssignmentFormValues,
  type PaysheetAssignmentRecord,
  type PaysheetStaffOption
} from '@/types/payroll';
import type { PaysheetFormSheetMode } from './assign-paysheet-ui-context';

type SheetAssignmentFormProps = {
  open: boolean;
  mode: PaysheetFormSheetMode;
  record: PaysheetAssignmentRecord | null;
  staffOptions?: PaysheetStaffOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const LATER = 'Will be wired in the dynamic phase.';

const validationSchema = Yup.object({
  staffId: Yup.string().required('Employee is required'),
  staffCode: Yup.string().required('Employee code is required'),
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
  staffOptions = [],
  onOpenChange
}: SheetAssignmentFormProps) {
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(0);

  const initialValues = useMemo(() => recordToFormValues(record), [record]);

  const componentOptions = PAYSHEET_COMPONENT_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const title =
    mode === 'edit' ? 'Edit Paysheet Assignment' : 'Assign Paysheet Component';
  const description =
    mode === 'edit'
      ? 'Update the component assignment and effective date range.'
      : 'Assign an individual paysheet component to a staff member.';

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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
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
              title: mode === 'edit' ? 'Save changes' : 'Save assignment',
              description: LATER
            });
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Select Employee
                    <span className="text-red-600"> *</span>
                  </Label>
                  <div className={fieldStyleClasses.inputClassName}>
                    <Combobox
                      label="Select Employee"
                      options={staffOptions}
                      value={formik.values.staffId}
                      defaultValue=""
                      onChange={(value) => {
                        const selected = staffOptions.find(
                          (item) => item.id === value
                        );
                        void formik.setFieldValue('staffId', value);
                        void formik.setFieldValue(
                          'staffCode',
                          selected?.code ?? ''
                        );
                      }}
                      clearable
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>
                </div>

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

                <Selector
                  label="Paysheet Component"
                  options={componentOptions}
                  value={formik.values.componentId || undefined}
                  defaultValue="__all__"
                  onChange={(value) => {
                    void formik.setFieldValue(
                      'componentId',
                      value === '__all__' ? '' : value
                    );
                  }}
                  className={{ trigger: 'w-full max-w-none' }}
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

                <div className="grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by:{' '}
                    <span className="text-foreground">
                      {record?.createdBy
                        ? `${record.createdBy}${
                            record.createdAt ? ` - ${record.createdAt}` : ''
                          }`
                        : '—'}
                    </span>
                  </p>
                  <p>
                    Last updated:{' '}
                    <span className="text-foreground">
                      {record?.updatedBy
                        ? `${record.updatedBy}${
                            record.updatedAt ? ` - ${record.updatedAt}` : ''
                          }`
                        : '—'}
                    </span>
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:text-white hover:bg-red-500 transition-colors"
                  onClick={() => {
                    formik.resetForm({
                      values: EMPTY_PAYSHEET_ASSIGNMENT_FORM
                    });
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
