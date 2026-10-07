'use client';

import { useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Save, Send, X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
  CustomDialog,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import { BadgeInput } from '@/components/custom/badge-input';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  EMPTY_VACANCY_REQUEST_FORM,
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  VACANCY_PRIORITIES,
  VACANCY_PRIORITY_LABELS,
  type VacancyRequestFormValues,
  type VacancyRequestRecord
} from '@/types/recruitment';
import type { VacancyFormMode } from './vacancy-requests-ui-context';

type DialogVacancyRequestFormProps = {
  open: boolean;
  mode: VacancyFormMode;
  record: VacancyRequestRecord | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  department: Yup.string().required('Department is required'),
  designation: Yup.string().required('Designation is required'),
  vacancies: Yup.string()
    .required('Number of vacancies is required')
    .test('vacancies', 'Enter a whole number of at least 1', (value) => {
      if (value == null || value === '') return false;
      const n = Number(value);
      return Number.isInteger(n) && n >= 1;
    }),
  employmentType: Yup.string().required('Employment type is required'),
  requiredQualifications: Yup.string().trim(),
  requiredExperience: Yup.string().trim(),
  skills: Yup.array().of(Yup.string()),
  jobDescription: Yup.string().trim(),
  salaryRange: Yup.string().trim(),
  requiredDate: Yup.date().nullable().required('Required date is required'),
  priority: Yup.string().required('Priority is required'),
  justification: Yup.string().trim().required('Justification is required'),
  remarks: Yup.string().trim()
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

const priorityOptions = VACANCY_PRIORITIES.map((id) => ({
  id,
  name: VACANCY_PRIORITY_LABELS[id]
}));

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function recordToFormValues(
  record: VacancyRequestRecord | null
): VacancyRequestFormValues {
  if (!record) return EMPTY_VACANCY_REQUEST_FORM;
  return {
    department: record.department,
    designation: record.designation,
    vacancies: String(record.vacancies),
    employmentType: record.employmentType,
    requiredQualifications: record.requiredQualifications,
    requiredExperience: record.requiredExperience,
    skills: [...record.skills],
    jobDescription: record.jobDescription,
    salaryRange: record.salaryRange,
    requiredDate: parseIsoDate(record.requiredDate),
    priority: record.priority,
    justification: record.justification,
    remarks: record.remarks
  };
}

type SubmitIntent = 'draft' | 'submit';

export default function DialogVacancyRequestForm({
  open,
  mode,
  record,
  onOpenChange
}: DialogVacancyRequestFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const submitIntentRef = useRef<SubmitIntent>('draft');

  const isDraft = mode === 'create' || record?.status === 'draft';

  const initialValues = useMemo(
    () =>
      mode === 'create' ? EMPTY_VACANCY_REQUEST_FORM : recordToFormValues(record),
    [mode, record]
  );

  const title =
    mode === 'create'
      ? 'New Vacancy Request'
      : `Edit ${record?.requestId ?? 'Vacancy Request'}`;

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    _values: VacancyRequestFormValues,
    _helpers: FormikHelpers<VacancyRequestFormValues>
  ) => {
    setSaving(true);
    try {
      const actionLabel =
        submitIntentRef.current === 'submit'
          ? 'Submit for approval'
          : 'Save';
      toast({
        title: 'Not saved',
        description: `${actionLabel} for vacancy requests will be wired in the workflow phase.`
      });
      handleClose();
    } finally {
      setSaving(false);
      submitIntentRef.current = 'draft';
    }
  };

  return (
    <CustomDialog open={open} setOpen={onOpenChange} title={title}>
      <Formik
        key={`${mode}-${record?.id ?? 'new'}`}
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {(formik) => (
          <Form className="space-y-4 py-4">
            <div className="space-y-4">
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
                <CustomFormField
                  id="vacancies"
                  type="number"
                  placeholder="Number of Vacancies"
                  value={formik.values.vacancies}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  min={1}
                  styleClasses={fieldStyleClasses}
                />
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
              </div>

              <CustomFormField
                id="requiredQualifications"
                type="textarea"
                placeholder="Required Qualifications"
                value={formik.values.requiredQualifications}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={fieldStyleClasses}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <CustomFormField
                  id="requiredExperience"
                  type="text"
                  placeholder="Required Experience"
                  value={formik.values.requiredExperience}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />
                <CustomFormField
                  id="salaryRange"
                  type="text"
                  placeholder="Salary Range (Where Applicable)"
                  value={formik.values.salaryRange}
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
                placeholder="e.g. Patient care — Enter to add"
              />

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

              <div className="grid gap-3 sm:grid-cols-2">
                <CustomDatePickerField
                  id="requiredDate"
                  placeholder="Required Date"
                  value={formik.values.requiredDate}
                  onChange={(date) =>
                    void formik.setFieldValue('requiredDate', date ?? null)
                  }
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />
                <CustomSelectField
                  id="priority"
                  placeholder="Priority"
                  value={formik.values.priority || undefined}
                  onChange={(value) =>
                    void formik.setFieldValue('priority', value)
                  }
                  required
                  options={priorityOptions}
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
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
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
                onClick={() => {
                  submitIntentRef.current = 'draft';
                }}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {isDraft ? (
                <Button
                  type="submit"
                  variant="outline"
                  className={buttonStyles.saveAndClose}
                  disabled={saving}
                  onClick={() => {
                    submitIntentRef.current = 'submit';
                  }}
                >
                  <Send className="h-4 w-4" />
                  {saving ? 'Submitting…' : 'Submit for approval'}
                </Button>
              ) : null}
            </div>
          </Form>
        )}
      </Formik>
    </CustomDialog>
  );
}
