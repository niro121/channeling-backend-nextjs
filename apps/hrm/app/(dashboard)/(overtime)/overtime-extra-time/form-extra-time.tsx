'use client';

import { useMemo, useState } from 'react';
import { Formik, Form, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import {
  CirclePlay,
  RotateCcw,
  SaveIcon,
  Trash2
} from 'lucide-react';
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
  SAMPLE_EXTRA_TIME_SHIFTS,
  type ExtraTimeFilterOption,
  type ExtraTimeRecord,
  type ExtraTimeTimeType
} from './sample-data';

export type ExtraTimeFormValues = {
  formNumber: string;
  staffId: string;
  shiftDate: Date | null;
  shiftId: string;
  timeType: ExtraTimeTimeType | '';
  fromParts: DateTimeParts;
  toParts: DateTimeParts;
  approverId: string;
  comment: string;
  deleteComment: string;
};

type FormExtraTimeProps = {
  staffOptions: ExtraTimeFilterOption[];
  approverOptions: ExtraTimeFilterOption[];
  selectedRecord?: ExtraTimeRecord | null;
  onClearSelection?: () => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const TIME_TYPE_OPTIONS = [
  { id: 'outTime', name: 'outTime' },
  { id: 'inTime', name: 'inTime' }
];

const emptyValues: ExtraTimeFormValues = {
  formNumber: '',
  staffId: '',
  shiftDate: null,
  shiftId: '',
  timeType: 'outTime',
  fromParts: { ...emptyDateTimeParts },
  toParts: { ...emptyDateTimeParts },
  approverId: '',
  comment: '',
  deleteComment: ''
};

const validationSchema = Yup.object({
  staffId: Yup.string().required('Staff is required'),
  shiftDate: Yup.date().nullable().required('Shift date is required'),
  comment: Yup.string().optional(),
  deleteComment: Yup.string().optional()
});

function recordToFormValues(record: ExtraTimeRecord): ExtraTimeFormValues {
  const shiftDate = record.fromAt ? new Date(record.fromAt.replace(' ', 'T')) : null;
  return {
    formNumber: record.formNumber,
    staffId: record.staffId,
    shiftDate: shiftDate && !Number.isNaN(shiftDate.getTime()) ? shiftDate : null,
    shiftId: record.shiftId,
    timeType: record.timeType,
    fromParts: parseDateTimeParts(record.fromAt),
    toParts: parseDateTimeParts(record.toAt),
    approverId: record.approverId,
    comment: record.comment,
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

export default function FormExtraTime({
  staffOptions,
  approverOptions,
  selectedRecord = null,
  onClearSelection
}: FormExtraTimeProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canSave = has('overtime-requests', 'add') || has('overtime-requests', 'edit');
  const canDelete = has('overtime-requests', 'delete');
  const isEdit = Boolean(selectedRecord?.id);

  const initialValues = useMemo(
    () => (selectedRecord ? recordToFormValues(selectedRecord) : emptyValues),
    [selectedRecord]
  );

  const handleSubmit = (
    _values: ExtraTimeFormValues,
    { resetForm }: FormikHelpers<ExtraTimeFormValues>
  ) => {
    toast({
      title: 'Not saved',
      description: 'Extra time forms will be persisted in the CRUD phase.'
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
          <CardTitle className="text-lg font-semibold">Extra Time Form</CardTitle>
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
                    <p className="text-xs text-destructive">{formik.errors.staffId}</p>
                  ) : null}
                </div>

                <CustomDatePickerField
                  id="shiftDate"
                  placeholder="Shift Date"
                  value={formik.values.shiftDate}
                  onChange={(date) => formik.setFieldValue('shiftDate', date ?? null)}
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
                  <Label className={fieldStyleClasses.labelClassName}>Shift</Label>
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
                        formik.setFieldValue('shiftId', 'shift-830-430');
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
                            hour: '16',
                            minute: '30',
                            second: '00'
                          })
                        );
                        formik.setFieldValue(
                          'toParts',
                          clampDateTimeParts({
                            year,
                            month,
                            day,
                            hour: '18',
                            minute: '00',
                            second: '00'
                          })
                        );
                        toast({
                          title: 'Sample shift applied',
                          description: 'Process Staff Shift will use roster data in a later phase.'
                        });
                      }}
                    >
                      <CirclePlay className="h-4 w-4" />
                      Process Staff Shift
                    </Button>
                    <div className="min-w-0 flex-1">
                      <Combobox
                        label="Select shift"
                        options={SAMPLE_EXTRA_TIME_SHIFTS}
                        value={formik.values.shiftId}
                        defaultValue=""
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) => formik.setFieldValue('shiftId', value)}
                      />
                    </div>
                  </div>
                </div>

                <CustomSelectField
                  id="timeType"
                  placeholder="Time Type"
                  options={TIME_TYPE_OPTIONS}
                  value={formik.values.timeType}
                  onChange={(value) => formik.setFieldValue('timeType', value)}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <CustomDateTimePartsField
                  id="fromParts"
                  label="From Time"
                  value={formik.values.fromParts}
                  onChange={(next) => formik.setFieldValue('fromParts', next)}
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
                      onChange={(value) => formik.setFieldValue('approverId', value)}
                    />
                  </div>
                </div>

                <CustomFormField
                  type="textarea"
                  id="comment"
                  placeholder="Comment"
                  value={formik.values.comment}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
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

                {canDelete && isEdit ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
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
                ) : null}

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
        title="Delete extra time form?"
        description="This action cannot be undone. Saving is wired in the CRUD phase."
        handleContinue={() => {
          toast({
            title: 'Not saved',
            description: 'Extra time delete will be wired in the CRUD phase.'
          });
          setDeleteOpen(false);
          onClearSelection?.();
        }}
      />
    </>
  );
}
