'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import {
  Button,
  CustomFormField,
  CustomSelectField,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  useToast
} from '@archmage/ui';
import { formatAuditDateTime } from '@/lib/utils/date';
import { calcTotalWorkingHours } from '@/lib/helpers/shift-duration.helper';
import {
  shiftTypeFormValuesToPayload,
  shiftTypeRecordToFormValues
} from '@/lib/mappers/shift-type-form.mapper';
import {
  createShiftTypeAction,
  updateShiftTypeAction
} from '@/app/actions/roster-actions/shift-type.actions';
import {
  SHIFT_TYPE_CATEGORY_OPTIONS,
  type ShiftTypeFormValues,
  type ShiftTypeRecord
} from '@/types/roster';
import type { ShiftTypeFormSheetMode } from './shift-types-ui-context';

type SheetShiftTypeFormProps = {
  open: boolean;
  mode: ShiftTypeFormSheetMode;
  record: ShiftTypeRecord | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const SHIFT_RULES: {
  id: keyof Pick<
    ShiftTypeFormValues,
    'isOvernight' | 'isNightShift' | 'holidayEligible' | 'isActive'
  >;
  title: string;
  description: string;
}[] = [
  {
    id: 'isOvernight',
    title: 'Overnight Shift',
    description: 'Shift crosses midnight into the next calendar day'
  },
  {
    id: 'isNightShift',
    title: 'Night Shift',
    description: 'Eligible for night shift allowance'
  },
  {
    id: 'holidayEligible',
    title: 'Public Holiday Eligible',
    description: 'Can be rostered on gazetted public holidays'
  },
  {
    id: 'isActive',
    title: 'Active Status',
    description: 'Available for new shift assignments'
  }
];

const emptyValues: ShiftTypeFormValues = {
  code: '',
  name: '',
  categoryId: '',
  startTime: '07:00',
  endTime: '15:00',
  breakMinutes: '60',
  durationHours: '7',
  graceMinutes: '10',
  lateThresholdMinutes: '15',
  earlyExitThresholdMinutes: '10',
  isOvernight: false,
  isNightShift: false,
  holidayEligible: true,
  isActive: true
};

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .max(150, 'Must be less than 150 characters'),
  categoryId: Yup.string().required('Category is required'),
  startTime: Yup.string().required('Start time is required'),
  endTime: Yup.string().required('End time is required'),
  breakMinutes: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('Break duration is required'),
  graceMinutes: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('Grace period is required'),
  lateThresholdMinutes: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('Late threshold is required'),
  earlyExitThresholdMinutes: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('Early exit threshold is required')
});

function sheetCopy(mode: ShiftTypeFormSheetMode) {
  if (mode === 'edit') {
    return {
      title: 'Edit Shift Type',
      description: 'Update shift timings, thresholds and allowance rules.',
      saveLabel: 'Update Shift Type'
    };
  }
  if (mode === 'duplicate') {
    return {
      title: 'Duplicate Shift Type',
      description: 'Create a new shift type from an existing definition.',
      saveLabel: 'Duplicate Shift Type'
    };
  }
  return {
    title: 'Add Shift Type',
    description: 'Create a new shift template for hospital rosters.',
    saveLabel: 'Save Shift Type'
  };
}

function AutoDurationSync({
  startTime,
  endTime,
  breakMinutes,
  isOvernight,
  durationHours,
  setFieldValue
}: {
  startTime: string;
  endTime: string;
  breakMinutes: string;
  isOvernight: boolean;
  durationHours: string;
  setFieldValue: FormikProps<ShiftTypeFormValues>['setFieldValue'];
}) {
  const autoHours = calcTotalWorkingHours(
    startTime,
    endTime,
    Number(breakMinutes) || 0,
    isOvernight
  );
  const label = Number.isFinite(autoHours) ? String(autoHours) : '0';

  useEffect(() => {
    if (durationHours !== label) {
      void setFieldValue('durationHours', label);
    }
  }, [
    breakMinutes,
    durationHours,
    endTime,
    isOvernight,
    label,
    setFieldValue,
    startTime
  ]);

  return null;
}

function applyFieldErrors(
  errorMap: Record<string, string | string[] | undefined> | undefined,
  setErrors: FormikHelpers<ShiftTypeFormValues>['setErrors'],
  setTouched: FormikHelpers<ShiftTypeFormValues>['setTouched']
) {
  const fieldErrors: Record<string, string> = {};
  Object.keys(errorMap ?? {}).forEach((key) => {
    if (key === 'message') return;
    const mappedKey = key === 'category' ? 'categoryId' : key;
    const err = errorMap?.[key];
    const msg = Array.isArray(err) ? err[0] : err;
    if (msg) fieldErrors[mappedKey] = msg;
  });
  if (Object.keys(fieldErrors).length > 0) {
    setErrors(fieldErrors);
    setTouched(
      Object.keys(fieldErrors).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<string, boolean>
      )
    );
  }
  return (errorMap?.message as string) ?? undefined;
}

export default function SheetShiftTypeForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetShiftTypeFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const copy = sheetCopy(mode);

  const initialValues = useMemo(() => {
    if (record && (mode === 'edit' || mode === 'duplicate')) {
      return shiftTypeRecordToFormValues(record, {
        duplicate: mode === 'duplicate'
      });
    }
    return {
      ...emptyValues,
      durationHours: String(
        calcTotalWorkingHours(
          emptyValues.startTime,
          emptyValues.endTime,
          Number(emptyValues.breakMinutes),
          emptyValues.isOvernight
        )
      )
    };
  }, [mode, record]);

  const auditCreatedBy =
    mode === 'add' ? '—' : (record?.createdUser?.name ?? '—');
  const auditCreatedAt =
    mode === 'add' ? '—' : formatAuditDateTime(record?.createdAt);
  const auditUpdatedBy =
    mode === 'add' ? '—' : (record?.updatedUser?.name ?? '—');
  const auditUpdatedAt =
    mode === 'add' ? '—' : formatAuditDateTime(record?.updatedAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values, helpers) => {
            const mapped = shiftTypeFormValuesToPayload(values);
            try {
              setLoading(true);
              const respond =
                mode === 'edit' && record?.id
                  ? await updateShiftTypeAction(record.id, mapped)
                  : await createShiftTypeAction(mapped);

              if (respond?.isError) {
                const errorMap = respond.errors as Record<
                  string,
                  string | string[] | undefined
                >;
                const message = applyFieldErrors(
                  errorMap,
                  helpers.setErrors,
                  helpers.setTouched
                );
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description: message ?? 'Shift type could not be saved.'
                });
                return;
              }

              toast({
                variant: 'success',
                title: 'Success',
                description:
                  mode === 'edit'
                    ? 'Shift type updated.'
                    : mode === 'duplicate'
                      ? 'Shift type duplicated.'
                      : 'Shift type created.'
              });
              onOpenChange(false);
              router.refresh();
            } catch (error: unknown) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description:
                  error instanceof Error
                    ? error.message
                    : 'Shift type could not be saved.'
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <AutoDurationSync
                startTime={formik.values.startTime}
                endTime={formik.values.endTime}
                breakMinutes={formik.values.breakMinutes}
                isOvernight={formik.values.isOvernight}
                durationHours={formik.values.durationHours}
                setFieldValue={formik.setFieldValue}
              />
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomFormField
                    id="code"
                    type="text"
                    placeholder="Shift Code (Auto Generated)"
                    value={
                      mode === 'edit'
                        ? formik.values.code
                        : formik.values.code || 'Auto (SHF-n)'
                    }
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="name"
                    type="text"
                    placeholder="Shift Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="categoryId"
                    placeholder="Category"
                    value={formik.values.categoryId}
                    onChange={(value) =>
                      formik.setFieldValue('categoryId', value)
                    }
                    required
                    options={SHIFT_TYPE_CATEGORY_OPTIONS}
                    styleClasses={fieldStyleClasses}
                  />
                  <div className="hidden sm:block" aria-hidden />
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
                  <CustomFormField
                    id="breakMinutes"
                    type="number"
                    placeholder="Break Duration (minutes)"
                    value={formik.values.breakMinutes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="durationHours"
                    type="text"
                    placeholder="Total Working Hours"
                    value={formik.values.durationHours}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="graceMinutes"
                    type="number"
                    placeholder="Grace Period (minutes)"
                    value={formik.values.graceMinutes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="lateThresholdMinutes"
                    type="number"
                    placeholder="Late Threshold (minutes)"
                    value={formik.values.lateThresholdMinutes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="earlyExitThresholdMinutes"
                    type="number"
                    placeholder="Early Exit Threshold (minutes)"
                    value={formik.values.earlyExitThresholdMinutes}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Shift Rules
                  </Label>
                  <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
                    {SHIFT_RULES.map((rule, index) => (
                      <div
                        key={rule.id}
                        className={
                          index > 0 ? 'border-t border-border' : undefined
                        }
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="min-w-0 space-y-0.5">
                            <Label
                              htmlFor={rule.id}
                              className="cursor-pointer text-sm font-semibold text-foreground"
                            >
                              {rule.title}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {rule.description}
                            </p>
                          </div>
                          <Switch
                            id={rule.id}
                            checked={formik.values[rule.id]}
                            onCheckedChange={(checked) =>
                              formik.setFieldValue(rule.id, checked)
                            }
                            className="shrink-0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by: {auditCreatedBy}
                    {mode !== 'add' ? ` · ${auditCreatedAt}` : null}
                  </p>
                  <p>
                    Last updated: {auditUpdatedBy}
                    {mode !== 'add' ? ` · ${auditUpdatedAt}` : null}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {copy.saveLabel}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
