'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Save, X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
  CustomFormField,
  CustomMultiSelect,
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
  createJobPostAction,
  updateJobPostAction
} from '@/app/actions/recruitment-actions/job-post.actions';
import { BadgeInput } from '@/components/custom/badge-input';
import { CustomSlugField } from '@/components/custom/custom-slug-field';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { SlugifyOptions } from '@/lib/utils/slug';
import {
  EMPTY_JOB_POST_FORM,
  JOB_POST_STATUS_LABELS,
  JOB_POST_STATUSES,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  type ApprovedVacancyOption,
  type JobPostFormValues,
  type JobPostPayload,
  type JobPostRecord,
  type VacancySelectOption
} from '@/types/recruitment';
import type { JobPostFormMode } from './job-posts-ui-context';

type SheetJobPostFormProps = {
  open: boolean;
  mode: JobPostFormMode;
  record: JobPostRecord | null;
  prefillVacancyIds?: string[];
  departmentOptions: VacancySelectOption[];
  designationOptions: VacancySelectOption[];
  approvedVacancies: ApprovedVacancyOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const jobPostSlugifyOptions: SlugifyOptions = { fallback: 'job-post' };

const validationSchema = Yup.object({
  linkedVacancyRequestIds: Yup.array().of(Yup.string()),
  jobTitle: Yup.string().trim().required('Job title is required'),
  slug: Yup.string().trim(),
  shortDescription: Yup.string().trim(),
  departmentId: Yup.string(),
  designationId: Yup.string().required('Designation is required'),
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

const employmentTypeOptions = VACANCY_EMPLOYMENT_TYPES.map((id) => ({
  id,
  name: VACANCY_EMPLOYMENT_TYPE_LABELS[id]
}));

const statusOptions = JOB_POST_STATUSES.map((id) => ({
  id,
  name: JOB_POST_STATUS_LABELS[id]
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
    linkedVacancyRequestIds: asDuplicate
      ? []
      : [...record.linkedVacancyRequestIds],
    jobTitle: asDuplicate ? `${record.jobTitle} (Copy)` : record.jobTitle,
    slug: asDuplicate ? '' : record.slug,
    shortDescription: record.shortDescription,
    departmentId: record.departmentId ?? '',
    designationId: record.designationId,
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

function firstErrorMessage(errors: unknown): string {
  if (!errors || typeof errors !== 'object') {
    return 'Something went wrong. Please try again later';
  }
  const record = errors as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message) {
    return record.message;
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string' && value) return value;
  }
  return 'Something went wrong. Please try again later';
}

function mergeUniqueSkills(rows: ApprovedVacancyOption[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const row of rows) {
    for (const skill of row.skills ?? []) {
      const trimmed = skill.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(trimmed);
    }
  }
  return merged;
}

function applyVacancyPrefill(
  values: JobPostFormValues,
  selectedIds: string[],
  options: ApprovedVacancyOption[]
): JobPostFormValues {
  const selected = options.filter((o) => selectedIds.includes(o.id));
  if (!selected.length) {
    return { ...values, linkedVacancyRequestIds: selectedIds };
  }

  const designationId = selected[0]!.designationId;
  const employmentType = selected[0]!.employmentType;
  const openings = String(
    selected.reduce((sum, row) => sum + row.openings, 0)
  );
  const vacancySkills = mergeUniqueSkills(selected);

  return {
    ...values,
    linkedVacancyRequestIds: selectedIds,
    designationId,
    employmentType,
    openings,
    departmentId: selected.length === 1 ? selected[0]!.departmentId : '',
    jobTitle: values.jobTitle || selected[0]!.designationName,
    skills: vacancySkills.length ? vacancySkills : values.skills
  };
}

export default function SheetJobPostForm({
  open,
  mode,
  record,
  prefillVacancyIds,
  departmentOptions,
  designationOptions,
  approvedVacancies,
  onOpenChange
}: SheetJobPostFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const vacancyOptionsForEdit = useMemo(() => {
    if (mode !== 'edit' || !record) return approvedVacancies;
    const missing = record.linkedVacancies
      .filter(
        (link) => !approvedVacancies.some((o) => o.id === link.vacancyRequestId)
      )
      .map((link) => ({
        id: link.vacancyRequestId,
        name: `${link.requestId} — ${record.designation} (${link.departmentName})`,
        requestId: link.requestId,
        designationId: record.designationId,
        designationName: record.designation,
        departmentId: link.departmentId,
        departmentName: link.departmentName,
        employmentType: record.employmentType,
        openings: link.openings,
        skills: [] as string[]
      }));
    return [...approvedVacancies, ...missing];
  }, [approvedVacancies, mode, record]);

  const multiSelectOptions = vacancyOptionsForEdit.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = useMemo(() => {
    if (mode === 'create') {
      const base = { ...EMPTY_JOB_POST_FORM };
      if (prefillVacancyIds?.length) {
        return applyVacancyPrefill(base, prefillVacancyIds, approvedVacancies);
      }
      return base;
    }
    if (mode === 'duplicate') return recordToFormValues(record, true);
    return recordToFormValues(record);
  }, [mode, record, prefillVacancyIds, approvedVacancies]);

  const title =
    mode === 'edit'
      ? `Edit ${record?.jobPostId ?? 'Job Post'}`
      : mode === 'duplicate'
        ? `Duplicate ${record?.jobPostId ?? 'Job Post'}`
        : 'Create Job Post';

  const description =
    mode === 'edit'
      ? 'Update job post details for recruitment.'
      : 'Link one or more approved vacancy requests (same designation) to combine openings.';

  const handleClose = () => onOpenChange(false);

  useEffect(() => {
    if (!open && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('prefillVacancyId')) {
        url.searchParams.delete('prefillVacancyId');
        router.replace(url.pathname + (url.search ? url.search : ''));
      }
    }
  }, [open, router]);

  const handleSubmit = async (
    values: JobPostFormValues,
    _helpers: FormikHelpers<JobPostFormValues>
  ) => {
    setSaving(true);
    try {
      const payload: JobPostPayload = {
        linkedVacancyRequestIds: values.linkedVacancyRequestIds,
        jobTitle: values.jobTitle,
        slug: values.slug,
        shortDescription: values.shortDescription,
        departmentId: values.departmentId || undefined,
        designationId: values.designationId,
        jobDescription: values.jobDescription,
        responsibilities: values.responsibilities,
        qualifications: values.qualifications,
        experience: values.experience,
        skills: values.skills,
        employmentType: values.employmentType,
        salaryInformation: values.salaryInformation,
        openings: values.openings,
        closingDate: values.closingDate,
        applicationInstructions: values.applicationInstructions,
        status: values.status
      };

      const result =
        mode === 'edit' && record
          ? await updateJobPostAction(record.id, payload)
          : await createJobPostAction(payload);

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: firstErrorMessage(result.errors)
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Saved',
        description: 'Job post saved successfully.'
      });
      handleClose();
      router.refresh();
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
          key={`${mode}-${record?.id ?? 'new'}-${(prefillVacancyIds ?? []).join(',')}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomMultiSelect
                  id="linkedVacancyRequestIds"
                  placeholder="Linked Vacancy Requests"
                  value={formik.values.linkedVacancyRequestIds}
                  onChange={(ids) => {
                    const next = applyVacancyPrefill(
                      formik.values,
                      ids,
                      vacancyOptionsForEdit
                    );
                    void formik.setValues(next);
                  }}
                  required={false}
                  options={multiSelectOptions}
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

                <CustomSlugField
                  id="slug"
                  placeholder="Slug (careers URL)"
                  value={formik.values.slug}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  sourceValue={formik.values.jobTitle}
                  onSlugChange={(slug) =>
                    void formik.setFieldValue('slug', slug)
                  }
                  required={false}
                  styleClasses={fieldStyleClasses}
                  slugifyOptions={jobPostSlugifyOptions}
                />

                <CustomFormField
                  id="shortDescription"
                  type="textarea"
                  placeholder="Short Description"
                  value={formik.values.shortDescription}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="departmentId"
                    placeholder="Primary Department"
                    value={formik.values.departmentId || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('departmentId', value)
                    }
                    required={false}
                    options={departmentOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="designationId"
                    placeholder="Designation"
                    value={formik.values.designationId || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('designationId', value)
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
