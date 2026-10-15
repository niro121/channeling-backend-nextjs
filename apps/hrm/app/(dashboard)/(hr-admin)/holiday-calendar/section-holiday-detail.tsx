'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
import { SaveIcon, Trash2 } from 'lucide-react';
import {
  Button,
  Calendar,
  CustomAlertDialog,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { holidayTypeOptions } from '@/lib/helpers/holiday-type.helper';
import {
  emptyHolidayFormValues,
  holidayFormValuesToDateKey,
  holidayRecordToFormValues
} from '@/lib/mappers/holiday-calendar-form.mapper';
import {
  createHolidayCalendarAction,
  deleteHolidayCalendarAction,
  updateHolidayCalendarAction
} from '@/app/actions/hr-admin-actions/holiday-calendar.actions';
import type { HolidayCalendarFormValues } from '@/types/holiday-calendar';
import SectionHolidayImpact from './section-holiday-impact';
import { useHolidayCalendarUi } from './holiday-calendar-ui-context';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  typeId: Yup.string().required('Day type is required'),
  date: Yup.date().nullable().required('Holiday date is required')
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

const CALENDAR_FROM_YEAR = 2020;
const CALENDAR_TO_YEAR = 2035;

function HolidayDetailCalendar({
  selected,
  holidayDates,
  onSelect
}: {
  selected: Date | null;
  holidayDates: Date[];
  onSelect: (date: Date) => void;
}) {
  const [displayMonth, setDisplayMonth] = useState(
    () => selected ?? new Date()
  );

  useEffect(() => {
    if (selected) setDisplayMonth(selected);
  }, [selected]);

  return (
    <div className="shrink-0 lg:w-[22rem]">
      <div className="rounded-lg border border-border bg-background p-3">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          onSelect={(date) => {
            if (date) onSelect(date);
          }}
          captionLayout="dropdown"
          startMonth={new Date(CALENDAR_FROM_YEAR, 0)}
          endMonth={new Date(CALENDAR_TO_YEAR, 11)}
          modifiers={{ holiday: holidayDates }}
          modifiersClassNames={{
            holiday: 'bg-primary/10 font-semibold text-primary'
          }}
          className="mx-auto w-full [--cell-size:2.5rem] p-2"
          classNames={{
            months: 'relative flex w-full flex-col gap-5',
            month: 'flex w-full flex-col gap-5',
            month_caption: 'flex h-10 w-full items-center justify-center px-10',
            dropdowns: 'flex h-10 w-full items-center justify-center gap-2 text-sm font-medium',
            weekdays: 'flex w-full',
            weekday:
              'text-muted-foreground flex-1 select-none rounded-md text-xs font-medium py-1',
            week: 'mt-1.5 flex w-full gap-0.5',
            day: 'group/day relative aspect-square h-full w-full select-none p-0.5 text-center'
          }}
        />
      </div>
    </div>
  );
}

export default function SectionHolidayDetail() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    records,
    selectedId,
    setSelectedId,
    isNew,
    setIsNew,
    year,
    detailFormHighlight
  } = useHolidayCalendarUi();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const typeOptions = useMemo(() => holidayTypeOptions(), []);

  const formKey = isNew ? 'new' : (selectedId ?? 'empty');

  const initialValues = useMemo((): HolidayCalendarFormValues => {
    if (isNew) return emptyHolidayFormValues();
    if (selectedRecord) return holidayRecordToFormValues(selectedRecord);
    return emptyHolidayFormValues();
  }, [isNew, selectedRecord, formKey]);

  useEffect(() => {
    if (!detailFormHighlight) return;
    const timer = window.setTimeout(() => {
      document.getElementById('name')?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [detailFormHighlight, formKey]);

  const navigateAfterSave = (recordId: string, dateKey: string) => {
    const recordYear = Number.parseInt(dateKey.slice(0, 4), 10);
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', recordId);
    if (!Number.isNaN(recordYear)) {
      params.set('year', String(recordYear));
    }
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const handleSave = async (
    values: HolidayCalendarFormValues,
    helpers: FormikHelpers<HolidayCalendarFormValues>
  ) => {
    const dateKey = holidayFormValuesToDateKey(values.date);
    if (!dateKey) {
      helpers.setFieldError('date', 'Holiday date is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        typeId: values.typeId,
        date: dateKey
      };

      const result =
        isNew || !selectedRecord
          ? await createHolidayCalendarAction(payload)
          : await updateHolidayCalendarAction(selectedRecord.id, payload);

      if (result.isError || !result.data) {
        const errors = result.errors as Record<string, unknown>;
        if (errors && typeof errors === 'object' && !('message' in errors)) {
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
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description:
            (typeof errors?.message === 'string' && errors.message) ||
            (typeof (errors as any)?.date?.[0] === 'string' &&
              (errors as any).date[0]) ||
            'Unable to save holiday.'
        });
        return;
      }

      setIsNew(false);
      setSelectedId(result.data.id);
      toast({
        title: 'Saved',
        description: isNew || !selectedRecord ? 'Holiday created.' : 'Holiday updated.'
      });
      navigateAfterSave(result.data.id, dateKey);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const result = await deleteHolidayCalendarAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot delete',
          description:
            (result.errors as { message?: string })?.message ??
            'Unable to delete holiday.'
        });
        setDeleteOpen(false);
        return;
      }

      setDeleteOpen(false);
      setSelectedId(null);
      setIsNew(false);
      toast({ title: 'Deleted', description: 'Holiday removed.' });

      const params = new URLSearchParams(searchParams.toString());
      params.delete('id');
      params.set('year', String(year));
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const showEmptyState = !isNew && !selectedRecord;

  return (
    <div
      id="holiday-detail-form"
      className={cn(
        'flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card transition-all duration-300',
        detailFormHighlight && 'border-primary ring-2 ring-primary/40'
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Holiday Detail</h2>
        {!showEmptyState && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={!selectedRecord || isNew || saving}
              className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              type="submit"
              form="holiday-calendar-form"
              size="sm"
              className="h-9 gap-1.5"
              disabled={saving}
            >
              <SaveIcon className="h-4 w-4" />
              Save
            </Button>
          </div>
        )}
      </div>

      {showEmptyState ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Select a holiday from the list or click Add to create one.
        </div>
      ) : (
        <Formik
          key={formKey}
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSave}
          enableReinitialize
        >
          {(formik) => {
            const holidayDates = records.map((r) =>
              parseISO(`${r.date.slice(0, 10)}T00:00:00`)
            );

            return (
              <Form
                id="holiday-calendar-form"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:flex-row">
                  <div className="min-w-0 flex-1 space-y-4">
                    <CustomFormField
                      id="name"
                      type="text"
                      placeholder="Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomSelectField
                      id="typeId"
                      placeholder="Select Day Type"
                      value={formik.values.typeId}
                      onChange={(value) => formik.setFieldValue('typeId', value)}
                      required
                      options={typeOptions}
                      styleClasses={fieldStyleClasses}
                    />

                    <CustomDatePickerField
                      id="date"
                      placeholder="Holiday Date"
                      value={formik.values.date}
                      onChange={(value) =>
                        formik.setFieldValue('date', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />

                    <SectionHolidayImpact />

                    <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs">
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="shrink-0 font-semibold text-foreground">
                          Created by:
                        </span>
                        <span className="text-muted-foreground">
                          {selectedRecord && !isNew
                            ? formatAuditLine(
                                selectedRecord.createdByUser.name,
                                selectedRecord.createdByUser.role,
                                selectedRecord.createdAt
                              )
                            : '—'}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="shrink-0 font-semibold text-foreground">
                          Last updated:
                        </span>
                        <span className="text-muted-foreground">
                          {selectedRecord && !isNew
                            ? formatAuditLine(
                                selectedRecord.updatedByUser.name,
                                selectedRecord.updatedByUser.role,
                                selectedRecord.updatedAt
                              )
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <HolidayDetailCalendar
                    selected={formik.values.date}
                    holidayDates={holidayDates}
                    onSelect={(date) => {
                      void formik.setFieldValue('date', date);
                    }}
                  />
                </div>
              </Form>
            );
          }}
        </Formik>
      )}

      <CustomAlertDialog
        open={deleteOpen}
        title="Delete holiday?"
        description={
          selectedRecord
            ? `Remove "${selectedRecord.name}" from the calendar? This cannot be undone.`
            : 'Remove this holiday?'
        }
        handleVisibilityChange={setDeleteOpen}
        handleContinue={handleDelete}
        loading={saving}
      />
    </div>
  );
}
