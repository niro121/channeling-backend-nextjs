'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Save, X } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomFormField,
  CustomSelectField,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import {
  createResumeBankProfileAction,
  updateResumeBankProfileAction
} from '@/app/actions/recruitment-actions/resume-bank.actions';
import { BadgeInput } from '@/components/custom/badge-input';
import { CustomFileUpload } from '@/components/custom/custom-file-upload';
import { commitPendingUpload } from '@/lib/helpers/s3';
import { buttonStyles } from '@/lib/utils/common-styles';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCES,
  EMPTY_RESUME_BANK_FORM,
  RESUME_BANK_STATUS_LABELS,
  RESUME_BANK_STATUSES,
  type ResumeBankFormValues,
  type ResumeBankPayload,
  type ResumeBankRecord,
  type VacancySelectOption
} from '@/types/recruitment';
import type { ResumeBankFormMode } from './resume-bank-ui-context';

type SheetResumeBankFormProps = {
  open: boolean;
  mode: ResumeBankFormMode;
  record: ResumeBankRecord | null;
  departmentOptions: VacancySelectOption[];
  designationOptions: VacancySelectOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  candidateName: Yup.string().trim().required('Candidate name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  phone: Yup.string()
    .trim()
    .test(
      'mobile',
      'Mobile Number Ex: 07x xxxxxxx',
      (v) => !v || MOBILE_NUMBER_REGEX.test(v)
    ),
  qualifications: Yup.string().trim(),
  experienceYears: Yup.string()
    .required('Experience is required')
    .test('years', 'Enter a whole number of 0 or more', (value) => {
      if (value == null || value === '') return false;
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 && n <= 60;
    }),
  skills: Yup.array().of(Yup.string()),
  preferredPosition: Yup.string().trim(),
  preferredDepartment: Yup.string().trim(),
  location: Yup.string().trim(),
  source: Yup.string().required('Source is required'),
  status: Yup.string().required('Status is required'),
  notes: Yup.string().trim(),
  resumeFileName: Yup.string().trim(),
  resumeFileKey: Yup.string().nullable()
});

const sourceOptions = APPLICATION_SOURCES.map((id) => ({
  id,
  name: APPLICATION_SOURCE_LABELS[id]
}));

const statusOptions = RESUME_BANK_STATUSES.map((id) => ({
  id,
  name: RESUME_BANK_STATUS_LABELS[id]
}));

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

function recordToFormValues(
  record: ResumeBankRecord | null
): ResumeBankFormValues {
  if (!record) return EMPTY_RESUME_BANK_FORM;
  return {
    candidateName: record.candidateName,
    email: record.email,
    phone: record.phone,
    qualifications: record.qualifications,
    experienceYears: String(record.experienceYears),
    skills: [...record.skills],
    preferredPosition: record.preferredPosition,
    preferredDepartment: record.preferredDepartment,
    location: record.location,
    source: record.source,
    status: record.status,
    notes: record.notes,
    resumeFileName: record.resumeFileName,
    resumeFileKey: record.resumeFileKey ?? null
  };
}

export default function SheetResumeBankForm({
  open,
  mode,
  record,
  departmentOptions,
  designationOptions,
  onOpenChange
}: SheetResumeBankFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(
    null
  );

  const initialValues = useMemo(
    () => recordToFormValues(mode === 'edit' ? record : null),
    [mode, record]
  );

  const departmentComboboxOptions = useMemo(() => {
    const options = [...departmentOptions];
    const current = initialValues.preferredDepartment?.trim();
    if (
      current &&
      !options.some(
        (item) => item.id === current || item.name === current
      )
    ) {
      options.unshift({ id: current, name: current });
    }
    return options;
  }, [departmentOptions, initialValues.preferredDepartment]);

  const designationComboboxOptions = useMemo(() => {
    const options = [...designationOptions];
    const current = initialValues.preferredPosition?.trim();
    if (
      current &&
      !options.some(
        (item) => item.id === current || item.name === current
      )
    ) {
      options.unshift({ id: current, name: current });
    }
    return options;
  }, [designationOptions, initialValues.preferredPosition]);

  useEffect(() => {
    if (!open) {
      setPendingResumeFile(null);
      return;
    }
    setPendingResumeFile(null);
  }, [open, mode, record?.id]);

  const title =
    mode === 'edit'
      ? `Edit ${record?.profileId ?? 'Profile'}`
      : 'Add Candidate Profile';

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    values: ResumeBankFormValues,
    _helpers: FormikHelpers<ResumeBankFormValues>
  ) => {
    setSaving(true);
    try {
      let resumeFileName = values.resumeFileName;
      let resumeFileKey = values.resumeFileKey;

      if (pendingResumeFile) {
        const uploaded = await commitPendingUpload({
          file: pendingResumeFile,
          prefixKind: 'resumes',
          keySegments: [
            record?.profileId || 'new',
            crypto.randomUUID()
          ]
        });

        if (!uploaded.success) {
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: uploaded.error
          });
          return;
        }

        resumeFileName = uploaded.fileName;
        resumeFileKey = uploaded.fileKey;
      }

      const payload: ResumeBankPayload = {
        candidateName: values.candidateName,
        email: values.email,
        phone: values.phone,
        qualifications: values.qualifications,
        experienceYears: values.experienceYears,
        skills: values.skills,
        preferredPosition: values.preferredPosition,
        preferredDepartment: values.preferredDepartment,
        location: values.location,
        source: values.source,
        status: values.status,
        notes: values.notes,
        resumeFileName,
        resumeFileKey
      };

      const result =
        mode === 'edit' && record
          ? await updateResumeBankProfileAction(record.id, payload)
          : await createResumeBankProfileAction(payload);

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
        description: 'Candidate profile saved successfully.'
      });
      setPendingResumeFile(null);
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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Store candidate contact details, skills and preferred role in the
            resume bank.
          </SheetDescription>
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
                <CustomFormField
                  id="candidateName"
                  type="text"
                  placeholder="Candidate Name"
                  value={formik.values.candidateName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="phone"
                    type="text"
                    placeholder="Phone"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="qualifications"
                    type="text"
                    placeholder="Qualifications"
                    value={formik.values.qualifications}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="experienceYears"
                    type="number"
                    placeholder="Experience (years)"
                    value={formik.values.experienceYears}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    max={60}
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label
                      htmlFor="preferredPosition"
                      className={fieldStyleClasses.labelClassName}
                    >
                      Preferred Position
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Preferred Position"
                        options={designationComboboxOptions}
                        value={formik.values.preferredPosition || ''}
                        defaultValue=""
                        onChange={(value) => {
                          void formik.setFieldValue(
                            'preferredPosition',
                            value
                          );
                          void formik.setFieldTouched(
                            'preferredPosition',
                            true
                          );
                        }}
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                      />
                    </div>
                  </div>
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label
                      htmlFor="preferredDepartment"
                      className={fieldStyleClasses.labelClassName}
                    >
                      Preferred Department
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Preferred Department"
                        options={departmentComboboxOptions}
                        value={formik.values.preferredDepartment || ''}
                        defaultValue=""
                        onChange={(value) => {
                          void formik.setFieldValue(
                            'preferredDepartment',
                            value
                          );
                          void formik.setFieldTouched(
                            'preferredDepartment',
                            true
                          );
                        }}
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                      />
                    </div>
                  </div>
                </div>

                <CustomFormField
                  id="location"
                  type="text"
                  placeholder="Location"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="source"
                    placeholder="Source"
                    value={formik.values.source || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('source', value)
                    }
                    required
                    options={sourceOptions}
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

                <CustomFileUpload
                  id="resumeFile"
                  label="Resume / CV"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  fileKey={formik.values.resumeFileKey}
                  fileName={formik.values.resumeFileName}
                  pendingFile={pendingResumeFile}
                  disabled={saving}
                  hint="PDF or image. Uploads to storage when you save."
                  styleClasses={fieldStyleClasses}
                  onChange={(next) => {
                    setPendingResumeFile(next.pendingFile);
                    void formik.setFieldValue(
                      'resumeFileName',
                      next.fileName
                    );
                    void formik.setFieldValue(
                      'resumeFileKey',
                      next.fileKey
                    );
                  }}
                />

                <CustomFormField
                  id="notes"
                  type="textarea"
                  placeholder="Notes"
                  value={formik.values.notes}
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
