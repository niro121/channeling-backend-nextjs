'use client';

import { Form, Formik } from 'formik';
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
import { buttonStyles } from '@/lib/utils/common-styles';

/* UI preview only: options are static and nothing is persisted yet. */

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const EMPLOYEE_OPTIONS = [
  { id: 'emp-1', name: 'Dr. R. Silva — Cardiology' },
  { id: 'emp-2', name: 'N. Fernando — Nursing · Ward 3' },
  { id: 'emp-3', name: 'K. Jayasuriya — OPD' },
  { id: 'emp-4', name: 'A. Kumara — Nursing · Trainee' },
  { id: 'emp-5', name: 'P. Bandara — Housekeeping' }
];

const PERIOD_OPTIONS = [
  { id: 'annual', name: 'Annual Review' },
  { id: 'probation', name: 'Probation Review' },
  { id: 'mid-year', name: 'Mid-Year Review' }
];

const RATING_OPTIONS = [
  { id: '5', name: '5 — Excellent' },
  { id: '4', name: '4 — Good' },
  { id: '3', name: '3 — Average' },
  { id: '2', name: '2 — Below Average' },
  { id: '1', name: '1 — Poor' }
];

const RATING_CRITERIA = [
  { key: 'jobKnowledge', label: 'Job Knowledge' },
  { key: 'qualityOfWork', label: 'Quality of Work' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'attendance', label: 'Attendance & Punctuality' },
  { key: 'communication', label: 'Communication' }
] as const;

type RatingKey = (typeof RATING_CRITERIA)[number]['key'];

type EvaluationFormValues = {
  employeeId: string;
  evaluationPeriod: string;
  evaluationDate: Date | null;
  reviewer: string;
  remarks: string;
} & Record<RatingKey, string>;

const INITIAL_VALUES: EvaluationFormValues = {
  employeeId: '',
  evaluationPeriod: '',
  evaluationDate: null,
  reviewer: '',
  remarks: '',
  jobKnowledge: '',
  qualityOfWork: '',
  teamwork: '',
  attendance: '',
  communication: ''
};

type SheetEvaluationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function SheetEvaluationForm({
  open,
  onOpenChange
}: SheetEvaluationFormProps) {
  const { toast } = useToast();

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    toast({
      title: 'Preview only',
      description: 'Saving evaluations is not connected yet.'
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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>New Evaluation</SheetTitle>
          <SheetDescription>
            Record a performance evaluation for a staff member.
          </SheetDescription>
        </SheetHeader>

        <Formik initialValues={INITIAL_VALUES} onSubmit={handleSubmit}>
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomSelectField
                  id="employeeId"
                  placeholder="Staff Member"
                  value={formik.values.employeeId || undefined}
                  onChange={(value) =>
                    void formik.setFieldValue('employeeId', value)
                  }
                  required
                  options={EMPLOYEE_OPTIONS}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="evaluationPeriod"
                    placeholder="Evaluation Type"
                    value={formik.values.evaluationPeriod || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('evaluationPeriod', value)
                    }
                    required
                    options={PERIOD_OPTIONS}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="evaluationDate"
                    placeholder="Evaluation Date"
                    value={formik.values.evaluationDate}
                    onChange={(date) =>
                      void formik.setFieldValue('evaluationDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

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

                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Ratings (1 – 5)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {RATING_CRITERIA.map((criterion) => (
                      <CustomSelectField
                        key={criterion.key}
                        id={criterion.key}
                        placeholder={criterion.label}
                        value={formik.values[criterion.key] || undefined}
                        onChange={(value) =>
                          void formik.setFieldValue(criterion.key, value)
                        }
                        required={false}
                        options={RATING_OPTIONS}
                        styleClasses={fieldStyleClasses}
                      />
                    ))}
                  </div>
                </div>

                <CustomFormField
                  id="remarks"
                  type="textarea"
                  placeholder="Overall Remarks"
                  value={formik.values.remarks}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  className={buttonStyles.cancel.normal}
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" className={buttonStyles.save}>
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
