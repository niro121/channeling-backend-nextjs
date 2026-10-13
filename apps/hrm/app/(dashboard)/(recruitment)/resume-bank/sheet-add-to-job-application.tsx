'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { FilePlus2, X } from 'lucide-react';
import {
  Button,
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
import { createApplicationAction } from '@/app/actions/recruitment-actions/application.actions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  EMPTY_ADD_TO_JOB_FORM,
  type AddToJobApplicationFormValues,
  type ResumeBankRecord,
  type VacancySelectOption
} from '@/types/recruitment';

type SheetAddToJobApplicationProps = {
  open: boolean;
  record: ResumeBankRecord | null;
  jobPostOptions: VacancySelectOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  candidateName: Yup.string().required('Candidate is required'),
  jobPostId: Yup.string().required('Job post is required')
});

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

export default function SheetAddToJobApplication({
  open,
  record,
  jobPostOptions,
  onOpenChange
}: SheetAddToJobApplicationProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const initialValues = useMemo<AddToJobApplicationFormValues>(() => {
    if (!record) return EMPTY_ADD_TO_JOB_FORM;
    return {
      ...EMPTY_ADD_TO_JOB_FORM,
      candidateName: record.candidateName
    };
  }, [record]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    values: AddToJobApplicationFormValues,
    _helpers: FormikHelpers<AddToJobApplicationFormValues>
  ) => {
    if (!record) return;
    setSaving(true);
    try {
      const result = await createApplicationAction({
        candidateName: record.candidateName,
        candidateEmail: record.email,
        candidatePhone: record.phone,
        experienceYears: record.experienceYears,
        jobPostId: values.jobPostId,
        source: 'resume_bank',
        notes: record.notes,
        resumeFileName: record.resumeFileName,
        resumeFileKey: record.resumeFileKey ?? null,
        resumeBankProfileId: record.id
      });

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Create failed',
          description: firstErrorMessage(result.errors)
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Application created',
        description: result.data?.applicationId
          ? `${result.data.applicationId} linked from resume bank.`
          : 'Application created from resume bank.'
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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>Add to Job Application</SheetTitle>
          <SheetDescription>
            Create an application for this candidate on a published job post.
          </SheetDescription>
        </SheetHeader>

        <Formik
          key={record?.id ?? 'add-to-job'}
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
                  placeholder="Candidate"
                  value={formik.values.candidateName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  disabled
                  styleClasses={fieldStyleClasses}
                />

                <CustomSelectField
                  id="jobPostId"
                  placeholder="Job Post"
                  value={formik.values.jobPostId || undefined}
                  onChange={(value) =>
                    void formik.setFieldValue('jobPostId', value)
                  }
                  required
                  options={jobPostOptions}
                  styleClasses={fieldStyleClasses}
                />

                {!jobPostOptions.length ? (
                  <p className="text-sm text-muted-foreground">
                    No published job posts available. Publish a job post first.
                  </p>
                ) : null}
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
                  <FilePlus2 className="h-4 w-4" />
                  {saving ? 'Creating…' : 'Create Application'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
