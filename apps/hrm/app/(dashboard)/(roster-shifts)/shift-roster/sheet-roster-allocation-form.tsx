'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Formik, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
import { X } from 'lucide-react';
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
import { formatAuditDateTime } from '@/lib/utils/date';
import {
  SAMPLE_ALLOCATION_STATUS_OPTIONS,
  SAMPLE_ROSTER_AUDIT,
  SAMPLE_ROSTER_SHIFT_TYPES,
  shiftTypeIdFromCode,
  type RosterStaffOption
} from './sample-data';
import type { RosterAllocationFormTarget } from './shift-roster-ui-context';

export type RosterAllocationFormValues = {
  staffId: string;
  shiftTypeId: string;
  department: string;
  unit: string;
  designation: string;
  rosterDate: Date | null;
  totalHours: string;
  otHours: string;
  status: string;
  comments: string;
};

type SheetRosterAllocationFormProps = {
  open: boolean;
  target: RosterAllocationFormTarget;
  staffOptions: RosterStaffOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const validationSchema = Yup.object({
  staffId: Yup.string().required('Staff member is required'),
  shiftTypeId: Yup.string().required('Shift type is required'),
  rosterDate: Yup.date().nullable().required('Roster date is required'),
  otHours: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('OT hours are required'),
  status: Yup.string().required('Status is required'),
  comments: Yup.string().max(500, 'Must be less than 500 characters')
});

function hoursForShiftType(shiftTypeId: string): string {
  const found = SAMPLE_ROSTER_SHIFT_TYPES.find((s) => s.id === shiftTypeId);
  return found ? String(found.durationHours.toFixed(1)) : '0.0';
}

function buildInitialValues(
  target: RosterAllocationFormTarget,
  staffOptions: RosterStaffOption[]
): RosterAllocationFormValues {
  const staffId = target.row?.id ?? '';
  const staff =
    staffOptions.find((s) => s.id === staffId) ??
    (target.row
      ? {
          id: target.row.id,
          name: target.row.staffName,
          staffCode: target.row.staffCode,
          department: target.row.department,
          unit: target.row.unit,
          designation: target.row.designation
        }
      : null);

  const shiftTypeId = target.shift
    ? shiftTypeIdFromCode(target.shift.code)
    : '';

  return {
    staffId,
    shiftTypeId,
    department: staff?.department ?? '',
    unit: staff?.unit ?? '',
    designation: staff?.designation ?? '',
    rosterDate: target.dateIso ? parseISO(target.dateIso) : null,
    totalHours: hoursForShiftType(shiftTypeId),
    otHours:
      target.mode === 'edit' && target.row
        ? String(target.row.otHours.toFixed(1))
        : '0.0',
    status: target.row?.status ?? 'draft',
    comments: ''
  };
}

function AutoStaffMetaSync({
  staffId,
  staffOptions,
  setFieldValue
}: {
  staffId: string;
  staffOptions: RosterStaffOption[];
  setFieldValue: FormikProps<RosterAllocationFormValues>['setFieldValue'];
}) {
  useEffect(() => {
    const staff = staffOptions.find((s) => s.id === staffId);
    void setFieldValue('department', staff?.department ?? '');
    void setFieldValue('unit', staff?.unit ?? '');
    void setFieldValue('designation', staff?.designation ?? '');
  }, [staffId, staffOptions, setFieldValue]);

  return null;
}

function AutoHoursSync({
  shiftTypeId,
  totalHours,
  setFieldValue
}: {
  shiftTypeId: string;
  totalHours: string;
  setFieldValue: FormikProps<RosterAllocationFormValues>['setFieldValue'];
}) {
  const next = hoursForShiftType(shiftTypeId);

  useEffect(() => {
    if (totalHours !== next) {
      void setFieldValue('totalHours', next);
    }
  }, [next, setFieldValue, shiftTypeId, totalHours]);

  return null;
}

const LATER = 'Will be wired in a later phase.';

export default function SheetRosterAllocationForm({
  open,
  target,
  staffOptions,
  onOpenChange
}: SheetRosterAllocationFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const mode = target.mode;

  const initialValues = useMemo(
    () => buildInitialValues(target, staffOptions),
    [staffOptions, target]
  );

  const title =
    mode === 'edit' ? 'Edit Roster Allocation' : 'Allocate Shift';
  const description =
    mode === 'edit'
      ? 'Update the record. All changes are captured in the audit trail.'
      : 'Create a new roster allocation for a staff member.';
  const saveLabel = mode === 'edit' ? 'Save Changes' : 'Save Allocation';

  const showAudit = mode === 'edit' || !!target.row;
  const auditCreatedBy = showAudit ? SAMPLE_ROSTER_AUDIT.createdBy : '—';
  const auditCreatedAt = showAudit
    ? formatAuditDateTime(SAMPLE_ROSTER_AUDIT.createdAt)
    : '—';
  const auditUpdatedBy = showAudit ? SAMPLE_ROSTER_AUDIT.updatedBy : '—';
  const auditUpdatedAt = showAudit
    ? formatAuditDateTime(SAMPLE_ROSTER_AUDIT.updatedAt)
    : '—';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async () => {
            setLoading(true);
            toast({
              title:
                mode === 'edit'
                  ? 'Update roster allocation'
                  : 'Create roster allocation',
              description: LATER
            });
            setLoading(false);
            onOpenChange(false);
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <AutoStaffMetaSync
                staffId={formik.values.staffId}
                staffOptions={staffOptions}
                setFieldValue={formik.setFieldValue}
              />
              <AutoHoursSync
                shiftTypeId={formik.values.shiftTypeId}
                totalHours={formik.values.totalHours}
                setFieldValue={formik.setFieldValue}
              />

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomSelectField
                    id="staffId"
                    placeholder="Staff Member"
                    value={formik.values.staffId}
                    onChange={(value) => formik.setFieldValue('staffId', value)}
                    required
                    options={staffOptions}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="shiftTypeId"
                    placeholder="Shift Type"
                    value={formik.values.shiftTypeId}
                    onChange={(value) =>
                      formik.setFieldValue('shiftTypeId', value)
                    }
                    required
                    options={SAMPLE_ROSTER_SHIFT_TYPES}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="department"
                    type="text"
                    placeholder="Department"
                    value={formik.values.department}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="unit"
                    type="text"
                    placeholder="Unit / Ward"
                    value={formik.values.unit}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="designation"
                    type="text"
                    placeholder="Designation"
                    value={formik.values.designation}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="rosterDate"
                    placeholder="Roster Date"
                    value={formik.values.rosterDate}
                    onChange={(value) =>
                      formik.setFieldValue('rosterDate', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="totalHours"
                    type="text"
                    placeholder="Total Hours"
                    value={formik.values.totalHours}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="otHours"
                    type="number"
                    placeholder="OT Hours"
                    value={formik.values.otHours}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={SAMPLE_ALLOCATION_STATUS_OPTIONS}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="comments"
                  type="textarea"
                  placeholder="Comments"
                  value={formik.values.comments}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by: {auditCreatedBy}
                    {auditCreatedAt !== '—' ? ` · ${auditCreatedAt}` : null}
                  </p>
                  <p className="sm:text-right">
                    Last updated: {auditUpdatedBy}
                    {auditUpdatedAt !== '—' ? ` · ${auditUpdatedAt}` : null}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  className="gap-1.5"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {saveLabel}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
