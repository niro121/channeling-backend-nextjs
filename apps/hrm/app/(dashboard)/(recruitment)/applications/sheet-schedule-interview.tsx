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
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  EMPTY_SCHEDULE_INTERVIEW_FORM,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPES,
  type ApplicationRecord,
  type ScheduleInterviewFormValues,
  type VacancySelectOption
} from '@/types/recruitment';

type SheetScheduleInterviewProps = {
  open: boolean;
  record: ApplicationRecord | null;
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
  jobPostId: Yup.string().required('Job position is required'),
  interviewType: Yup.string().required('Interview type is required'),
  interviewDate: Yup.date().nullable().required('Interview date is required'),
  startTime: Yup.string().required('Start time is required'),
  endTime: Yup.string().required('End time is required'),
  interviewerPanel: Yup.string()
    .trim()
    .required('Interviewer / panel is required'),
  location: Yup.string().trim(),
  notesToCandidate: Yup.string().trim()
});

const interviewTypeOptions = INTERVIEW_TYPES.map((id) => ({
  id,
  name: INTERVIEW_TYPE_LABELS[id]
}));

export default function SheetScheduleInterview({
  open,
  record,
  jobPostOptions,
  onOpenChange
}: SheetScheduleInterviewProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const jobPositionOptions = useMemo(() => {
    const options = [...jobPostOptions];
    if (
      record?.jobPostId &&
      !options.some((item) => item.id === record.jobPostId)
    ) {
      options.unshift({
        id: record.jobPostId,
        name: `${record.jobPostCode || record.jobPostId} — ${record.jobTitle}`
      });
    }
    return options;
  }, [jobPostOptions, record]);

  const initialValues = useMemo<ScheduleInterviewFormValues>(() => {
    if (!record) return EMPTY_SCHEDULE_INTERVIEW_FORM;
    return {
      ...EMPTY_SCHEDULE_INTERVIEW_FORM,
      candidateName: record.candidateName,
      jobPostId: record.jobPostId
    };
  }, [record]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    _values: ScheduleInterviewFormValues,
    _helpers: FormikHelpers<ScheduleInterviewFormValues>
  ) => {
    setSaving(true);
    try {
      toast({
        variant: 'default',
        title: 'Interview Schedule next',
        description:
          'Interview create will be available in Wave 6 (Interview Schedule).'
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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>Schedule Interview</SheetTitle>
          <SheetDescription>
            {record
              ? `Schedule an interview for ${record.candidateName} (${record.applicationId}).`
              : 'Schedule an interview for this candidate.'}
          </SheetDescription>
        </SheetHeader>

        <Formik
          key={record?.id ?? 'schedule'}
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
                  required
                  disabled
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="jobPostId"
                    placeholder="Job Position"
                    value={formik.values.jobPostId || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('jobPostId', value)
                    }
                    required
                    options={jobPositionOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="interviewType"
                    placeholder="Interview Type"
                    value={formik.values.interviewType || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('interviewType', value)
                    }
                    required
                    options={interviewTypeOptions}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <CustomDatePickerField
                    id="interviewDate"
                    placeholder="Interview Date"
                    value={formik.values.interviewDate}
                    onChange={(date) =>
                      void formik.setFieldValue('interviewDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="startTime"
                    type="time"
                    placeholder="Start Time"
                    value={formik.values.startTime}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="endTime"
                    type="time"
                    placeholder="End Time"
                    value={formik.values.endTime}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="interviewerPanel"
                  type="text"
                  placeholder="Interviewer / Panel"
                  value={formik.values.interviewerPanel}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="location"
                  type="text"
                  placeholder="Location / Meeting Link"
                  value={formik.values.location}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="notesToCandidate"
                  type="textarea"
                  placeholder="Notes to Candidate"
                  value={formik.values.notesToCandidate}
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
                  {saving ? 'Scheduling…' : 'Schedule'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
