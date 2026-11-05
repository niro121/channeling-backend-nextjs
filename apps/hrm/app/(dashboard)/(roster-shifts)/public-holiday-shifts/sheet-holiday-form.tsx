'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
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
import {
  DEFAULT_HOLIDAY_PAY_RATE,
  type PublicHolidayShiftFormOptions,
  type PublicHolidayShiftRecord
} from '@/types/roster';
import type { PublicHolidayFormSheetMode } from './public-holiday-shifts-ui-context';
import { buttonStyles } from '@/lib/utils/common-styles';

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
    payRate: DEFAULT_HOLIDAY_PAY_RATE,
    holidayAllowance: '',
    dutyLocationDepartmentId: '',
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
    void setFieldValue('dutyLocationDepartmentId', found.departmentId);
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const pendingAckRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: HolidayFormValues;
    helpers: FormikHelpers<HolidayFormValues>;
  } | null>(null);
  const copy = sheetCopy(mode);
  const isBulk = mode === 'bulk';
  const showStaff = mode !== 'bulk';
  const isEdit = mode === 'edit';

  const holidays = formOptions?.holidays ?? [];
  const holidayTypes = formOptions?.holidayTypes ?? [];
  const shifts = formOptions?.shifts ?? [];
  const staffList = formOptions?.staff ?? [];
  const departments = formOptions?.departments ?? [];
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

  const persistHoliday = async (values: HolidayFormValues) => {
    setLoading(true);
    try {
      const payload = holidayFormValuesToPayload(values, {
        acknowledgedWarnings: pendingAckRef.current
      });
      const result =
        isEdit && record
          ? await updatePublicHolidayShiftAction(record.id, payload)
          : await createPublicHolidayShiftAction(payload);

      if (result.isError) {
        const errorMap = result.errors as Record<
          string,
          string | string[] | boolean | undefined
        >;
        if (errorMap.requiresAck) {
          const softWarnings = Array.isArray(errorMap.softWarnings)
            ? errorMap.softWarnings.filter(
                (item): item is string => typeof item === 'string'
              )
            : [];
          pendingSubmitRef.current = {
            values,
            helpers: {} as FormikHelpers<HolidayFormValues>
          };
          setConfirmDescription(
            softWarnings.join(' ') ||
              (typeof errorMap.message === 'string'
                ? errorMap.message
                : 'This staff member has leave on that holiday date. Continue anyway?')
          );
          setConfirmOpen(true);
          return;
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : undefined) || 'Holiday shift save unsuccessful.'
        });
        return;
      }

      pendingAckRef.current = false;
      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? 'Holiday shift was updated successfully'
          : 'Holiday shift was created successfully'
      });
      onSaved();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Holiday shift save unsuccessful.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            pendingAckRef.current = false;
            await persistHoliday(values);
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
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label
                      htmlFor="holidayTypeId"
                      className={fieldStyleClasses.labelClassName}
                    >
                      Holiday Type
                    </Label>
                    <div
                      id="holidayTypeId"
                      className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground"
                    >
                      {holidayTypes.find(
                        (t) => t.id === formik.values.holidayTypeId
                      )?.name || (
                        <span className="text-muted-foreground">
                          Select a holiday to see its type
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label
                      htmlFor="dutyDate"
                      className={fieldStyleClasses.labelClassName}
                    >
                      Duty Date
                    </Label>
                    <div
                      id="dutyDate"
                      className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground"
                    >
                      {formik.values.dutyDate ? (
                        format(formik.values.dutyDate, 'MMMM do, yyyy')
                      ) : (
                        <span className="text-muted-foreground">
                          Select a holiday to see its date
                        </span>
                      )}
                    </div>
                  </div>
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
                  {(() => {
                    const selectedStaff = staffList.find(
                      (s) => s.id === formik.values.staffId
                    );
                    const institutionId = selectedStaff?.institutionId ?? '';
                    const filtered = institutionId
                      ? departments.filter(
                          (d) => d.institutionId === institutionId
                        )
                      : departments;
                    const selectedDeptId =
                      formik.values.dutyLocationDepartmentId;
                    const dutyLocationOptions = filtered.map((d) => ({
                      id: d.id,
                      name: d.name
                    }));
                    if (
                      selectedDeptId &&
                      !dutyLocationOptions.some((d) => d.id === selectedDeptId)
                    ) {
                      const orphan = departments.find(
                        (d) => d.id === selectedDeptId
                      );
                      if (orphan) {
                        dutyLocationOptions.unshift({
                          id: orphan.id,
                          name: orphan.name
                        });
                      } else if (record?.dutyLocation) {
                        dutyLocationOptions.unshift({
                          id: selectedDeptId,
                          name: record.dutyLocation
                        });
                      }
                    }

                    return (
                      <>
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label
                            htmlFor="workingLocation"
                            className={fieldStyleClasses.labelClassName}
                          >
                            Working Location
                          </Label>
                          <div
                            id="workingLocation"
                            className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground"
                          >
                            {selectedStaff?.institutionName || (
                              <span className="text-muted-foreground">
                                {showStaff
                                  ? 'Select a staff member to see institution'
                                  : 'Bulk uses each staff member’s institution'}
                              </span>
                            )}
                          </div>
                        </div>
                        <CustomSelectField
                          id="dutyLocationDepartmentId"
                          placeholder="Duty Location"
                          value={formik.values.dutyLocationDepartmentId}
                          onChange={(value) =>
                            formik.setFieldValue(
                              'dutyLocationDepartmentId',
                              value
                            )
                          }
                          required={false}
                          options={dutyLocationOptions}
                          styleClasses={fieldStyleClasses}
                        />
                      </>
                    );
                  })()}
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
                  className={buttonStyles.cancel.normal}
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className={buttonStyles.save}>
                  {copy.saveLabel}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>

    <CustomAlertDialog
      open={confirmOpen}
      title="Staff has leave on this date"
      description={confirmDescription}
      loading={loading}
      handleVisibilityChange={(nextOpen) => {
        if (!nextOpen) {
          pendingSubmitRef.current = null;
          pendingAckRef.current = false;
        }
        setConfirmOpen(nextOpen);
      }}
      handleContinue={async () => {
        const pending = pendingSubmitRef.current;
        if (!pending) {
          setConfirmOpen(false);
          return;
        }
        pendingAckRef.current = true;
        setConfirmOpen(false);
        await persistHoliday(pending.values);
        pendingSubmitRef.current = null;
      }}
    />
    </>
  );
}
