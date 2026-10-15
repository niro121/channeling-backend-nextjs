'use client';

import { useMemo, useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { SaveIcon } from 'lucide-react';
import { Button, CustomFormField, useToast } from '@archmage/ui';
import { saveStatutoryRatesAction } from '@/app/actions/hr-admin-actions/hrm-variable.actions';
import {
  ratesToFormValues,
  type HrmStatutoryRatesFormValues
} from '@/types/hrm-variable';
import { useHrmVariableUi } from './hrm-variable-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full pr-8'
};

const rateField = Yup.string()
  .required('Required')
  .test('rate', 'Enter a rate between 0 and 100', (value) => {
    if (value == null || value.trim() === '') return false;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  });

const validationSchema = Yup.object({
  epfEmployee: rateField,
  epfCompany: rateField,
  etfEmployee: rateField,
  etfCompany: rateField
});

function formatAuditLine(
  name?: string,
  role?: string,
  at?: string | null
): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = role ? `${name} (${role})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

function applyFieldErrors(
  helpers: FormikHelpers<HrmStatutoryRatesFormValues>,
  errors: Record<string, unknown>
) {
  if (!errors || typeof errors !== 'object' || 'message' in errors) return;
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value) && value[0]) {
      fieldErrors[key] = String(value[0]);
    }
  }
  if (Object.keys(fieldErrors).length) {
    helpers.setErrors(fieldErrors);
  }
}

const RATE_FIELDS = [
  { key: 'epfEmployee' as const, label: 'EPF Rate' },
  { key: 'epfCompany' as const, label: 'EPF Company Rate' },
  { key: 'etfEmployee' as const, label: 'ETF Rate' },
  { key: 'etfCompany' as const, label: 'ETF Company Rate' }
];

export default function SectionStatutoryRates() {
  const { toast } = useToast();
  const { record, setRecord } = useHrmVariableUi();
  const [saving, setSaving] = useState(false);

  const initialValues = useMemo(
    () => ratesToFormValues(record.rates),
    [record.rates]
  );

  const handleSubmit = async (
    values: HrmStatutoryRatesFormValues,
    helpers: FormikHelpers<HrmStatutoryRatesFormValues>
  ) => {
    setSaving(true);
    try {
      const result = await saveStatutoryRatesAction({
        epfEmployee: Number(values.epfEmployee),
        epfCompany: Number(values.epfCompany),
        etfEmployee: Number(values.etfEmployee),
        etfCompany: Number(values.etfCompany)
      });

      if (result.isError || !result.data) {
        applyFieldErrors(helpers, result.errors);
        toast({
          title: 'Could not save rates',
          description: String(
            (result.errors as { message?: string }).message ??
              'Please check the form and try again.'
          ),
          variant: 'destructive'
        });
        return;
      }

      setRecord(result.data);
      toast({
        title: 'Statutory rates saved',
        description: 'EPF / ETF rates were updated successfully.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm">
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {(formik) => (
          <Form className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Statutory Rates
              </h2>
              <Button
                type="submit"
                size="sm"
                className="h-8 gap-1.5"
                disabled={saving || formik.isSubmitting}
              >
                <SaveIcon className="h-4 w-4" />
                Save
              </Button>
            </div>

            <div className="flex-1 space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {RATE_FIELDS.map(({ key, label }) => (
                  <div key={key} className="relative">
                    <CustomFormField
                      id={key}
                      placeholder={label}
                      type="number"
                      value={formik.values[key]}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <span className="pointer-events-none absolute right-3 top-[2.05rem] text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              <p>
                Created by:{' '}
                {formatAuditLine(
                  record.createdByUser?.name,
                  record.createdByUser?.role,
                  record.createdAt
                )}
              </p>
              <p className="mt-1">
                Last updated:{' '}
                {formatAuditLine(
                  record.updatedByUser?.name,
                  record.updatedByUser?.role,
                  record.updatedAt
                )}
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
