'use client';

import { useMemo, useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
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
  type InterviewRecord,
  type ScheduleInterviewFormValues
} from '@/types/recruitment';
import type { InterviewFormMode } from './interview-schedule-ui-context';
import { SAMPLE_INTERVIEW_JOB_POST_OPTIONS } from './sample-data';

type SheetInterviewFormProps = {
  open: boolean;
  mode: InterviewFormMode;
  record: InterviewRecord | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  candidateName: Yup.string().trim().required('Candidate is required'),
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

const jobPositionOptions = SAMPLE_INTERVIEW_JOB_POST_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

export default function SheetInterviewForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetInterviewFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isReschedule = mode === 'reschedule';

  const initialValues = useMemo<ScheduleInterviewFormValues>(() => {
    if (!record) return EMPTY_SCHEDULE_INTERVIEW_FORM;
    return {
      candidateName: record.candidateName,
      jobPostId: record.jobPostId,
      interviewType: record.interviewType,
      interviewDate: record.interviewDate
        ? parseISO(record.interviewDate)
        : null,
      startTime: record.startTime,
      endTime: record.endTime,
      interviewerPanel: record.interviewerPanel,
      location: record.location,
      notesToCandidate: record.notesToCandidate
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
        title: 'Not saved',
        description: isReschedule
          ? `Reschedule ${record?.interviewCode ?? ''} will be wired in the workflow phase.`
          : 'Schedule interview will be wired in the workflow phase.'
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const title = isReschedule
    ? `Reschedule ${record?.interviewCode ?? ''}`.trim()
    : 'Schedule Interview';

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
            {isReschedule
              ? `Update interview details for ${record?.candidateName ?? 'candidate'}.`
              : 'Plan a candidate interview.'}
          </SheetDescription>
        </SheetHeader>

        <Formik
          key={`${mode}-${record?.id ?? 'create'}`}
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
                  disabled={isReschedule}
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
                  {saving
                    ? isReschedule
                      ? 'Rescheduling…'
                      : 'Scheduling…'
                    : isReschedule
                      ? 'Reschedule'
                      : 'Schedule'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
