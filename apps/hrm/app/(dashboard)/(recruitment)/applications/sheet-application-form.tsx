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
import { createApplicationAction } from '@/app/actions/recruitment-actions/application.actions';
import { CustomFileUpload } from '@/components/custom/custom-file-upload';
import { commitPendingUpload } from '@/lib/helpers/s3';
import { buttonStyles } from '@/lib/utils/common-styles';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCES,
  EMPTY_APPLICATION_FORM,
  type ApplicationFormValues,
  type ApplicationPayload,
  type VacancySelectOption
} from '@/types/recruitment';

type SheetApplicationFormProps = {
  open: boolean;
  jobPostOptions: VacancySelectOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  candidateName: Yup.string().trim().required('Candidate name is required'),
  candidateEmail: Yup.string()
    .trim()
    .email('Enter a valid email')
    .required('Email is required'),
  candidatePhone: Yup.string()
    .trim()
    .test(
      'mobile',
      'Mobile Number Ex: 07x xxxxxxx',
      (v) => !v || MOBILE_NUMBER_REGEX.test(v)
    ),
  experienceYears: Yup.string()
    .required('Experience is required')
    .test('years', 'Enter a whole number of 0 or more', (value) => {
      if (value == null || value === '') return false;
      const n = Number(value);
      return Number.isInteger(n) && n >= 0 && n <= 60;
    }),
  jobPostId: Yup.string().required('Job post is required'),
  source: Yup.string().required('Source is required'),
  notes: Yup.string().trim(),
  resumeFileName: Yup.string().trim(),
  resumeFileKey: Yup.string().nullable()
});

const sourceOptions = APPLICATION_SOURCES.map((id) => ({
  id,
  name: APPLICATION_SOURCE_LABELS[id]
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

export default function SheetApplicationForm({
  open,
  jobPostOptions,
  onOpenChange
}: SheetApplicationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(
    null
  );

  const initialValues = useMemo(() => ({ ...EMPTY_APPLICATION_FORM }), []);

  useEffect(() => {
    if (!open) {
      setPendingResumeFile(null);
      return;
    }
    setPendingResumeFile(null);
  }, [open]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    values: ApplicationFormValues,
    _helpers: FormikHelpers<ApplicationFormValues>
  ) => {
    setSaving(true);
    try {
      let resumeFileName = values.resumeFileName;
      let resumeFileKey = values.resumeFileKey;

      if (pendingResumeFile) {
        const uploaded = await commitPendingUpload({
          file: pendingResumeFile,
          prefixKind: 'resumes',
          keySegments: ['application', 'new', crypto.randomUUID()]
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

      const payload: ApplicationPayload = {
        candidateName: values.candidateName,
        candidateEmail: values.candidateEmail,
        candidatePhone: values.candidatePhone,
        experienceYears: values.experienceYears,
        jobPostId: values.jobPostId,
        source: values.source,
        notes: values.notes,
        resumeFileName,
        resumeFileKey
      };

      const result = await createApplicationAction(payload);
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
        description: result.data?.applicationId
          ? `Application ${result.data.applicationId} created.`
          : 'Application created successfully.'
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
          <SheetTitle>New Application</SheetTitle>
          <SheetDescription>
            Manually register a candidate application against a job post.
          </SheetDescription>
        </SheetHeader>

        <Formik
          key={open ? 'open' : 'closed'}
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
                    id="candidateEmail"
                    type="email"
                    placeholder="Email"
                    value={formik.values.candidateEmail}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="candidatePhone"
                    type="text"
                    placeholder="Phone"
                    value={formik.values.candidatePhone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className={fieldStyleClasses.parentDiv}>
                  <Label
                    htmlFor="jobPostId"
                    className={fieldStyleClasses.labelClassName}
                  >
                    Job Post
                    <span className="text-red-600"> *</span>
                  </Label>
                  <div className={fieldStyleClasses.inputClassName}>
                    <Combobox
                      label="Job Post"
                      options={jobPostOptions}
                      value={formik.values.jobPostId || ''}
                      defaultValue=""
                      onChange={(value) => {
                        void formik.setFieldValue('jobPostId', value);
                        void formik.setFieldTouched('jobPostId', true);
                      }}
                      clearable
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                  disabled={saving || !jobPostOptions.length}
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
