'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { saveRosterAllocationDraftAction } from '@/app/actions/roster-actions/shift-roster.actions';
import type { ShiftTypeChip } from '@/types/roster';
import type { RosterAllocationFormTarget } from './shift-roster-ui-context';

type StaffOption = {
  id: string;
  name: string;
  staffCode: string;
  department: string;
  unit: string;
  designation: string;
};

export type RosterAllocationFormValues = {
  staffId: string;
  shiftTypeId: string;
  department: string;
  unit: string;
  designation: string;
  rosterDate: Date | null;
  isLeave: boolean;
  totalHours: string;
  otHours: string;
  status: string;
  comments: string;
};

type SheetRosterAllocationFormProps = {
  open: boolean;
  target: RosterAllocationFormTarget;
  staffOptions: StaffOption[];
  shiftTypes: ShiftTypeChip[];
  periodFromDate: string;
  periodToDate: string;
  rosterValue: string;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const STATUS_OPTIONS = [
  { id: 'draft', name: 'Draft' },
  { id: 'published', name: 'Published' },
  { id: 'amended', name: 'Amended' }
];

const validationSchema = Yup.object({
  staffId: Yup.string().required('Staff member is required'),
  shiftTypeId: Yup.string().required('Shift type is required'),
  rosterDate: Yup.date().nullable().required('Roster date is required'),
  isLeave: Yup.boolean().required(),
  otHours: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('OT hours are required'),
  status: Yup.string().required('Status is required'),
  comments: Yup.string().max(500, 'Must be less than 500 characters')
});

function hoursForShiftType(
  shiftTypeId: string,
  shiftTypes: ShiftTypeChip[]
): string {
  const found = shiftTypes.find((s) => s.id === shiftTypeId);
  return found ? String(found.durationHours.toFixed(1)) : '0.0';
}

function buildInitialValues(
  target: RosterAllocationFormTarget,
  staffOptions: StaffOption[],
  shiftTypes: ShiftTypeChip[]
): RosterAllocationFormValues {
  const staffId = target.row?.staffId ?? '';
  const staff =
    staffOptions.find((s) => s.id === staffId) ??
    (target.row
      ? {
          id: target.row.staffId,
          name: target.row.staffName,
          staffCode: target.row.staffCode,
          department: target.row.department,
          unit: target.row.unit,
          designation: target.row.designation
        }
      : null);

  const shiftTypeId = target.shift?.shiftTypeId ?? '';

  return {
    staffId,
    shiftTypeId,
    department: staff?.department ?? '',
    unit: staff?.unit ?? '',
    designation: staff?.designation ?? '',
    rosterDate: target.dateIso ? parseISO(target.dateIso) : null,
    isLeave: target.shift?.isLeave ?? false,
    totalHours: hoursForShiftType(shiftTypeId, shiftTypes),
    otHours:
      target.mode === 'edit' && target.shift
        ? String(target.shift.otHours.toFixed(1))
        : '0.0',
    status: target.shift?.status ?? 'draft',
    comments: ''
  };
}

function AutoStaffMetaSync({
  staffId,
  staffOptions,
  setFieldValue
}: {
  staffId: string;
  staffOptions: StaffOption[];
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
  shiftTypes,
  setFieldValue
}: {
  shiftTypeId: string;
  totalHours: string;
  shiftTypes: ShiftTypeChip[];
  setFieldValue: FormikProps<RosterAllocationFormValues>['setFieldValue'];
}) {
  const next = hoursForShiftType(shiftTypeId, shiftTypes);

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
  shiftTypes,
  periodFromDate,
  periodToDate,
  rosterValue,
  onOpenChange
}: SheetRosterAllocationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const mode = target.mode;

  const shiftTypeOptions = useMemo(
    () => shiftTypes.map((st) => ({ id: st.id, name: st.name })),
    [shiftTypes]
  );

  const initialValues = useMemo(
    () => buildInitialValues(target, staffOptions, shiftTypes),
    [staffOptions, shiftTypes, target]
  );

  const title =
    mode === 'edit' ? 'Edit Roster Allocation' : 'Allocate Shift';
  const description =
    mode === 'edit'
      ? 'Update the record. All changes are captured in the audit trail.'
      : 'Create a new roster allocation for a staff member.';
  const saveLabel = 'Save Draft';

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
          onSubmit={async (values, helpers) => {
            try {
              setLoading(true);
              const response = await saveRosterAllocationDraftAction({
                allocationId: target.shift?.allocationId,
                staffId: values.staffId,
                shiftTypeId: values.shiftTypeId,
                rosterDate: values.rosterDate ?? '',
                periodFromDate,
                periodToDate,
                department: values.department,
                unit: values.unit,
                designation: values.designation,
                roster: rosterValue,
                isLeave: values.isLeave,
                otHours: Number(values.otHours || 0),
                comments: values.comments
              });

              if (response.isError) {
                const errorMap = response.errors as Record<string, string | string[] | undefined>;
                const formErrors: Record<string, string> = {};
                Object.keys(errorMap).forEach((key) => {
                  if (key === 'message') return;
                  const value = errorMap[key];
                  const msg = Array.isArray(value) ? value[0] : value;
                  if (msg) formErrors[key] = msg;
                });
                if (Object.keys(formErrors).length) helpers.setErrors(formErrors);
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    (response.errors.message as string) ??
                    'Roster allocation could not be saved.'
                });
                return;
              }

              toast({
                variant: 'success',
                title: 'Success',
                description:
                  mode === 'edit'
                    ? 'Roster draft updated.'
                    : 'Roster draft saved.'
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
                    : 'Roster allocation could not be saved.'
              });
            } finally {
              setLoading(false);
            }
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
                shiftTypes={shiftTypes}
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
                    options={shiftTypeOptions}
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
                  <CustomSelectField
                    id="isLeave"
                    placeholder="Leave"
                    value={String(formik.values.isLeave)}
                    onChange={(value) =>
                      formik.setFieldValue('isLeave', value === 'true')
                    }
                    required
                    options={[
                      { id: 'false', name: 'No' },
                      { id: 'true', name: 'Yes' }
                    ]}
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
                    options={STATUS_OPTIONS}
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
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
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
