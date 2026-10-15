'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
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
import {
  holidayRecordToFormValues,
  holidayFormValuesToPayload,
  type HolidayFormValues
} from '@/lib/mappers/public-holiday-shift-form.mapper';
import {
  createPublicHolidayShiftAction,
  updatePublicHolidayShiftAction
} from '@/app/actions/roster-actions/public-holiday-shift.actions';
import type {
  PublicHolidayShiftFormOptions,
  PublicHolidayShiftRecord
} from '@/types/roster';
import type { PublicHolidayFormSheetMode } from './public-holiday-shifts-ui-context';

type SheetHolidayFormProps = {
  open: boolean;
  mode: PublicHolidayFormSheetMode;
  record: PublicHolidayShiftRecord | null;
  selectedCount: number;
  formOptions: PublicHolidayShiftFormOptions | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function emptyValues(): HolidayFormValues {
  return {
    holidayId: '',
    holidayTypeId: '',
    staffId: '',
    shiftId: '',
    dutyDate: null,
    workedHours: '',
    payRate: '2.00',
    holidayAllowance: '',
    dutyLocation: '',
    status: 'pending_approval',
    grantLieuLeave: false,
    sendToPayroll: false,
    remarks: ''
  };
}

function AutoHoliday({
  holidayId,
  holidays,
  setFieldValue
}: {
  holidayId: string;
  holidays: PublicHolidayShiftFormOptions['holidays'];
  setFieldValue: FormikProps<HolidayFormValues>['setFieldValue'];
}) {
  const prev = useRef(holidayId);
  useEffect(() => {
    if (prev.current === holidayId) return;
    prev.current = holidayId;
    const found = holidays.find((h) => h.id === holidayId);
    if (!found) return;
    void setFieldValue('holidayTypeId', found.typeId);
    void setFieldValue('dutyDate', parseISO(found.date));
  }, [holidayId, holidays, setFieldValue]);
  return null;
}

function AutoShiftHours({
  shiftId,
  shifts,
  setFieldValue
}: {
  shiftId: string;
  shifts: PublicHolidayShiftFormOptions['shifts'];
  setFieldValue: FormikProps<HolidayFormValues>['setFieldValue'];
}) {
  const prev = useRef(shiftId);
  useEffect(() => {
    if (prev.current === shiftId) return;
    prev.current = shiftId;
    const found = shifts.find((s) => s.id === shiftId);
    if (!found) return;
    void setFieldValue('workedHours', found.workedHours);
  }, [setFieldValue, shiftId, shifts]);
  return null;
}

function AutoStaffLocation({
  staffId,
  staff,
  setFieldValue
}: {
  staffId: string;
  staff: PublicHolidayShiftFormOptions['staff'];
  setFieldValue: FormikProps<HolidayFormValues>['setFieldValue'];
}) {
  const prev = useRef(staffId);
  useEffect(() => {
    if (prev.current === staffId) return;
    prev.current = staffId;
    const found = staff.find((s) => s.id === staffId);
    if (!found) return;
    void setFieldValue('dutyLocation', found.dutyLocation);
  }, [setFieldValue, staffId, staff]);
  return null;
}

function sheetCopy(mode: PublicHolidayFormSheetMode) {
  if (mode === 'edit') {
    return {
      title: 'Edit Holiday Shift',
      description:
        'Update the record. All changes are captured in the audit trail.',
      saveLabel: 'Save Changes'
    };
  }
  if (mode === 'bulk') {
    return {
      title: 'Bulk Assign Holiday Duty',
      description: 'Apply one holiday duty to all selected staff members.',
      saveLabel: 'Save Assignment'
    };
  }
  return {
    title: 'Add Holiday Shift',
    description: 'Roster a staff member on a gazetted holiday.',
    saveLabel: 'Save Holiday Shift'
  };
}

export default function SheetHolidayForm({
  open,
  mode,
  record,
  selectedCount,
  formOptions,
  onOpenChange,
  onSaved
}: SheetHolidayFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const copy = sheetCopy(mode);
  const isBulk = mode === 'bulk';
  const showStaff = mode !== 'bulk';
  const isEdit = mode === 'edit';

  const holidays = formOptions?.holidays ?? [];
  const holidayTypes = formOptions?.holidayTypes ?? [];
  const shifts = formOptions?.shifts ?? [];
  const staffList = formOptions?.staff ?? [];
  const locations = formOptions?.locations ?? [];
  const payRates = formOptions?.payRates ?? [];
  const statuses = formOptions?.statuses ?? [];

  const holidayOptions = holidays.map((h) => ({ id: h.id, name: h.name }));

  const validationSchema = useMemo(
    () =>
      Yup.object({
        holidayId: Yup.string().required('Public holiday is required'),
        holidayTypeId: Yup.string().required('Holiday type is required'),
        staffId: showStaff
          ? Yup.string().required('Staff member is required')
          : Yup.string(),
        shiftId: Yup.string().required('Shift is required'),
        dutyDate: Yup.date().nullable().required('Duty date is required'),
        workedHours: Yup.number().min(0, 'Cannot be negative').nullable(),
        payRate: Yup.string().required('Pay rate is required'),
        holidayAllowance: Yup.number().min(0, 'Cannot be negative').nullable(),
        status: Yup.string().required('Approval status is required'),
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    [showStaff]
  );

  const initialValues = useMemo(() => {
    if (record && isEdit) return holidayRecordToFormValues(record);
    return emptyValues();
  }, [isEdit, record]);

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
          onSubmit={async (values) => {
            setLoading(true);
            try {
              const payload = holidayFormValuesToPayload(values);
              const result = isEdit && record
                ? await updatePublicHolidayShiftAction(record.id, payload)
                : await createPublicHolidayShiftAction(payload);

              if (result.isError) {
                toast({
                  title: 'Error',
                  description: result.errors?.message || 'Save failed',
                  variant: 'destructive'
                });
                return;
              }

              toast({
                title: isEdit ? 'Holiday shift updated' : 'Holiday shift created'
              });
              onSaved();
            } catch (err: any) {
              toast({
                title: 'Error',
                description: err.message || 'Unexpected error',
                variant: 'destructive'
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <AutoHoliday
                holidayId={formik.values.holidayId}
                holidays={holidays}
                setFieldValue={formik.setFieldValue}
              />
              <AutoShiftHours
                shiftId={formik.values.shiftId}
                shifts={shifts}
                setFieldValue={formik.setFieldValue}
              />
              {showStaff ? (
                <AutoStaffLocation
                  staffId={formik.values.staffId}
                  staff={staffList}
                  setFieldValue={formik.setFieldValue}
                />
              ) : null}

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {isBulk ? (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                    {selectedCount} staff selected — the holiday duty below
                    applies to every selected staff member.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <CustomSelectField
                      id="holidayId"
                      placeholder="Select holiday from Holiday Date master"
                      value={formik.values.holidayId}
                      onChange={(value) =>
                        formik.setFieldValue('holidayId', value)
                      }
                      required
                      options={holidayOptions}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                  <CustomSelectField
                    id="holidayTypeId"
                    placeholder="Holiday Type"
                    value={formik.values.holidayTypeId}
                    onChange={(value) =>
                      formik.setFieldValue('holidayTypeId', value)
                    }
                    required
                    options={holidayTypes}
                    styleClasses={fieldStyleClasses}
                  />
                  {showStaff ? (
                    <CustomSelectField
                      id="staffId"
                      placeholder="Staff"
                      value={formik.values.staffId}
                      onChange={(value) =>
                        formik.setFieldValue('staffId', value)
                      }
                      required
                      options={staffList}
                      styleClasses={fieldStyleClasses}
                    />
                  ) : null}
                  <CustomSelectField
                    id="shiftId"
                    placeholder="Shift"
                    value={formik.values.shiftId}
                    onChange={(value) =>
                      formik.setFieldValue('shiftId', value)
                    }
                    required
                    options={shifts}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="dutyDate"
                    placeholder="Duty Date"
                    value={formik.values.dutyDate}
                    onChange={(value) =>
                      formik.setFieldValue('dutyDate', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="workedHours"
                    type="number"
                    placeholder="Worked Hours"
                    value={formik.values.workedHours}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="payRate"
                    placeholder="Pay Rate"
                    value={formik.values.payRate}
                    onChange={(value) =>
                      formik.setFieldValue('payRate', value)
                    }
                    required
                    options={payRates}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="holidayAllowance"
                    type="number"
                    placeholder="Holiday Allowance (LKR)"
                    value={formik.values.holidayAllowance}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="dutyLocation"
                    placeholder="Duty Location"
                    value={formik.values.dutyLocation}
                    onChange={(value) =>
                      formik.setFieldValue('dutyLocation', value)
                    }
                    required={false}
                    options={locations}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="status"
                    placeholder="Approval Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={statuses}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label
                      htmlFor="grantLieuLeave"
                      className="cursor-pointer text-sm font-semibold text-foreground"
                    >
                      Grant Lieu Leave
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add a lieu day to the staff leave entitlement instead of
                      extra pay.
                    </p>
                  </div>
                  <Switch
                    id="grantLieuLeave"
                    checked={formik.values.grantLieuLeave}
                    onCheckedChange={(checked) =>
                      formik.setFieldValue('grantLieuLeave', checked)
                    }
                    className="shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label
                      htmlFor="sendToPayroll"
                      className="cursor-pointer text-sm font-semibold text-foreground"
                    >
                      Send to Payroll
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Post the holiday pay and allowance to the current salary
                      cycle.
                    </p>
                  </div>
                  <Switch
                    id="sendToPayroll"
                    checked={formik.values.sendToPayroll}
                    onCheckedChange={(checked) =>
                      formik.setFieldValue('sendToPayroll', checked)
                    }
                    className="shrink-0"
                  />
                </div>

                <CustomFormField
                  id="remarks"
                  type="textarea"
                  placeholder="Remarks"
                  value={formik.values.remarks}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by:{' '}
                    {isEdit
                      ? record?.createdUser?.name || record?.createdBy || '—'
                      : '—'}
                    {isEdit && record?.createdAt
                      ? ` · ${formatAuditDateTime(record.createdAt)}`
                      : null}
                  </p>
                  <p className="sm:text-right">
                    Last updated:{' '}
                    {isEdit
                      ? record?.updatedUser?.name || record?.updatedBy || '—'
                      : '—'}
                    {isEdit && record?.updatedAt
                      ? ` · ${formatAuditDateTime(record.updatedAt)}`
                      : null}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  size="sm"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
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
