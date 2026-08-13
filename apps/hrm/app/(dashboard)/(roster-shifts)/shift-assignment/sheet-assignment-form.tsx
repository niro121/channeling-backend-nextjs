'use client';

import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
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
  SAMPLE_ASSIGNMENT_AUDIT,
  SAMPLE_ASSIGNMENT_STATUS,
  SAMPLE_ROTATION_PATTERNS,
  SAMPLE_SHIFT_TYPES,
  SAMPLE_STAFF_OPTIONS,
  SAMPLE_WEEKLY_OFF_DAYS,
  type ShiftAssignmentSample
} from './sample-data';
import type { ShiftAssignmentFormSheetMode } from './shift-assignment-ui-context';

export type AssignmentFormValues = {
  staffId: string;
  shiftTypeId: string;
  rotationPatternId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  weeklyOffDayId: string;
  status: string;
  autoAssign: boolean;
};

type SheetAssignmentFormProps = {
  open: boolean;
  mode: ShiftAssignmentFormSheetMode;
  sample: ShiftAssignmentSample | null;
  selectedCount: number;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const emptyValues: AssignmentFormValues = {
  staffId: '',
  shiftTypeId: '',
  rotationPatternId: 'fixed',
  effectiveFrom: null,
  effectiveTo: null,
  weeklyOffDayId: 'sunday',
  status: 'active',
  autoAssign: true
};

function sampleToFormValues(sample: ShiftAssignmentSample): AssignmentFormValues {
  return {
    staffId: sample.staffId,
    shiftTypeId: sample.shiftTypeId,
    rotationPatternId: sample.rotationPatternId,
    effectiveFrom: sample.effectiveFrom
      ? parseISO(sample.effectiveFrom)
      : null,
    effectiveTo: sample.effectiveTo ? parseISO(sample.effectiveTo) : null,
    weeklyOffDayId: sample.weeklyOffDayId,
    status: sample.status,
    autoAssign: sample.autoAssign
  };
}

function sheetCopy(mode: ShiftAssignmentFormSheetMode) {
  if (mode === 'edit') {
    return {
      title: 'Edit Shift Assignment',
      description: 'Update the record. All changes are captured in the audit trail.',
      saveLabel: 'Save Changes'
    };
  }
  if (mode === 'bulk') {
    return {
      title: 'Bulk Assign Shift',
      description: 'Apply one shift assignment to all selected staff members.',
      saveLabel: 'Save Assignment'
    };
  }
  return {
    title: 'Assign Shift',
    description: 'Assign a shift type to an individual staff member.',
    saveLabel: 'Save Assignment'
  };
}

const LATER = 'Will be wired in a later phase.';

export default function SheetAssignmentForm({
  open,
  mode,
  sample,
  selectedCount,
  onOpenChange
}: SheetAssignmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const copy = sheetCopy(mode);
  const isBulk = mode === 'bulk';
  const showStaff = mode !== 'bulk';

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: showStaff
          ? Yup.string().required('Staff member is required')
          : Yup.string(),
        shiftTypeId: Yup.string().required('Shift type is required'),
        rotationPatternId: Yup.string().required('Rotation pattern is required'),
        effectiveFrom: Yup.date()
          .nullable()
          .required('Effective from is required'),
        weeklyOffDayId: Yup.string().required('Weekly off day is required'),
        status: Yup.string().required('Status is required')
      }),
    [showStaff]
  );

  const initialValues = useMemo(() => {
    if (sample && mode === 'edit') return sampleToFormValues(sample);
    return emptyValues;
  }, [mode, sample]);

  const showAudit = mode === 'edit';
  const auditCreatedBy = showAudit
    ? SAMPLE_ASSIGNMENT_AUDIT.createdBy
    : '—';
  const auditCreatedAt = showAudit
    ? formatAuditDateTime(SAMPLE_ASSIGNMENT_AUDIT.createdAt)
    : '—';
  const auditUpdatedBy = showAudit
    ? SAMPLE_ASSIGNMENT_AUDIT.updatedBy
    : '—';
  const auditUpdatedAt = showAudit
    ? formatAuditDateTime(SAMPLE_ASSIGNMENT_AUDIT.updatedAt)
    : '—';

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
          onSubmit={async () => {
            setLoading(true);
            toast({
              title:
                mode === 'edit'
                  ? 'Update shift assignment'
                  : mode === 'bulk'
                    ? 'Bulk assign shift'
                    : 'Assign shift',
              description: LATER
            });
            setLoading(false);
            onOpenChange(false);
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {isBulk ? (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                    {selectedCount} staff selected — the assignment below
                    applies to every selected staff member.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {showStaff ? (
                    <div className="sm:col-span-2">
                      <CustomSelectField
                        id="staffId"
                        placeholder="Staff Member"
                        value={formik.values.staffId}
                        onChange={(value) =>
                          formik.setFieldValue('staffId', value)
                        }
                        required
                        options={SAMPLE_STAFF_OPTIONS}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>
                  ) : null}

                  <CustomSelectField
                    id="shiftTypeId"
                    placeholder="Shift Type"
                    value={formik.values.shiftTypeId}
                    onChange={(value) =>
                      formik.setFieldValue('shiftTypeId', value)
                    }
                    required
                    options={SAMPLE_SHIFT_TYPES}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="rotationPatternId"
                    placeholder="Rotation Pattern"
                    value={formik.values.rotationPatternId}
                    onChange={(value) =>
                      formik.setFieldValue('rotationPatternId', value)
                    }
                    required
                    options={SAMPLE_ROTATION_PATTERNS}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="effectiveFrom"
                    placeholder="Effective From"
                    value={formik.values.effectiveFrom}
                    onChange={(value) =>
                      formik.setFieldValue('effectiveFrom', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="effectiveTo"
                    placeholder="Effective To"
                    value={formik.values.effectiveTo}
                    onChange={(value) =>
                      formik.setFieldValue('effectiveTo', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="weeklyOffDayId"
                    placeholder="Weekly Off Day"
                    value={formik.values.weeklyOffDayId}
                    onChange={(value) =>
                      formik.setFieldValue('weeklyOffDayId', value)
                    }
                    required
                    options={SAMPLE_WEEKLY_OFF_DAYS}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={SAMPLE_ASSIGNMENT_STATUS}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label
                      htmlFor="autoAssign"
                      className="cursor-pointer text-sm font-semibold text-foreground"
                    >
                      Auto Assign
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generate roster entries automatically from the rotation
                      pattern.
                    </p>
                  </div>
                  <Switch
                    id="autoAssign"
                    checked={formik.values.autoAssign}
                    onCheckedChange={(checked) =>
                      formik.setFieldValue('autoAssign', checked)
                    }
                    className="shrink-0"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
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
