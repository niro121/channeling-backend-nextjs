'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
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
import {
  createAppointmentLetterAction,
  updateAppointmentLetterAction
} from '@/app/actions/recruitment-actions/appointment-letter.actions';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  EMPTY_APPOINTMENT_LETTER_FORM,
  PROBATION_PERIOD_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  type AppointmentLetterFormValues,
  type AppointmentLetterRecord,
  type VacancySelectOption
} from '@/types/recruitment';
import type { AppointmentLetterFormMode } from './appointment-letters-ui-context';

type SheetAppointmentLetterFormProps = {
  open: boolean;
  mode: AppointmentLetterFormMode;
  record: AppointmentLetterRecord | null;
  evaluationOptions?: VacancySelectOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  evaluationId: Yup.string().required('Candidate is required'),
  position: Yup.string().required('Position is required'),
  department: Yup.string().required('Department is required'),
  employmentType: Yup.string().required('Employment type is required'),
  salary: Yup.string().trim().required('Salary is required'),
  reportingDate: Yup.date()
    .nullable()
    .required('Reporting date is required'),
  reportingLocation: Yup.string().trim(),
  reportingManager: Yup.string().trim(),
  probationPeriod: Yup.string(),
  letterDate: Yup.date().nullable().required('Letter date is required'),
  benefits: Yup.string().trim(),
  termsAndConditions: Yup.string().trim()
});

const employmentTypeOptions = VACANCY_EMPLOYMENT_TYPES.map((id) => ({
  id,
  name: VACANCY_EMPLOYMENT_TYPE_LABELS[id]
}));

const probationOptions = PROBATION_PERIOD_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

function toYmd(date: Date | null): string {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

export default function SheetAppointmentLetterForm({
  open,
  mode,
  record,
  evaluationOptions = [],
  onOpenChange
}: SheetAppointmentLetterFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isEdit = mode === 'edit';

  const candidateOptions = useMemo(() => {
    const opts = [...evaluationOptions];
    if (
      record?.evaluationId &&
      !opts.some((o) => o.id === record.evaluationId)
    ) {
      opts.unshift({
        id: record.evaluationId,
        name: `${record.candidateName} · ${record.position || record.evaluationCode}`
      });
    }
    return opts;
  }, [evaluationOptions, record]);

  const initialValues = useMemo<AppointmentLetterFormValues>(() => {
    if (!record) return EMPTY_APPOINTMENT_LETTER_FORM;
    return {
      evaluationId: record.evaluationId,
      candidateName: record.candidateName,
      position: record.position,
      department: record.department,
      employmentType: record.employmentType,
      salary: record.salary,
      reportingDate: record.appointmentDate
        ? parseISO(record.appointmentDate)
        : null,
      reportingLocation: record.reportingLocation,
      reportingManager: record.reportingManager,
      probationPeriod: record.probationPeriod,
      letterDate: record.letterDate ? parseISO(record.letterDate) : null,
      benefits: record.benefits,
      termsAndConditions: record.termsAndConditions
    };
  }, [record]);

  const handleClose = () => onOpenChange(false);

  const handleSubmit = async (
    values: AppointmentLetterFormValues,
    _helpers: FormikHelpers<AppointmentLetterFormValues>
  ) => {
    if (!isEdit && !values.evaluationId) {
      toast({
        variant: 'destructive',
        title: 'Candidate required',
        description: 'Select a submitted evaluation candidate.'
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        position: values.position,
        department: values.department,
        employmentType: values.employmentType,
        salary: values.salary,
        appointmentDate: toYmd(values.reportingDate),
        letterDate: toYmd(values.letterDate),
        reportingLocation: values.reportingLocation,
        reportingManager: values.reportingManager,
        probationPeriod: values.probationPeriod,
        benefits: values.benefits,
        termsAndConditions: values.termsAndConditions
      };

      const result = isEdit
        ? await updateAppointmentLetterAction(record!.id, payload)
        : await createAppointmentLetterAction({
            evaluationId: values.evaluationId,
            ...payload
          });

      if (result.isError) {
        const message =
          typeof result.errors === 'object' &&
          result.errors &&
          'message' in result.errors
            ? String((result.errors as { message?: string }).message ?? '')
            : '';
        toast({
          variant: 'destructive',
          title: isEdit ? 'Could not update' : 'Could not save draft',
          description: message || 'Please try again.'
        });
        return;
      }

      const letterNo =
        result.data?.letterNumber ??
        result.data?.record?.letterNumber ??
        record?.letterNumber;
      toast({
        variant: 'success',
        title: isEdit ? 'Letter updated' : 'Draft saved',
        description: letterNo
          ? `${letterNo} saved.`
          : 'Appointment letter saved.'
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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>
            {isEdit
              ? `Edit ${record?.letterNumber ?? 'Letter'}`
              : 'Create Appointment Letter'}
          </SheetTitle>
          <SheetDescription>
            Generate, approve and issue appointment letters to selected
            candidates.
          </SheetDescription>
        </SheetHeader>

        <Formik
          key={`${mode}-${record?.id ?? record?.evaluationId ?? 'create'}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomSelectField
                  id="evaluationId"
                  placeholder="Candidate (from Evaluation)"
                  value={formik.values.evaluationId || undefined}
                  onChange={(value) => {
                    void formik.setFieldValue('evaluationId', value);
                    const opt = candidateOptions.find((o) => o.id === value);
                    if (opt) {
                      const [name, pos] = opt.name.split(' · ');
                      void formik.setFieldValue('candidateName', name ?? '');
                      if (pos && !formik.values.position) {
                        void formik.setFieldValue('position', pos);
                      }
                    }
                  }}
                  required
                  disabled={isEdit}
                  options={candidateOptions}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomFormField
                    id="position"
                    type="text"
                    placeholder="Position"
                    value={formik.values.position}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="department"
                    type="text"
                    placeholder="Department"
                    value={formik.values.department}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

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
                    id="salary"
                    type="text"
                    placeholder="Salary"
                    value={formik.values.salary}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomDatePickerField
                    id="reportingDate"
                    placeholder="Reporting Date"
                    value={formik.values.reportingDate}
                    onChange={(date) =>
                      void formik.setFieldValue('reportingDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="letterDate"
                    placeholder="Letter Date"
                    value={formik.values.letterDate}
                    onChange={(date) =>
                      void formik.setFieldValue('letterDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="reportingLocation"
                  type="text"
                  placeholder="Reporting Location"
                  value={formik.values.reportingLocation}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="reportingManager"
                  type="text"
                  placeholder="Reporting Manager"
                  value={formik.values.reportingManager}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomSelectField
                  id="probationPeriod"
                  placeholder="Probation Period"
                  value={formik.values.probationPeriod || undefined}
                  onChange={(value) =>
                    void formik.setFieldValue('probationPeriod', value)
                  }
                  required={false}
                  options={probationOptions}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="benefits"
                  type="textarea"
                  placeholder="Benefits (Where Applicable)"
                  value={formik.values.benefits}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomFormField
                  id="termsAndConditions"
                  type="textarea"
                  placeholder="Terms and Conditions"
                  value={formik.values.termsAndConditions}
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
                  {saving ? 'Saving…' : 'Save Draft'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
