'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Formik, type FormikHelpers, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { SaveIcon, Sparkles } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
  useToast
} from '@archmage/ui';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';
import {
  createSalaryCycleAction,
  updateSalaryCycleAction
} from '@/app/actions/hr-admin-actions/salary-cycle.actions';
import { cn } from '@/lib/utils';
import { getInstitutionName } from '@/types/institution';
import {
  buildFillDefaults,
  emptySalaryCycleFormValues,
  formatCycleLabel,
  formatCycleMonthLabel,
  formatInstitutionCycleTitle,
  formValuesToIso,
  recordToFormValues,
  type SalaryCycleFormValues,
  type SalaryCycleUiRecord
} from '@/types/salary-cycle';
import { useSalaryCycleUi } from './salary-cycle-ui-context';
import { Separator } from '@archmage/ui';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName:
    'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const dateRequired = Yup.date()
  .nullable()
  .required('Required')
  .typeError('Enter a valid date');

const dateOptional = Yup.date().nullable().typeError('Enter a valid date');

const validationSchema = Yup.object({
  salaryFromDate: dateRequired,
  salaryToDate: dateRequired.test(
    'to-after-from',
    'Must be on or after From date',
    function (value) {
      const from = this.parent.salaryFromDate as Date | null;
      if (!value || !from) return true;
      return value.getTime() >= from.getTime();
    }
  ),
  advanceFromDate: dateOptional,
  advanceToDate: dateOptional.test(
    'adv-to',
    'Must be on or after From date',
    function (value) {
      const from = this.parent.advanceFromDate as Date | null;
      if (!value || !from) return true;
      return value.getTime() >= from.getTime();
    }
  ),
  otFromDate: dateOptional,
  otToDate: dateOptional.test(
    'ot-to',
    'Must be on or after From date',
    function (value) {
      const from = this.parent.otFromDate as Date | null;
      if (!value || !from) return true;
      return value.getTime() >= from.getTime();
    }
  ),
  dayOffFromDate: dateOptional,
  dayOffToDate: dateOptional.test(
    'ph-to',
    'Must be on or after From date',
    function (value) {
      const from = this.parent.dayOffFromDate as Date | null;
      if (!value || !from) return true;
      return value.getTime() >= from.getTime();
    }
  )
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
  helpers: FormikHelpers<SalaryCycleFormValues>,
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

function FillListener({
  fillRequestId,
  selectedRecord
}: {
  fillRequestId: number;
  selectedRecord: SalaryCycleUiRecord | null;
}) {
  const { toast } = useToast();
  const formik = useFormikContext<SalaryCycleFormValues>();

  useEffect(() => {
    if (!fillRequestId) return;
    const baseDate =
      formik.values.salaryFromDate ??
      (selectedRecord ? new Date(selectedRecord.salaryFromDate) : null);
    if (!baseDate || Number.isNaN(baseDate.getTime())) {
      toast({
        variant: 'destructive',
        title: 'Set salary from date first',
        description:
          'Fill needs a salary-from month to derive advance, OT, and day-off windows.'
      });
      return;
    }
    const defaults = buildFillDefaults(baseDate);
    formik.setValues({
      ...formik.values,
      ...defaults,
      salaryFromDate:
        formik.values.salaryFromDate ?? defaults.salaryFromDate ?? null,
      salaryToDate: formik.values.salaryToDate ?? defaults.salaryToDate ?? null
    });
    toast({
      title: 'Windows filled',
      description:
        'Advance, OT, and Day-off / PH defaults applied from the salary month.'
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to fillRequestId
  }, [fillRequestId]);

  return null;
}

export default function SectionSalaryCycleDetail() {
  const { toast } = useToast();
  const {
    records,
    setRecords,
    institutionId,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    detailFormHighlight,
    fillRequestId
  } = useSalaryCycleUi();
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');
  const initialValues = useMemo<SalaryCycleFormValues>(() => {
    if (isNew || !selectedRecord) return emptySalaryCycleFormValues();
    return recordToFormValues(selectedRecord);
  }, [isNew, selectedRecord]);

  const showForm = isNew || !!selectedRecord;

  const exportRows = useMemo(() => {
    if (!selectedRecord) return [];
    return [
      {
        institution: getInstitutionName(selectedRecord.institutionId),
        salaryFrom: format(new Date(selectedRecord.salaryFromDate), 'yyyy-MM-dd'),
        salaryTo: format(new Date(selectedRecord.salaryToDate), 'yyyy-MM-dd'),
        advanceFrom: selectedRecord.advanceFromDate
          ? format(new Date(selectedRecord.advanceFromDate), 'yyyy-MM-dd')
          : '',
        advanceTo: selectedRecord.advanceToDate
          ? format(new Date(selectedRecord.advanceToDate), 'yyyy-MM-dd')
          : '',
        otFrom: selectedRecord.otFromDate
          ? format(new Date(selectedRecord.otFromDate), 'yyyy-MM-dd HH:mm')
          : '',
        otTo: selectedRecord.otToDate
          ? format(new Date(selectedRecord.otToDate), 'yyyy-MM-dd HH:mm')
          : '',
        dayOffFrom: selectedRecord.dayOffFromDate
          ? format(new Date(selectedRecord.dayOffFromDate), 'yyyy-MM-dd HH:mm')
          : '',
        dayOffTo: selectedRecord.dayOffToDate
          ? format(new Date(selectedRecord.dayOffToDate), 'yyyy-MM-dd HH:mm')
          : ''
      }
    ];
  }, [selectedRecord]);

  const handleSubmit = async (
    values: SalaryCycleFormValues,
    helpers: FormikHelpers<SalaryCycleFormValues>
  ) => {
    if (!values.salaryFromDate || !values.salaryToDate) return;
    setSaving(true);
    try {
      const iso = formValuesToIso(values);
      const payload = {
        institutionId,
        ...iso
      };

      const result = isNew
        ? await createSalaryCycleAction(payload)
        : selectedId
          ? await updateSalaryCycleAction(selectedId, payload)
          : null;

      if (!result || result.isError || !result.data) {
        if (result) applyFieldErrors(helpers, result.errors);
        toast({
          variant: 'destructive',
          title: isNew ? 'Could not create cycle' : 'Could not update cycle',
          description: String(
            (result?.errors as { message?: string } | undefined)?.message ??
              'Please check the form and try again.'
          )
        });
        return;
      }

      if (isNew) {
        setRecords((prev) => [...prev, result.data!]);
        setIsNew(false);
        setSelectedId(result.data.id);
        toast({
          title: 'Salary cycle created',
          description: 'The cycle was saved successfully.'
        });
      } else {
        setRecords((prev) =>
          prev.map((r) => (r.id === result.data!.id ? result.data! : r))
        );
        toast({
          title: 'Salary cycle updated',
          description: 'Changes were saved successfully.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const applyFill = (
    values: SalaryCycleFormValues,
    setValues: (v: SalaryCycleFormValues) => void
  ) => {
    const base = values.salaryFromDate;
    if (!base) {
      toast({
        variant: 'destructive',
        title: 'Set salary from date first',
        description: 'Fill needs a salary-from month to derive defaults.'
      });
      return;
    }
    const defaults = buildFillDefaults(base);
    setValues({
      ...values,
      ...defaults,
      salaryFromDate: values.salaryFromDate ?? defaults.salaryFromDate ?? null,
      salaryToDate: values.salaryToDate ?? defaults.salaryToDate ?? null
    });
    toast({
      title: 'Windows filled',
      description:
        'Advance, OT, and Day-off / PH defaults applied from the salary month.'
    });
  };

  return (
    <div
      id="salary-cycle-detail-form"
      className={cn(
        'flex h-full min-h-128 flex-col rounded-lg border border-primary/15 bg-card',
        detailFormHighlight && 'ring-2 ring-primary/40'
      )}
    >
      {!showForm ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Select a salary cycle or click Add Cycle.
        </div>
      ) : (
        <Formik
          key={formKey}
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => {
            const title = formatInstitutionCycleTitle(
              institutionId,
              formik.values.salaryFromDate,
              formik.values.salaryToDate
            );
            const monthLabel = formatCycleMonthLabel(
              formik.values.salaryFromDate
            );

            return (
              <Form className="flex h-full flex-col">
                <FillListener
                  fillRequestId={fillRequestId}
                  selectedRecord={selectedRecord}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 px-4 py-3">
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {title}
                  </h2>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        applyFill(formik.values, formik.setValues)
                      }
                    >
                      <Sparkles className="h-4 w-4" />
                      Fill
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={saving || formik.isSubmitting}
                    >
                      <SaveIcon className="h-4 w-4" />
                      Save
                    </Button>
                    <ExportWrapper
                      showPrintButton
                      data={exportRows}
                      serverData={async () => ({
                        success: exportRows.length > 0,
                        data: exportRows,
                        message:
                          exportRows.length === 0
                            ? 'Save the cycle before exporting'
                            : undefined
                      })}
                      columns={[
                        'Institution',
                        'Salary From',
                        'Salary To',
                        'Advance From',
                        'Advance To',
                        'OT From',
                        'OT To',
                        'Day-off From',
                        'Day-off To'
                      ]}
                      keys={[
                        'institution',
                        'salaryFrom',
                        'salaryTo',
                        'advanceFrom',
                        'advanceTo',
                        'otFrom',
                        'otTo',
                        'dayOffFrom',
                        'dayOffTo'
                      ]}
                      title={`Salary Cycle — ${formatCycleLabel(
                        formik.values.salaryFromDate,
                        formik.values.salaryToDate
                      )}`}
                      fileName="salary-cycle"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                  <div className="rounded-md border border-primary/15 bg-primary/5 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {getInstitutionName(institutionId)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cycle{' '}
                      {formatCycleLabel(
                        formik.values.salaryFromDate,
                        formik.values.salaryToDate
                      )}
                      {monthLabel ? ` — ${monthLabel}` : ''}
                    </p>
                  </div>

                  {(
                    [
                      {
                        heading: 'Salary Window',
                        fields: [
                          {
                            id: 'salaryFromDate' as const,
                            label: 'Salary From Date',
                            required: true
                          },
                          {
                            id: 'salaryToDate' as const,
                            label: 'Salary To Date',
                            required: true
                          }
                        ]
                      },
                      {
                        heading: 'Salary Advance Window',
                        fields: [
                          {
                            id: 'advanceFromDate' as const,
                            label: 'Salary Advance From Date',
                            required: false
                          },
                          {
                            id: 'advanceToDate' as const,
                            label: 'Salary Advance To Date',
                            required: false
                          }
                        ]
                      },
                      {
                        heading: 'Overtime Window',
                        fields: [
                          {
                            id: 'otFromDate' as const,
                            label: 'OT From Date',
                            required: false
                          },
                          {
                            id: 'otToDate' as const,
                            label: 'OT To Date',
                            required: false
                          }
                        ],
                        note: 'Date pickers for UI shell; time-of-day enforced at CRUD.'
                      },
                      {
                        heading: 'Day-off / PH Window',
                        fields: [
                          {
                            id: 'dayOffFromDate' as const,
                            label: 'Day Off / PH From Date',
                            required: false
                          },
                          {
                            id: 'dayOffToDate' as const,
                            label: 'Day Off / PH To Date',
                            required: false
                          }
                        ]
                      }
                    ] as const
                  ).map((section) => (
                    <section key={section.heading} className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.heading}
                      </h3>
                      <Separator />
                      <div className="grid gap-4 sm:grid-cols-2">
                        {section.fields.map((field) => (
                          <CustomDatePickerField
                            key={field.id}
                            id={field.id}
                            placeholder={field.label}
                            value={formik.values[field.id]}
                            onChange={(date) =>
                              formik.setFieldValue(field.id, date ?? null)
                            }
                            onBlur={formik.handleBlur}
                            required={field.required}
                            styleClasses={fieldStyleClasses}
                            error={
                              formik.errors[field.id] as string | undefined
                            }
                            touched={!!formik.touched[field.id]}
                            captionLayout="dropdown"
                            fromYear={2000}
                            toYear={new Date().getFullYear() + 5}
                          />
                        ))}
                      </div>
                      {'note' in section && section.note ? (
                        <p className="text-xs text-muted-foreground">
                          {section.note}
                        </p>
                      ) : null}
                    </section>
                  ))}
                </div>

                <div className="border-t border-primary/10 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                  <p>
                    Created by:{' '}
                    {formatAuditLine(
                      selectedRecord?.createdByUser?.name,
                      selectedRecord?.createdByUser?.role,
                      selectedRecord?.createdAt
                    )}
                  </p>
                  <p className="mt-1">
                    Last updated:{' '}
                    {formatAuditLine(
                      selectedRecord?.updatedByUser?.name,
                      selectedRecord?.updatedByUser?.role,
                      selectedRecord?.updatedAt
                    )}
                  </p>
                </div>
              </Form>
            );
          }}
        </Formik>
      )}
    </div>
  );
}
