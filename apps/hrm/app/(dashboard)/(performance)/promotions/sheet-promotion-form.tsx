'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
import {
  Button,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  PROMOTION_TYPE_LABELS,
  PROMOTION_TYPES,
  type PerformanceSelectOption,
  type PromotionRecord
} from '@/types/performance';
import type { PromotionFormMode } from './promotions-ui-context';

/* UI preview only: nothing is saved or uploaded yet. */

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const DEFAULT_REQUESTED_BY = 'Sample HR Officer';

const PROMOTION_TYPE_OPTIONS = PROMOTION_TYPES.map((id) => ({
  id,
  name: PROMOTION_TYPE_LABELS[id]
}));

type PromotionFormValues = {
  staffId: string;
  currentReportingManager: string;
  newDesignation: string;
  newGrade: string;
  newDepartment: string;
  newReportingManager: string;
  effectiveDate: Date | null;
  salaryAdjustment: string;
  promotionType: string;
  justification: string;
  performanceReviewReference: string;
  remarks: string;
  requestedBy: string;
  requestDate: Date | null;
};

const requiredSelect = (label: string) =>
  Yup.string().required(`${label} is required`);

const validationSchema = Yup.object({
  staffId: requiredSelect('Staff member'),
  currentReportingManager: Yup.string()
    .trim()
    .required('Current reporting manager is required'),
  newDesignation: requiredSelect('New designation'),
  newGrade: requiredSelect('New grade'),
  newDepartment: Yup.string(),
  newReportingManager: Yup.string().trim(),
  effectiveDate: Yup.date().nullable().required('Effective date is required'),
  salaryAdjustment: Yup.string().trim(),
  promotionType: requiredSelect('Promotion type'),
  justification: Yup.string().trim().required('Justification is required'),
  performanceReviewReference: Yup.string().trim(),
  remarks: Yup.string().trim(),
  requestedBy: Yup.string().trim().required('Requested by is required'),
  requestDate: Yup.date().nullable().required('Request date is required')
});

function parseYmd(value?: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildInitialValues(
  record: PromotionRecord | null
): PromotionFormValues {
  return {
    staffId: record?.staffCode ?? '',
    currentReportingManager: record?.currentReportingManager ?? '',
    newDesignation: record?.proposedDesignation ?? '',
    newGrade: record?.proposedGrade ?? '',
    newDepartment: '',
    newReportingManager: '',
    effectiveDate: parseYmd(record?.effectiveDate),
    salaryAdjustment: '',
    promotionType: record?.promotionType ?? '',
    justification: '',
    performanceReviewReference: '',
    remarks: '',
    requestedBy: record?.requestedBy ?? DEFAULT_REQUESTED_BY,
    requestDate: parseYmd(record?.requestDate) ?? new Date()
  };
}

function FormSection({
  title,
  bordered = true,
  children
}: {
  title: string;
  bordered?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={bordered ? 'space-y-3 border-t border-border pt-4' : 'space-y-3'}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** File picker preview: files are listed by count only and never uploaded. */
function SupportingDocumentsField() {
  const [count, setCount] = useState(0);

  return (
    <div className={fieldStyleClasses.parentDiv}>
      <Label
        htmlFor="supportingDocuments"
        className={fieldStyleClasses.labelClassName}
      >
        Supporting Documents
      </Label>
      <Input
        id="supportingDocuments"
        type="file"
        multiple
        onChange={(e) => setCount(e.target.files?.length ?? 0)}
      />
      <p className="text-xs text-muted-foreground">
        {count === 0
          ? 'No documents selected'
          : `${count} ${count === 1 ? 'document' : 'documents'} selected`}{' '}
        · Sample references only; files are not uploaded.
      </p>
    </div>
  );
}

type SheetPromotionFormProps = {
  open: boolean;
  mode: PromotionFormMode;
  record: PromotionRecord | null;
  staffOptions: PerformanceSelectOption[];
  designationOptions: PerformanceSelectOption[];
  gradeOptions: PerformanceSelectOption[];
  departmentOptions: PerformanceSelectOption[];
  onOpenChange: (open: boolean) => void;
};

export default function SheetPromotionForm({
  open,
  mode,
  record,
  staffOptions,
  designationOptions,
  gradeOptions,
  departmentOptions,
  onOpenChange
}: SheetPromotionFormProps) {
  const { toast } = useToast();

  const initialValues = useMemo(
    () => buildInitialValues(mode === 'edit' ? record : null),
    // Rebuild each time the sheet opens so "Request Date" defaults to today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, record, open]
  );

  const title = mode === 'edit' ? 'Edit Promotion Request' : 'Create Promotion Request';
  const description =
    mode === 'edit' && record
      ? `${record.requestId} · ${record.staffName}`
      : 'New draft · Promotion request record';

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    toast({
      title: 'Preview only',
      description: 'Saving promotion requests is not connected yet.'
    });
    handleClose();
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
          key={`${mode}-${record?.id ?? 'new'}`}
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
                <FormSection title="Staff Information" bordered={false}>
                  <CustomSelectField
                    id="staffId"
                    label="Staff Member"
                    placeholder="Select Staff Member"
                    value={formik.values.staffId || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('staffId', value)
                    }
                    required
                    options={staffOptions}
                    styleClasses={fieldStyleClasses}
                  />
                </FormSection>

                <FormSection title="Current Employment">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomFormField
                      id="currentReportingManager"
                      type="text"
                      placeholder="Current Reporting Manager"
                      value={formik.values.currentReportingManager}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </FormSection>

                <FormSection title="Proposed Promotion">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomSelectField
                      id="newDesignation"
                      label="New Designation"
                      placeholder="Select New Designation"
                      value={formik.values.newDesignation || undefined}
                      onChange={(value) =>
                        void formik.setFieldValue('newDesignation', value)
                      }
                      required
                      options={designationOptions}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="newGrade"
                      label="New Grade"
                      placeholder="Select New Grade"
                      value={formik.values.newGrade || undefined}
                      onChange={(value) =>
                        void formik.setFieldValue('newGrade', value)
                      }
                      required
                      options={gradeOptions}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="newDepartment"
                      label="New Department"
                      placeholder="Select New Department"
                      value={formik.values.newDepartment || undefined}
                      onChange={(value) =>
                        void formik.setFieldValue('newDepartment', value)
                      }
                      required={false}
                      options={departmentOptions}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="newReportingManager"
                      type="text"
                      placeholder="New Reporting Manager"
                      value={formik.values.newReportingManager}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="effectiveDate"
                      placeholder="Effective Date"
                      value={formik.values.effectiveDate}
                      onChange={(date) =>
                        void formik.setFieldValue('effectiveDate', date ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="salaryAdjustment"
                      type="text"
                      placeholder="Salary Adjustment"
                      value={formik.values.salaryAdjustment}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="promotionType"
                      label="Promotion Type"
                      placeholder="Select Promotion Type"
                      value={formik.values.promotionType || undefined}
                      onChange={(value) =>
                        void formik.setFieldValue('promotionType', value)
                      }
                      required
                      options={PROMOTION_TYPE_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="justification"
                    type="textarea"
                    placeholder="Justification"
                    value={formik.values.justification}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomFormField
                      id="performanceReviewReference"
                      type="text"
                      placeholder="Performance Review Reference"
                      value={formik.values.performanceReviewReference}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <SupportingDocumentsField />
                  </div>

                  <CustomFormField
                    id="remarks"
                    type="textarea"
                    placeholder="Remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomFormField
                      id="requestedBy"
                      type="text"
                      placeholder="Requested By"
                      value={formik.values.requestedBy}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="requestDate"
                      placeholder="Request Date"
                      value={formik.values.requestDate}
                      onChange={(date) =>
                        void formik.setFieldValue('requestDate', date ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </FormSection>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button type="submit" className={buttonStyles.save}>
                  Save Draft
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
