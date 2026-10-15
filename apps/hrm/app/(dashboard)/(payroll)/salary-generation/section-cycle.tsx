'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  CustomDatePickerField,
  Label
} from '@archmage/ui';
import type { SalaryGenerationCycleFormValues } from '@/types/payroll';
import type { SalaryCycleOption } from '@/types/salary-cycle';

const fieldStyleClasses = {
  parentDiv: 'space-y-1.5',
  labelClassName:
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  salaryCycleId: Yup.string().required('Salary cycle is required'),
  salaryFromDate: Yup.date().nullable().required('Salary from date is required'),
  salaryToDate: Yup.date()
    .nullable()
    .required('Salary to date is required')
    .min(
      Yup.ref('salaryFromDate'),
      'Salary to date must be on or after salary from date'
    ),
  workedFromDate: Yup.date().nullable().required('Worked from date is required'),
  workedToDate: Yup.date()
    .nullable()
    .required('Worked to date is required')
    .min(
      Yup.ref('workedFromDate'),
      'Worked to date must be on or after worked from date'
    )
});

type SectionCycleProps = {
  cycleOptions: SalaryCycleOption[];
  initialValues: SalaryGenerationCycleFormValues;
  formKey: string;
  onValuesChange: (values: SalaryGenerationCycleFormValues) => void;
};

function formatSummaryDate(value: Date | null): string {
  if (!value) return '—';
  return format(value, 'dd MMMM yyyy');
}

function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function SectionCycle({
  cycleOptions,
  initialValues,
  formKey,
  onValuesChange
}: SectionCycleProps) {
  const comboboxOptions = cycleOptions.map((item) => ({
    id: item.id,
    name: item.name
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Salary Cycle</CardTitle>
      </CardHeader>
      <CardContent>
        <Formik
          key={formKey}
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={() => undefined}
        >
          {(formik) => {
            const applyCycleDefaults = (cycleId: string) => {
              const selected = cycleOptions.find((item) => item.id === cycleId);
              const next: SalaryGenerationCycleFormValues = {
                salaryCycleId: cycleId,
                salaryFromDate: parseIsoDate(selected?.salaryFromDate),
                salaryToDate: parseIsoDate(selected?.salaryToDate),
                workedFromDate: parseIsoDate(selected?.workedFromDate),
                workedToDate: parseIsoDate(selected?.workedToDate)
              };
              void formik.setValues(next);
              onValuesChange(next);
            };

            return (
              <Form className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Salary Cycle
                      <span className="text-red-600"> *</span>
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Select salary cycle"
                        options={comboboxOptions}
                        value={formik.values.salaryCycleId}
                        defaultValue=""
                        onChange={(value) => applyCycleDefaults(value)}
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                      />
                    </div>
                    {formik.touched.salaryCycleId &&
                    formik.errors.salaryCycleId ? (
                      <p className="text-sm text-red-600">
                        {formik.errors.salaryCycleId}
                      </p>
                    ) : null}
                  </div>

                  <CustomDatePickerField
                    id="salaryFromDate"
                    placeholder="Salary From Date"
                    required
                    value={formik.values.salaryFromDate}
                    onChange={(value) => {
                      void formik.setFieldValue('salaryFromDate', value ?? null);
                      onValuesChange({
                        ...formik.values,
                        salaryFromDate: value ?? null
                      });
                    }}
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError
                  />

                  <CustomDatePickerField
                    id="salaryToDate"
                    placeholder="Salary To Date"
                    required
                    value={formik.values.salaryToDate}
                    onChange={(value) => {
                      void formik.setFieldValue('salaryToDate', value ?? null);
                      onValuesChange({
                        ...formik.values,
                        salaryToDate: value ?? null
                      });
                    }}
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError
                  />

                  <CustomDatePickerField
                    id="workedFromDate"
                    placeholder="Worked From Date"
                    required
                    value={formik.values.workedFromDate}
                    onChange={(value) => {
                      void formik.setFieldValue('workedFromDate', value ?? null);
                      onValuesChange({
                        ...formik.values,
                        workedFromDate: value ?? null
                      });
                    }}
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError
                  />

                  <CustomDatePickerField
                    id="workedToDate"
                    placeholder="Worked To Date"
                    required
                    value={formik.values.workedToDate}
                    onChange={(value) => {
                      void formik.setFieldValue('workedToDate', value ?? null);
                      onValuesChange({
                        ...formik.values,
                        workedToDate: value ?? null
                      });
                    }}
                    onBlur={formik.handleBlur}
                    styleClasses={fieldStyleClasses}
                    useFormikError
                  />
                </div>

                <div className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-foreground">
                      Salary From Date:{' '}
                    </span>
                    <span className="text-muted-foreground">
                      {formatSummaryDate(formik.values.salaryFromDate)}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Salary To Date:{' '}
                    </span>
                    <span className="text-muted-foreground">
                      {formatSummaryDate(formik.values.salaryToDate)}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Worked From Date:{' '}
                    </span>
                    <span className="text-muted-foreground">
                      {formatSummaryDate(formik.values.workedFromDate)}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Worked To Date:{' '}
                    </span>
                    <span className="text-muted-foreground">
                      {formatSummaryDate(formik.values.workedToDate)}
                    </span>
                  </p>
                </div>
              </Form>
            );
          }}
        </Formik>
      </CardContent>
    </Card>
  );
}
