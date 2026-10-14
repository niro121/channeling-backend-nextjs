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
  EMPTY_APPOINTMENT_LETTER_FORM,
  PROBATION_PERIOD_OPTIONS,
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  type AppointmentLetterFormValues,
  type AppointmentLetterRecord
} from '@/types/recruitment';
import type { AppointmentLetterFormMode } from './appointment-letters-ui-context';
import { SAMPLE_APPOINTMENT_CANDIDATE_OPTIONS } from './sample-data';

type SheetAppointmentLetterFormProps = {
  open: boolean;
  mode: AppointmentLetterFormMode;
  record: AppointmentLetterRecord | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm font-semibold text-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  candidateName: Yup.string().required('Candidate is required'),
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

const candidateOptions = SAMPLE_APPOINTMENT_CANDIDATE_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const positionOptions = VACANCY_DESIGNATION_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const departmentOptions = VACANCY_DEPARTMENT_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

const employmentTypeOptions = VACANCY_EMPLOYMENT_TYPES.map((id) => ({
  id,
  name: VACANCY_EMPLOYMENT_TYPE_LABELS[id]
}));

const probationOptions = PROBATION_PERIOD_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name
}));

export default function SheetAppointmentLetterForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetAppointmentLetterFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isEdit = mode === 'edit';

  const initialValues = useMemo<AppointmentLetterFormValues>(() => {
    if (!record) return EMPTY_APPOINTMENT_LETTER_FORM;
    return {
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
    _values: AppointmentLetterFormValues,
    _helpers: FormikHelpers<AppointmentLetterFormValues>
  ) => {
    setSaving(true);
    try {
      toast({
        title: 'Not saved',
        description: isEdit
          ? `Update ${record?.letterNumber ?? ''} will be wired in the workflow phase.`
          : 'Save draft appointment letter will be wired in the workflow phase.'
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
          key={`${mode}-${record?.id ?? 'create'}`}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomSelectField
                  id="candidateName"
                  placeholder="Candidate"
                  value={formik.values.candidateName || undefined}
                  onChange={(value) =>
                    void formik.setFieldValue('candidateName', value)
                  }
                  required
                  options={candidateOptions}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CustomSelectField
                    id="position"
                    placeholder="Position"
                    value={formik.values.position || undefined}
                    onChange={(value) =>
                      void formik.setFieldValue('position', value)
                    }
                    required
                    options={positionOptions}
                    styleClasses={fieldStyleClasses}
                  />
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
