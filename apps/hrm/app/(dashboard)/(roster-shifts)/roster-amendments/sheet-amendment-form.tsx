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
  NEXT_AMENDMENT_NO,
  SAMPLE_AMENDMENT_AUDIT,
  SAMPLE_AMENDMENT_REQUESTERS,
  SAMPLE_AMENDMENT_SHIFTS,
  SAMPLE_AMENDMENT_STAFF,
  SAMPLE_AMENDMENT_STATUS,
  SAMPLE_AMENDMENT_TYPES,
  type RosterAmendmentSample
} from './sample-data';
import type { AmendmentFormSheetMode } from './roster-amendments-ui-context';

export type AmendmentFormValues = {
  amendmentNo: string;
  amendmentTypeId: string;
  staffId: string;
  rosterDate: Date | null;
  originalShift: string;
  amendedShiftId: string;
  requestedById: string;
  status: string;
  reason: string;
  remarks: string;
};

type SheetAmendmentFormProps = {
  open: boolean;
  mode: AmendmentFormSheetMode;
  sample: RosterAmendmentSample | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function originalShiftForStaff(staffId: string): string {
  return (
    SAMPLE_AMENDMENT_STAFF.find((s) => s.id === staffId)?.originalShiftLabel ??
    ''
  );
}

function emptyValues(): AmendmentFormValues {
  return {
    amendmentNo: NEXT_AMENDMENT_NO,
    amendmentTypeId: '',
    staffId: '',
    rosterDate: null,
    originalShift: '',
    amendedShiftId: '',
    requestedById: '',
    status: 'pending_approval',
    reason: '',
    remarks: ''
  };
}

function sampleToFormValues(
  sample: RosterAmendmentSample
): AmendmentFormValues {
  return {
    amendmentNo: sample.amendmentNo,
    amendmentTypeId: sample.amendmentTypeId,
    staffId: sample.staffId,
    rosterDate: sample.rosterDate ? parseISO(sample.rosterDate) : null,
    originalShift:
      SAMPLE_AMENDMENT_SHIFTS.find((s) => s.id === sample.originalShiftId)
        ?.label ?? sample.originalShift,
    amendedShiftId: sample.amendedShiftId,
    requestedById: sample.requestedById,
    status: sample.status,
    reason: sample.reason,
    remarks: sample.remarks
  };
}

function AutoOriginalShift({
  staffId,
  setFieldValue
}: {
  staffId: string;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
}) {
  const previousStaffId = useRef(staffId);
  useEffect(() => {
    if (previousStaffId.current === staffId) return;
    previousStaffId.current = staffId;
    void setFieldValue('originalShift', originalShiftForStaff(staffId));
  }, [setFieldValue, staffId]);
  return null;
}

function AutoCancellationShift({
  amendmentTypeId,
  setFieldValue
}: {
  amendmentTypeId: string;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
}) {
  useEffect(() => {
    if (amendmentTypeId === 'duty_cancellation') {
      void setFieldValue('amendedShiftId', '');
    }
  }, [amendmentTypeId, setFieldValue]);
  return null;
}

const LATER = 'Will be wired in a later phase.';

export default function SheetAmendmentForm({
  open,
  mode,
  sample,
  onOpenChange
}: SheetAmendmentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        amendmentTypeId: Yup.string().required('Amendment type is required'),
        staffId: Yup.string().required('Staff member is required'),
        rosterDate: Yup.date().nullable().required('Roster date is required'),
        amendedShiftId: Yup.string().when('amendmentTypeId', {
          is: 'duty_cancellation',
          then: (schema) => schema,
          otherwise: (schema) => schema.required('Amended shift is required')
        }),
        requestedById: Yup.string().required('Requested by is required'),
        status: Yup.string().required('Approval status is required'),
        reason: Yup.string()
          .required('Reason for amendment is required')
          .max(500, 'Must be less than 500 characters'),
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (sample && isEdit) return sampleToFormValues(sample);
    return emptyValues();
  }, [isEdit, sample]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{isEdit ? 'Edit Amendment' : 'New Amendment'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the record. All changes are captured in the audit trail.'
              : 'Raise an amendment against a published roster entry.'}
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async () => {
            setLoading(true);
            toast({
              title: isEdit ? 'Update amendment' : 'Save amendment',
              description: LATER
            });
            setLoading(false);
            onOpenChange(false);
          }}
        >
          {(formik) => {
            const isCancellation =
              formik.values.amendmentTypeId === 'duty_cancellation';

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                <AutoOriginalShift
                  staffId={formik.values.staffId}
                  setFieldValue={formik.setFieldValue}
                />
                <AutoCancellationShift
                  amendmentTypeId={formik.values.amendmentTypeId}
                  setFieldValue={formik.setFieldValue}
                />

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CustomFormField
                      id="amendmentNo"
                      type="text"
                      placeholder="Amendment No"
                      value={formik.values.amendmentNo}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="amendmentTypeId"
                      placeholder="Amendment Type"
                      value={formik.values.amendmentTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('amendmentTypeId', value)
                      }
                      required
                      options={SAMPLE_AMENDMENT_TYPES}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="staffId"
                      placeholder="Staff Member"
                      value={formik.values.staffId}
                      onChange={(value) =>
                        formik.setFieldValue('staffId', value)
                      }
                      required
                      options={SAMPLE_AMENDMENT_STAFF}
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
                      id="originalShift"
                      type="text"
                      placeholder="Original Shift"
                      value={formik.values.originalShift}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="amendedShiftId"
                      placeholder="Amended Shift"
                      value={formik.values.amendedShiftId}
                      onChange={(value) =>
                        formik.setFieldValue('amendedShiftId', value)
                      }
                      required={!isCancellation}
                      disabled={isCancellation}
                      options={SAMPLE_AMENDMENT_SHIFTS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="requestedById"
                      placeholder="Requested By"
                      value={formik.values.requestedById}
                      onChange={(value) =>
                        formik.setFieldValue('requestedById', value)
                      }
                      required
                      options={SAMPLE_AMENDMENT_REQUESTERS}
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
                      options={SAMPLE_AMENDMENT_STATUS}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="reason"
                    type="textarea"
                    placeholder="Reason for Amendment"
                    value={formik.values.reason}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="remarks"
                    type="textarea"
                    placeholder="Approver Remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      Created by:{' '}
                      {showAudit ? SAMPLE_AMENDMENT_AUDIT.createdBy : '—'}
                      {showAudit
                        ? ` · ${formatAuditDateTime(SAMPLE_AMENDMENT_AUDIT.createdAt)}`
                        : null}
                    </p>
                    <p className="sm:text-right">
                      Last updated:{' '}
                      {showAudit ? SAMPLE_AMENDMENT_AUDIT.updatedBy : '—'}
                      {showAudit
                        ? ` · ${formatAuditDateTime(SAMPLE_AMENDMENT_AUDIT.updatedAt)}`
                        : null}
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
                    {isEdit ? 'Save Changes' : 'Save Amendment'}
                  </Button>
                </SheetFooter>
              </Form>
            );
          }}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
