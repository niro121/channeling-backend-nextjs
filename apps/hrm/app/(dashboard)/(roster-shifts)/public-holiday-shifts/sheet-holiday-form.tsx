'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  Combobox,
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
import { DutyPlaceCascadeFields } from '@/components/roster/duty-place-cascade-fields';
import { RosterLeaveHint } from '@/components/roster/leave-application-hint';
import {
  holidayRecordToFormValues,
  holidayFormValuesToBulkPayload,
  holidayFormValuesToPayload,
  type HolidayFormValues
} from '@/lib/mappers/public-holiday-shift-form.mapper';
import {
  bulkCreatePublicHolidayShiftsAction,
  createPublicHolidayShiftAction,
  getPublicHolidayShiftConflictPreviewAction,
  updatePublicHolidayShiftAction
} from '@/app/actions/roster-actions/public-holiday-shift.actions';
import {
  DEFAULT_HOLIDAY_PAY_RATE,
  type PublicHolidayShiftConflictPreview,
  type PublicHolidayShiftFormOptions,
  type PublicHolidayShiftRecord
} from '@/types/roster';
import type { PublicHolidayFormSheetMode } from './public-holiday-shifts-ui-context';
import { buttonStyles } from '@/lib/utils/common-styles';
import { LIEU_GRANT_DAYS } from '@/types/leave';
import { LieuGrantPreviewCard } from './lieu-grant-preview-card';

type SheetHolidayFormProps = {
  open: boolean;
  mode: PublicHolidayFormSheetMode;
  record: PublicHolidayShiftRecord | null;
  selectedCount: number;
  selectedStaffIds?: string[];
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
    useWorkingDepartment: true,
    dutyLocationDepartmentId: '',
    dutyZoneId: '',
    dutyRoomId: '',
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

function WorkingDepartmentSync({
  staffId,
  useWorkingDepartment,
  staff,
  setFieldValue
}: {
  staffId: string;
  useWorkingDepartment: boolean;
  staff: PublicHolidayShiftFormOptions['staff'];
  setFieldValue: FormikProps<HolidayFormValues>['setFieldValue'];
}) {
  const previousKey = useRef('');
  useEffect(() => {
    const key = `${staffId}|${useWorkingDepartment ? '1' : '0'}`;
    if (previousKey.current === key) return;
    previousKey.current = key;
    if (!staffId || !useWorkingDepartment) return;
    const found = staff.find((row) => row.id === staffId);
    void setFieldValue(
      'dutyLocationDepartmentId',
      found?.departmentId ?? ''
    );
  }, [setFieldValue, staff, staffId, useWorkingDepartment]);
  return null;
}

function ConflictStrip({
  preview
}: {
  preview: PublicHolidayShiftConflictPreview | null;
}) {
  if (!preview) return null;
  if (
    !preview.blocksSave &&
    !preview.infoMessage &&
    preview.allocations.length === 0
  ) {
    return null;
  }

  if (preview.blocksSave) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        {preview.blockReason ??
          'Cannot save this holiday shift for the selected staff and date.'}
      </div>
    );
  }

  if (preview.infoMessage) {
    return (
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        {preview.infoMessage}
      </div>
    );
  }

  return null;
}

function sheetCopy(mode: PublicHolidayFormSheetMode) {
  if (mode === 'edit') {
    return {
      title: 'Edit Holiday Shift',
      description:
        'Update the record. All changes are captured in the audit trail.',
      saveLabel: 'Update'
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
  selectedStaffIds = [],
  formOptions,
  onOpenChange,
  onSaved
}: SheetHolidayFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const [conflictPreview, setConflictPreview] =
    useState<PublicHolidayShiftConflictPreview | null>(null);
  const pendingAckRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: HolidayFormValues;
    helpers: FormikHelpers<HolidayFormValues>;
  } | null>(null);
  const copy = sheetCopy(mode);
  const isBulk = mode === 'bulk';
  const showStaff = mode !== 'bulk';
  const isEdit = mode === 'edit';
  const uniqueStaffIds = useMemo(
    () => [...new Set(selectedStaffIds.filter(Boolean))],
    [selectedStaffIds]
  );

  const holidays = formOptions?.holidays ?? [];
  const holidayTypes = formOptions?.holidayTypes ?? [];
  const staffList = formOptions?.staff ?? [];
  const departments = formOptions?.departments ?? [];
  const locations = formOptions?.locations ?? [];
  const zones = formOptions?.zones ?? [];
  const rooms = formOptions?.rooms ?? [];
  const payRates = formOptions?.payRates ?? [];
  const statuses = formOptions?.statuses ?? [];

  /** Active + holidayEligible; on edit, keep the current shift even if the flag was later cleared. */
  const shifts = useMemo(() => {
    const base = formOptions?.shifts ?? [];
    if (
      !isEdit ||
      !record?.shiftTypeId ||
      base.some((s) => s.id === record.shiftTypeId)
    ) {
      return base;
    }
    return [
      {
        id: record.shiftTypeId,
        name: record.shiftLabel || 'Current shift (not PH eligible)',
        workedHours: String(record.workedHours ?? '')
      },
      ...base
    ];
  }, [formOptions?.shifts, isEdit, record]);

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
    if (record && isEdit) {
      const staffWorkingDept = staffList.find(
        (s) => s.id === record.staffId
      )?.departmentId;
      return holidayRecordToFormValues(record, staffWorkingDept);
    }
    return emptyValues();
  }, [isEdit, record, staffList]);

  useEffect(() => {
    if (!open) {
      setConflictPreview(null);
      pendingSubmitRef.current = null;
      pendingAckRef.current = false;
      setConfirmOpen(false);
    }
  }, [open]);

  const persistHoliday = async (
    values: HolidayFormValues,
    helpers: FormikHelpers<HolidayFormValues>
  ) => {
    setLoading(true);
    try {
      if (isBulk) {
        if (uniqueStaffIds.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description:
              'Select at least one staff row before bulk assigning holiday duty.'
          });
          return;
        }

        const bulkPayload = holidayFormValuesToBulkPayload(
          values,
          uniqueStaffIds,
          { acknowledgedWarnings: pendingAckRef.current }
        );
        const result = await bulkCreatePublicHolidayShiftsAction(bulkPayload);

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
            pendingSubmitRef.current = { values, helpers };
            setConfirmDescription(
              softWarnings.join(' ') ||
                (typeof errorMap.message === 'string'
                  ? errorMap.message
                  : 'One or more selected staff have leave or weekly-off on that holiday. Continue anyway?')
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
                : undefined) || 'Bulk holiday assign unsuccessful.'
          });
          return;
        }

        pendingAckRef.current = false;
        const created = result.data?.count ?? uniqueStaffIds.length;
        const skipped = result.data?.skipped?.length ?? 0;
        toast({
          variant: 'success',
          title: 'Success',
          description:
            result.message ||
            `${created} holiday shift(s) created${
              skipped > 0 ? `; ${skipped} skipped` : ''
            }.`
        });
        onSaved();
        return;
      }

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
          pendingSubmitRef.current = { values, helpers };
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
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'Holiday shift save unsuccessful.'
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
            onSubmit={async (values, helpers) => {
              pendingAckRef.current = false;
              await persistHoliday(values, helpers);
            }}
          >
            {(formik) => {
              const selectedStaff = staffList.find(
                (s) => s.id === formik.values.staffId
              );
              const institutionId = selectedStaff?.institutionId ?? '';
              const filtered = institutionId
                ? departments.filter((d) => d.institutionId === institutionId)
                : departments;
              const selectedDeptId = formik.values.dutyLocationDepartmentId;
              const dutyDepartmentOptions = filtered.map((d) => ({
                id: d.id,
                name: d.name
              }));
              if (
                selectedDeptId &&
                !dutyDepartmentOptions.some((d) => d.id === selectedDeptId)
              ) {
                const orphan = departments.find((d) => d.id === selectedDeptId);
                if (orphan) {
                  dutyDepartmentOptions.unshift({
                    id: orphan.id,
                    name: orphan.name
                  });
                } else if (record?.dutyLocation) {
                  dutyDepartmentOptions.unshift({
                    id: selectedDeptId,
                    name: record.dutyLocation
                  });
                }
              }

              return (
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
                    <WorkingDepartmentSync
                      staffId={formik.values.staffId}
                      useWorkingDepartment={formik.values.useWorkingDepartment}
                      staff={staffList}
                      setFieldValue={formik.setFieldValue}
                    />
                  ) : null}
                  {showStaff ? (
                    <ConflictPreviewEffect
                      open={open}
                      staffId={formik.values.staffId}
                      dutyDate={formik.values.dutyDate}
                      shiftTypeId={formik.values.shiftId}
                      excludeAllocationId={isEdit ? record?.id : null}
                      onPreview={setConflictPreview}
                    />
                  ) : null}

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {isBulk ? (
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                        {uniqueStaffIds.length || selectedCount} staff selected
                        — the holiday duty below applies to each unique staff
                        member. Staff who already have this shift type or hit
                        the day limit are skipped.
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
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            Staff *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label="Staff"
                              options={staffList}
                              value={formik.values.staffId}
                              defaultValue=""
                              clearable={!isEdit}
                              disabled={isEdit}
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) => {
                                void formik.setFieldValue('staffId', value);
                              }}
                            />
                          </div>
                          {formik.touched.staffId && formik.errors.staffId ? (
                            <p className="text-xs text-destructive">
                              {formik.errors.staffId}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="space-y-1.5">
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
                        {shifts.length === 0 ? (
                          <p className="text-xs text-amber-800 dark:text-amber-300">
                            No Public Holiday Eligible shift types. On Shift
                            Types, turn on{' '}
                            <span className="font-medium">
                              Public Holiday Eligible
                            </span>{' '}
                            for the templates you use on holidays.
                          </p>
                        ) : isEdit &&
                          record?.shiftTypeId &&
                          !(formOptions?.shifts ?? []).some(
                            (s) => s.id === record.shiftTypeId
                          ) ? (
                          <p className="text-xs text-muted-foreground">
                            Current shift is no longer Public Holiday Eligible.
                            Pick an eligible shift to change it, or keep it to
                            leave the duty unchanged.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {showStaff ? (
                      <>
                        <ConflictStrip preview={conflictPreview} />
                        <RosterLeaveHint
                          open={open}
                          staffId={formik.values.staffId}
                          date={formik.values.dutyDate}
                          staffLabel={selectedStaff?.name}
                        />
                      </>
                    ) : null}

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Use staff working department
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isBulk
                            ? 'When on, each selected staff keeps their working department. Turn off to set one duty department for all.'
                            : 'Turn off to pick another department at the same institution.'}
                        </p>
                      </div>
                      <Switch
                        checked={formik.values.useWorkingDepartment}
                        onCheckedChange={(checked) => {
                          void formik.setFieldValue(
                            'useWorkingDepartment',
                            checked
                          );
                          if (!checked) return;
                          void formik.setFieldValue(
                            'dutyLocationDepartmentId',
                            selectedStaff?.departmentId ?? ''
                          );
                        }}
                        disabled={showStaff && !formik.values.staffId}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <div className={fieldStyleClasses.parentDiv}>
                        <Label className={fieldStyleClasses.labelClassName}>
                          Duty Department
                        </Label>
                        <div className={fieldStyleClasses.inputClassName}>
                          <Combobox
                            label="Duty Department"
                            options={dutyDepartmentOptions}
                            value={formik.values.dutyLocationDepartmentId}
                            defaultValue=""
                            clearable={!formik.values.useWorkingDepartment}
                            disabled={formik.values.useWorkingDepartment}
                            triggerClassName="w-full max-w-none font-normal!"
                            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                            onChange={(value) =>
                              formik.setFieldValue(
                                'dutyLocationDepartmentId',
                                value
                              )
                            }
                          />
                        </div>
                      </div>
                      <DutyPlaceCascadeFields
                        locations={locations}
                        zones={zones}
                        rooms={rooms}
                        dutyZoneId={formik.values.dutyZoneId}
                        dutyRoomId={formik.values.dutyRoomId}
                        fieldStyleClasses={fieldStyleClasses}
                        onZoneChange={(value) => {
                          void formik.setFieldValue('dutyZoneId', value);
                        }}
                        onRoomChange={(value) => {
                          void formik.setFieldValue('dutyRoomId', value);
                        }}
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
                        id="status"
                        placeholder="Approval Status"
                        value={formik.values.status}
                        onChange={(value) =>
                          formik.setFieldValue('status', value)
                        }
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
                          When status is Approved (or published), posts +
                          {LIEU_GRANT_DAYS} day
                          {LIEU_GRANT_DAYS === 1 ? '' : 's'} to the published
                          Lieu leave-type bank for the duty’s calendar year
                          (Leave Types → Add Lieu).
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

                    <LieuGrantPreviewCard
                      enabled={formik.values.grantLieuLeave}
                      staffId={formik.values.staffId}
                      dutyDate={formik.values.dutyDate}
                      allocationId={isEdit ? record?.id : null}
                      bulkStaffCount={isBulk ? selectedCount : 0}
                    />

                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                      <div className="min-w-0 space-y-0.5">
                        <Label
                          htmlFor="sendToPayroll"
                          className="cursor-pointer text-sm font-semibold text-foreground"
                        >
                          Send to Payroll
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Post the holiday pay and allowance to the current
                          salary cycle.
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
                          ? record?.createdUser?.name ||
                            record?.createdBy ||
                            '—'
                          : '—'}
                        {isEdit && record?.createdAt
                          ? ` · ${formatAuditDateTime(record.createdAt)}`
                          : null}
                      </p>
                      <p className="sm:text-right">
                        Last updated:{' '}
                        {isEdit
                          ? record?.updatedUser?.name ||
                            record?.updatedBy ||
                            '—'
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
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        loading || Boolean(conflictPreview?.blocksSave)
                      }
                      className={buttonStyles.save}
                    >
                      {loading
                        ? isEdit
                          ? 'Updating...'
                          : 'Saving...'
                        : copy.saveLabel}
                    </Button>
                  </SheetFooter>
                </Form>
              );
            }}
          </Formik>
        </SheetContent>
      </Sheet>

      <CustomAlertDialog
        open={confirmOpen}
        title="Confirm roster warning"
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
          await persistHoliday(pending.values, pending.helpers);
          pendingSubmitRef.current = null;
        }}
      />
    </>
  );
}

function ConflictPreviewEffect({
  open,
  staffId,
  dutyDate,
  shiftTypeId,
  excludeAllocationId,
  onPreview
}: {
  open: boolean;
  staffId: string;
  dutyDate: Date | null;
  shiftTypeId: string;
  excludeAllocationId?: string | null;
  onPreview: (preview: PublicHolidayShiftConflictPreview | null) => void;
}) {
  useEffect(() => {
    if (!open || !staffId || !dutyDate) {
      onPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getPublicHolidayShiftConflictPreviewAction({
          staffId,
          dutyDate,
          shiftTypeId,
          excludeAllocationId
        });
        if (cancelled) return;
        if (response.isError || !response.data) {
          onPreview(null);
          return;
        }
        onPreview(response.data);
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    dutyDate,
    excludeAllocationId,
    onPreview,
    open,
    shiftTypeId,
    staffId
  ]);

  return null;
}
