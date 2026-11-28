'use client';

import { useMemo, type ReactNode } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
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
import { buttonStyles } from '@/lib/utils/common-styles';
import type { ProbationReviewRecord } from '@/types/performance';
import type { FilterOption } from './section-filters';
import type { ProbationReviewFormMode } from './probation-reviews-ui-context';

/* UI preview only: options are static and nothing is persisted yet. */

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const RATING_OPTIONS = [
  { id: 'excellent', name: 'Excellent' },
  { id: 'good', name: 'Good' },
  { id: 'satisfactory', name: 'Satisfactory' },
  { id: 'needs_improvement', name: 'Needs Improvement' },
  { id: 'poor', name: 'Poor' }
];

const RECOMMENDATION_OPTIONS = [
  { id: 'confirm', name: 'Confirm in Service' },
  { id: 'extend', name: 'Extend Probation' },
  { id: 'not_confirm', name: 'Not Recommended for Confirmation' }
];

const ASSESSMENT_CRITERIA = [
  { key: 'attendance', label: 'Attendance and Punctuality' },
  { key: 'jobKnowledge', label: 'Job Knowledge' },
  { key: 'workQuality', label: 'Work Quality' },
  { key: 'discipline', label: 'Discipline and Conduct' },
  { key: 'communication', label: 'Communication' },
  { key: 'teamwork', label: 'Teamwork' }
] as const;

type AssessmentKey = (typeof ASSESSMENT_CRITERIA)[number]['key'];

type ProbationReviewFormValues = {
  staffId: string;
  reportingManager: string;
  probationStartDate: Date | null;
  probationEndDate: Date | null;
  reviewDueDate: Date | null;
  reviewer: string;
  reviewDate: Date | null;
  overallRating: string;
  strengths: string;
  improvementAreas: string;
  reviewerComments: string;
  finalRecommendation: string;
  nextActionDate: Date | null;
} & Record<AssessmentKey, string>;

const requiredSelect = (label: string) =>
  Yup.string().required(`${label} is required`);
const requiredDate = (label: string) =>
  Yup.date().nullable().required(`${label} is required`);

const validationSchema = Yup.object({
  staffId: requiredSelect('Staff member'),
  reportingManager: Yup.string().trim().required('Reporting manager is required'),
  probationStartDate: requiredDate('Probation start date'),
  probationEndDate: requiredDate('Probation end date'),
  reviewDueDate: requiredDate('Review due date'),
  reviewer: Yup.string().trim().required('Reviewer is required'),
  reviewDate: requiredDate('Review date'),
  attendance: requiredSelect('Attendance and punctuality'),
  jobKnowledge: requiredSelect('Job knowledge'),
  workQuality: requiredSelect('Work quality'),
  discipline: requiredSelect('Discipline and conduct'),
  communication: requiredSelect('Communication'),
  teamwork: requiredSelect('Teamwork'),
  overallRating: requiredSelect('Overall performance rating'),
  strengths: Yup.string().trim(),
  improvementAreas: Yup.string().trim(),
  reviewerComments: Yup.string().trim().required('Reviewer comments are required'),
  finalRecommendation: requiredSelect('Final recommendation'),
  nextActionDate: Yup.date().nullable()
});

function parseYmd(value?: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildInitialValues(
  record: ProbationReviewRecord | null
): ProbationReviewFormValues {
  return {
    staffId: record?.staffCode ?? '',
    reportingManager: record?.reportingManager ?? '',
    probationStartDate: parseYmd(record?.probationStartDate),
    probationEndDate: parseYmd(record?.probationEndDate),
    reviewDueDate: parseYmd(record?.reviewDueDate),
    reviewer: '',
    reviewDate: new Date(),
    attendance: '',
    jobKnowledge: '',
    workQuality: '',
    discipline: '',
    communication: '',
    teamwork: '',
    overallRating: '',
    strengths: '',
    improvementAreas: '',
    reviewerComments: '',
    finalRecommendation: '',
    nextActionDate: null
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

type SheetProbationReviewFormProps = {
  open: boolean;
  mode: ProbationReviewFormMode;
  record: ProbationReviewRecord | null;
  staffOptions: FilterOption[];
  onOpenChange: (open: boolean) => void;
};

export default function SheetProbationReviewForm({
  open,
  mode,
  record,
  staffOptions,
  onOpenChange
}: SheetProbationReviewFormProps) {
  const { toast } = useToast();

  const initialValues = useMemo(
    () => buildInitialValues(mode === 'edit' ? record : null),
    // Rebuild each time the sheet opens so "Review Date" defaults to today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, record, open]
  );

  const title = mode === 'edit' ? 'Edit Review' : 'Create Review';
  const description =
    mode === 'edit' && record
      ? `${record.staffName} · ${record.staffCode}`
      : 'New draft - Probation review record';

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    toast({
      title: 'Preview only',
      description: 'Saving probation reviews is not connected yet.'
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

                <FormSection title="Employment Information & Probation Period">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomFormField
                      id="reportingManager"
                      type="text"
                      placeholder="Reporting Manager"
                      value={formik.values.reportingManager}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="probationStartDate"
                      placeholder="Probation Start Date"
                      value={formik.values.probationStartDate}
                      onChange={(date) =>
                        void formik.setFieldValue(
                          'probationStartDate',
                          date ?? null
                        )
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="probationEndDate"
                      placeholder="Probation End Date"
                      value={formik.values.probationEndDate}
                      onChange={(date) =>
                        void formik.setFieldValue(
                          'probationEndDate',
                          date ?? null
                        )
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="reviewDueDate"
                      placeholder="Review Due Date"
                      value={formik.values.reviewDueDate}
                      onChange={(date) =>
                        void formik.setFieldValue('reviewDueDate', date ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </FormSection>

                <FormSection title="Reviewer Information">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomFormField
                      id="reviewer"
                      type="text"
                      placeholder="Reviewer"
                      value={formik.values.reviewer}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="reviewDate"
                      placeholder="Review Date"
                      value={formik.values.reviewDate}
                      onChange={(date) =>
                        void formik.setFieldValue('reviewDate', date ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </FormSection>

                <FormSection title="Performance Assessment">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ASSESSMENT_CRITERIA.map((criterion) => (
                      <CustomSelectField
                        key={criterion.key}
                        id={criterion.key}
                        label={criterion.label}
                        placeholder={`Select ${criterion.label}`}
                        value={formik.values[criterion.key] || undefined}
                        onChange={(value) =>
                          void formik.setFieldValue(criterion.key, value)
                        }
                        required
                        options={RATING_OPTIONS}
                        styleClasses={fieldStyleClasses}
                      />
                    ))}
                    <CustomSelectField
                      id="overallRating"
                      label="Overall Performance Rating"
                      placeholder="Select Overall Performance Rating"
                      value={formik.values.overallRating || undefined}
                      onChange={(value) =>
                        void formik.setFieldValue('overallRating', value)
                      }
                      required
                      options={RATING_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="strengths"
                    type="textarea"
                    placeholder="Strengths"
                    value={formik.values.strengths}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="improvementAreas"
                    type="textarea"
                    placeholder="Areas for Improvement"
                    value={formik.values.improvementAreas}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="reviewerComments"
                    type="textarea"
                    placeholder="Reviewer Comments"
                    value={formik.values.reviewerComments}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <CustomSelectField
                      id="finalRecommendation"
                      label="Final Recommendation"
                      placeholder="Select Final Recommendation"
                      value={formik.values.finalRecommendation || undefined}
                      onChange={(value) =>
                        void formik.setFieldValue('finalRecommendation', value)
                      }
                      required
                      options={RECOMMENDATION_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="nextActionDate"
                      placeholder="Next Action Date"
                      value={formik.values.nextActionDate}
                      onChange={(date) =>
                        void formik.setFieldValue('nextActionDate', date ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required={false}
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
