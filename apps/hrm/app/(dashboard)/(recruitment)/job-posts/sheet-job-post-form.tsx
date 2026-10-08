'use client';

import { useMemo, useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
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
import { BadgeInput } from '@/components/custom/badge-input';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  EMPTY_JOB_POST_FORM,
  JOB_POST_STATUS_LABELS,
  JOB_POST_STATUSES,
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  type JobPostFormValues,
  type JobPostRecord
} from '@/types/recruitment';
import type { JobPostFormMode } from './job-posts-ui-context';
import { SAMPLE_APPROVED_VACANCY_OPTIONS } from './sample-data';

type SheetJobPostFormProps = {
  open: boolean;
  mode: JobPostFormMode;
  record: JobPostRecord | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  linkedVacancyRequestId: Yup.string(),
  jobTitle: Yup.string().trim().required('Job title is required'),
  department: Yup.string().required('Department is required'),
  designation: Yup.string().required('Designation is required'),
  jobDescription: Yup.string().trim(),
  responsibilities: Yup.string().trim(),
  qualifications: Yup.string().trim(),
  experience: Yup.string().trim(),
  skills: Yup.array().of(Yup.string()),
  employmentType: Yup.string().required('Employment type is required'),
  salaryInformation: Yup.string().trim(),
  openings: Yup.string()
    .required('Number of vacancies is required')
    .test('openings', 'Enter a whole number of at least 1', (value) => {
      if (value == null || value === '') return false;
      const n = Number(value);
      return Number.isInteger(n) && n >= 1;
    }),
  closingDate: Yup.date().nullable().required('Closing date is required'),
  applicationInstructions: Yup.string().trim(),
  status: Yup.string().required('Status is required')
});

const departmentOptions = VACANCY_DEPARTMENT_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const designationOptions = VACANCY_DESIGNATION_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const employmentTypeOptions = VACANCY_EMPLOYMENT_TYPES.map((id) => ({
  id,
  name: VACANCY_EMPLOYMENT_TYPE_LABELS[id]
}));

const statusOptions = JOB_POST_STATUSES.map((id) => ({
  id,
  name: JOB_POST_STATUS_LABELS[id]
}));

const linkedVacancyOptions = SAMPLE_APPROVED_VACANCY_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function recordToFormValues(
  record: JobPostRecord | null,
  asDuplicate = false
): JobPostFormValues {
  if (!record) return EMPTY_JOB_POST_FORM;
  return {
    linkedVacancyRequestId: record.linkedVacancyRequestId,
    jobTitle: asDuplicate ? `${record.jobTitle} (Copy)` : record.jobTitle,
    department: record.department,
    designation: record.designation,
    jobDescription: record.jobDescription,
    responsibilities: record.responsibilities,
    qualifications: record.qualifications,
    experience: record.experience,
    skills: [...record.skills],
    employmentType: record.employmentType,
    salaryInformation: record.salaryInformation,
    openings: String(record.openings),
    closingDate: parseIsoDate(record.closingDate),
    applicationInstructions: record.applicationInstructions,
    status: asDuplicate ? 'draft' : record.status
  };
}

export default function SheetJobPostForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetJobPostFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const initialValues = useMemo(() => {
    if (mode === 'create') return EMPTY_JOB_POST_FORM;
    if (mode === 'duplicate') return recordToFormValues(record, true);
    return recordToFormValues(record);
  }, [mode, record]);

  const title =
    mode === 'edit'
      ? `Edit ${record?.jobPostId ?? 'Job Post'}`
      : mode === 'duplicate'
        ? `Duplicate ${record?.jobPostId ?? 'Job Post'}`
        : 'Create Job Post';

  const description =
    mode === 'edit'
      ? 'Update job post details for recruitment.'
      : 'Create from an approved vacancy request.';

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    _values: JobPostFormValues,
    _helpers: FormikHelpers<JobPostFormValues>
  ) => {
    setSaving(true);
    try {
      toast({
        title: 'Not saved',
        description:
          'Save for job posts will be wired in the workflow phase.'
      });
      handleClose();
    } finally {
      setSaving(false);
    }
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
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <Formik
          key={`${mode}-${record?.id ?? 'new'}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomSelectField
                  id="linkedVacancyRequestId"
                  placeholder="Linked Vacancy Request"
                  value={formik.values.linkedVacancyRequestId || undefined}
                  onChange={(value) => {
                    void formik.setFieldValue('linkedVacancyRequestId', value);
                    const option = SAMPLE_APPROVED_VACANCY_OPTIONS.find(
                      (item) => item.id === value
                    );
                    if (option && mode !== 'edit') {
                      // Prefill lightly from vacancy label when creating/duplicating
                      if (!formik.values.jobTitle) {
                        const titlePart = option.name.split(' — ')[1];
                        if (titlePart) {
                          void formik.setFieldValue(
                            'jobTitle',
                            titlePart.split(' (')[0] ?? titlePart
                          );
                        }
                      }
                    }
                  }}
                  required={false}
                  options={linkedVacancyOptions}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="jobTitle"
                  type="text"
                  placeholder="Job Title"
                  value={formik.values.jobTitle}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="department"
                    placeholder="Department"
                    value={formik.values.department || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('department', value)
                    }
                    required
                    options={departmentOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="designation"
                    placeholder="Designation"
                    value={formik.values.designation || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('designation', value)
                    }
                    required
                    options={designationOptions}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="jobDescription"
                  type="textarea"
                  placeholder="Job Description"
                  value={formik.values.jobDescription}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="responsibilities"
                  type="textarea"
                  placeholder="Responsibilities"
                  value={formik.values.responsibilities}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="qualifications"
                    type="textarea"
                    placeholder="Qualifications"
                    value={formik.values.qualifications}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="experience"
                    type="textarea"
                    placeholder="Experience"
                    value={formik.values.experience}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <BadgeInput
                  id="skills"
                  label="Skills"
                  value={formik.values.skills}
                  onChange={(skills) =>
                    void formik.setFieldValue('skills', skills)
                  }
                  onBlur={() => void formik.setFieldTouched('skills', true)}
                  placeholder="Type a skill and press Enter"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="employmentType"
                    placeholder="Employment Type"
                    value={formik.values.employmentType || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('employmentType', value)
                    }
                    required
                    options={employmentTypeOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="salaryInformation"
                    type="text"
                    placeholder="Salary Information"
                    value={formik.values.salaryInformation}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="openings"
                    type="number"
                    placeholder="Number of Vacancies"
                    value={formik.values.openings}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={1}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="closingDate"
                    placeholder="Application Closing Date"
                    value={formik.values.closingDate}
                    onChange={(date) =>
                      void formik.setFieldValue('closingDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="applicationInstructions"
                  type="textarea"
                  placeholder="Application Instructions"
                  value={formik.values.applicationInstructions}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomSelectField
                  id="status"
                  placeholder="Status"
                  value={formik.values.status || undefined}
                  onChange={(value) =>
                    void formik.setFieldValue('status', value)
                  }
                  required
                  options={statusOptions}
                  styleClasses={fieldStyleClasses}
                />
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  className={buttonStyles.cancel.normal}
                  disabled={saving}
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={buttonStyles.save}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
