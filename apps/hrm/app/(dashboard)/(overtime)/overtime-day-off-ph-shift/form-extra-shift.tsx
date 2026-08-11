'use client';

import { useMemo, useState } from 'react';
import { Formik, Form, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { CirclePlay, RotateCcw, SaveIcon, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  CustomAlertDialog,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label,
  useToast
} from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  CustomDateTimePartsField,
  clampDateTimeParts,
  emptyDateTimeParts,
  parseDateTimeParts,
  type DateTimeParts
} from '@/components/custom/custom-datetime-parts';
import {
  type ExtraShiftFilterOption,
  type ExtraShiftRecord,
  type ExtraShiftType
} from './sample-data';

export type ExtraShiftFormValues = {
  formNumber: string;
  staffId: string;
  shiftDate: Date | null;
  shiftType: ExtraShiftType | '';
  fromParts: DateTimeParts;
  toParts: DateTimeParts;
  approverId: string;
  approvedDate: Date | null;
  deleteComment: string;
};

type FormExtraShiftProps = {
  staffOptions: ExtraShiftFilterOption[];
  approverOptions: ExtraShiftFilterOption[];
  selectedRecord?: ExtraShiftRecord | null;
  onClearSelection?: () => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const SHIFT_TYPE_OPTIONS = [
  { id: 'DO', name: 'DO' },
  { id: 'PH', name: 'PH' }
];

const emptyValues: ExtraShiftFormValues = {
  formNumber: '',
  staffId: '',
  shiftDate: null,
  shiftType: 'DO',
  fromParts: { ...emptyDateTimeParts },
  toParts: { ...emptyDateTimeParts },
  approverId: '',
  approvedDate: null,
  deleteComment: ''
};

const validationSchema = Yup.object({
  staffId: Yup.string().required('Staff is required'),
  shiftDate: Yup.date().nullable().required('Shift date is required'),
  shiftType: Yup.string().required('Type is required'),
  deleteComment: Yup.string().optional()
});

function recordToFormValues(record: ExtraShiftRecord): ExtraShiftFormValues {
  const shiftDate = record.fromAt ? new Date(record.fromAt.replace(' ', 'T')) : null;
  const approvedDate = record.approvedAt
    ? new Date(record.approvedAt.replace(' ', 'T'))
    : null;
  return {
    formNumber: record.formNumber,
    staffId: record.staffId,
    shiftDate: shiftDate && !Number.isNaN(shiftDate.getTime()) ? shiftDate : null,
    shiftType: record.shiftType,
    fromParts: parseDateTimeParts(record.fromAt),
    toParts: parseDateTimeParts(record.toAt),
    approverId: record.approverId,
    approvedDate:
      approvedDate && !Number.isNaN(approvedDate.getTime()) ? approvedDate : null,
    deleteComment: ''
  };
}

function formatAuditLine(
  name?: string,
  position?: string,
  at?: string | null
): string {
  if (!name || !at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '—';
  const namePart = position ? `${name} (${position})` : name;
  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}

export default function FormExtraShift({
  staffOptions,
  approverOptions,
  selectedRecord = null,
  onClearSelection
}: FormExtraShiftProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canSave =
    has('overtime-requests', 'add') || has('overtime-requests', 'edit');
  const canDelete = has('overtime-requests', 'delete');
  const isEdit = Boolean(selectedRecord?.id);

  const initialValues = useMemo(
    () => (selectedRecord ? recordToFormValues(selectedRecord) : emptyValues),
    [selectedRecord]
  );

  const handleSubmit = (
    _values: ExtraShiftFormValues,
    { resetForm }: FormikHelpers<ExtraShiftFormValues>
  ) => {
    toast({
      title: 'Not saved',
      description: 'Day Off / PH shift forms will be persisted in the CRUD phase.'
    });
    if (!isEdit) {
      resetForm({ values: emptyValues });
      onClearSelection?.();
    }
  };

  return (
    <>
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">
            Day Off / PH Shift Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {(formik) => (
              <Form className="space-y-4">
                <CustomFormField
                  type="text"
                  id="formNumber"
                  placeholder="Form Number"
                  value={formik.values.formNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Staff
                    <span className="text-red-600"> *</span>
                  </Label>
                  <div className={fieldStyleClasses.inputClassName}>
                    <Combobox
                      label="Select Staff"
                      options={staffOptions}
                      value={formik.values.staffId}
                      defaultValue=""
                      clearable
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                      onChange={(value) => formik.setFieldValue('staffId', value)}
                    />
                  </div>
                  {formik.touched.staffId && formik.errors.staffId ? (
                    <p className="text-xs text-destructive">
                      {formik.errors.staffId}
                    </p>
                  ) : null}
                </div>

                <CustomDatePickerField
                  id="shiftDate"
                  placeholder="Shift Date"
                  value={formik.values.shiftDate}
                  onChange={(date) =>
                    formik.setFieldValue('shiftDate', date ?? null)
                  }
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                  error={formik.errors.shiftDate as string | undefined}
                  touched={formik.touched.shiftDate}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 5}
                />

                <div className="space-y-2">
                  <Label className={fieldStyleClasses.labelClassName}>Type</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-1.5"
                      onClick={() => {
                        if (!formik.values.staffId || !formik.values.shiftDate) {
                          toast({
                            variant: 'destructive',
                            title: 'Missing details',
                            description:
                              'Select staff and shift date before processing the staff shift.'
                          });
                          return;
                        }
                        const date = formik.values.shiftDate;
                        const year = String(date.getFullYear());
                        const month = String(date.getMonth() + 1);
                        const day = String(date.getDate());
                        formik.setFieldValue(
                          'fromParts',
                          clampDateTimeParts({
                            year,
                            month,
                            day,
                            hour: '00',
                            minute: '00',
                            second: '00'
                          })
                        );
                        formik.setFieldValue(
                          'toParts',
                          clampDateTimeParts({
                            year,
                            month,
                            day,
                            hour: '08',
                            minute: '30',
                            second: '00'
                          })
                        );
                        toast({
                          title: 'Sample shift applied',
                          description:
                            'Process Staff Shift will use roster data in a later phase.'
                        });
                      }}
                    >
                      <CirclePlay className="h-4 w-4" />
                      Process Staff Shift
                    </Button>
                    <div className="min-w-0 flex-1">
                      <CustomSelectField
                        id="shiftType"
                        placeholder="Type"
                        options={SHIFT_TYPE_OPTIONS}
                        value={formik.values.shiftType}
                        onChange={(value) =>
                          formik.setFieldValue('shiftType', value)
                        }
                        required
                        styleClasses={{
                          ...fieldStyleClasses,
                          labelClassName: 'sr-only'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <CustomDateTimePartsField
                  id="fromParts"
                  label="From Time"
                  value={formik.values.fromParts}
                  onChange={(next) => formik.setFieldValue('fromParts', next)}
                  showCombined
                />

                <CustomDateTimePartsField
                  id="toParts"
                  label="To Time"
                  value={formik.values.toParts}
                  onChange={(next) => formik.setFieldValue('toParts', next)}
                  showCombined
                />

                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Approved Staff
                  </Label>
                  <div className={fieldStyleClasses.inputClassName}>
                    <Combobox
                      label="Search approver"
                      options={approverOptions}
                      value={formik.values.approverId}
                      defaultValue=""
                      clearable
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                      onChange={(value) =>
                        formik.setFieldValue('approverId', value)
                      }
                    />
                  </div>
                </div>

                <CustomDatePickerField
                  id="approvedDate"
                  placeholder="Approved Date"
                  value={formik.values.approvedDate}
                  onChange={(date) =>
                    formik.setFieldValue('approvedDate', date ?? null)
                  }
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 5}
                />

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {canSave ? (
                    <Button type="submit" className="h-9 gap-1.5">
                      <SaveIcon className="h-4 w-4" />
                      Save
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      formik.resetForm({ values: emptyValues });
                      onClearSelection?.();
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  {canDelete && isEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <CustomFormField
                      type="text"
                      id="deleteComment"
                      placeholder="Delete Comment"
                      value={formik.values.deleteComment}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </div>

                <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="shrink-0 font-semibold text-foreground">
                      Created by:
                    </span>
                    <span className="text-muted-foreground">
                      {formatAuditLine(
                        selectedRecord?.createdByName,
                        selectedRecord?.createdByPosition,
                        selectedRecord?.createdAt
                      )}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="shrink-0 font-semibold text-foreground">
                      Last updated:
                    </span>
                    <span className="text-muted-foreground">
                      {formatAuditLine(
                        selectedRecord?.updatedByName,
                        selectedRecord?.updatedByPosition,
                        selectedRecord?.updatedAt
                      )}
                    </span>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        loading={false}
        title="Delete Day Off / PH shift form?"
        description="This action cannot be undone. Saving is wired in the CRUD phase."
        handleContinue={() => {
          toast({
            title: 'Not saved',
            description: 'Day Off / PH shift delete will be wired in the CRUD phase.'
          });
          setDeleteOpen(false);
          onClearSelection?.();
        }}
      />
    </>
  );
}
