'use client';

import { useState } from 'react';
import { Formik, Form } from 'formik';
import { format } from 'date-fns';
import {
  CirclePlay,
  Plane,
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
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label
} from '@archmage/ui';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type LeaveFormDetailsValues = {
  formNumber: string;
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  requestedDate: Date | null;
  approverId: string;
  approvedDate: Date | null;
  lieuShiftId: string;
  comment: string;
  outWithCancel: boolean;
};

type FilterOption = {
  id: string;
  name: string;
};

type LeaveBalanceSnapshot = {
  entitle: number;
  utilized: number;
  balance: number;
};

type ShiftRow = {
  id: string;
  shift: string;
  from: string;
  to: string;
};

type AuditInfo = {
  name: string;
  position?: string | null;
  at: Date | string | null;
};

type FormLeaveDetailsProps = {
  staffOptions?: FilterOption[];
  leaveTypeOptions?: FilterOption[];
  approverOptions?: FilterOption[];
  shiftOptions?: FilterOption[];
  initialValues?: Partial<LeaveFormDetailsValues>;
  createdBy?: AuditInfo | null;
  lastUpdatedBy?: AuditInfo | null;
  leaveBalance?: {
    total: number;
    used: number;
    remaining: number;
  };
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const emptyValues: LeaveFormDetailsValues = {
  formNumber: '',
  staffId: '',
  leaveTypeId: '',
  fromDate: null,
  toDate: null,
  requestedDate: null,
  approverId: '',
  approvedDate: null,
  lieuShiftId: '',
  comment: '',
  outWithCancel: false
};

const defaultBalance: LeaveBalanceSnapshot = {
  entitle: 14,
  utilized: 2,
  balance: 12
};

const sampleShiftRows: ShiftRow[] = [
  {
    id: '1',
    shift: '8.30–4.30',
    from: 'Wed Apr 15 08:30',
    to: 'Wed Apr 15 16:30'
  },
  {
    id: '2',
    shift: '8.30–4.30',
    from: 'Thu Apr 16 08:30',
    to: 'Thu Apr 16 16:30'
  }
];

function formatAuditLine(info?: AuditInfo | null): string {
  if (!info?.name || !info.at) return '—';

  const date = info.at instanceof Date ? info.at : new Date(info.at);
  if (Number.isNaN(date.getTime())) return '—';

  const namePart = info.position
    ? `${info.name} (${info.position})`
    : info.name;
  const datePart = format(date, 'd MMM yyyy');
  const timePart = format(date, 'HH:mm');

  return `${namePart} · ${datePart} · ${timePart}`;
}

/** UI-only leave application form for the left panel. Actions are stubs for now. */
export default function FormLeaveDetails({
  staffOptions = [],
  leaveTypeOptions = [],
  approverOptions = [],
  shiftOptions = [
    { id: 'shift-1', name: 'Morning 08:30–16:30' },
    { id: 'shift-2', name: 'Evening 14:00–22:00' },
    { id: 'shift-3', name: 'Night 22:00–06:00' }
  ],
  initialValues,
  createdBy = {
    name: 'N. Silva',
    position: 'HR Officer',
    at: new Date('2025-08-12T09:14:00')
  },
  lastUpdatedBy = {
    name: 'K. Fernando',
    position: 'Payroll Admin',
    at: new Date('2025-08-18T15:42:00')
  },
  leaveBalance = { total: 21, used: 12, remaining: 9 }
}: FormLeaveDetailsProps) {
  const [balance, setBalance] = useState<LeaveBalanceSnapshot>(defaultBalance);
  const [shiftRows, setShiftRows] = useState<ShiftRow[]>([]);

  const formInitialValues: LeaveFormDetailsValues = {
    ...emptyValues,
    ...initialValues
  };

  const utilisationPercent =
    leaveBalance.total > 0
      ? Math.round((leaveBalance.used / leaveBalance.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">
            Leave Form Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={formInitialValues}
            enableReinitialize
            onSubmit={() => {
              // TODO: wire save
            }}
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
                      onChange={(value) =>
                        formik.setFieldValue('staffId', value)
                      }
                    />
                  </div>
                </div>

                <CustomSelectField
                  id="leaveTypeId"
                  placeholder="Leave Type"
                  options={leaveTypeOptions}
                  value={formik.values.leaveTypeId}
                  onChange={(value) =>
                    formik.setFieldValue('leaveTypeId', value)
                  }
                  required
                  styleClasses={fieldStyleClasses}
                />

                <CustomDatePickerField
                  id="fromDate"
                  placeholder="From Date"
                  value={formik.values.fromDate}
                  onChange={(date) =>
                    formik.setFieldValue('fromDate', date ?? null)
                  }
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                  error={formik.errors.fromDate as string | undefined}
                  touched={formik.touched.fromDate}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 5}
                />

                <CustomDatePickerField
                  id="toDate"
                  placeholder="To Date"
                  value={formik.values.toDate}
                  onChange={(date) =>
                    formik.setFieldValue('toDate', date ?? null)
                  }
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                  error={formik.errors.toDate as string | undefined}
                  touched={formik.touched.toDate}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 5}
                />

                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      setBalance({
                        entitle: 14,
                        utilized: 2,
                        balance: 12
                      });
                    }}
                  >
                    <CirclePlay className="h-4 w-4" />
                    Recalculate
                  </Button>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Entitle
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums">
                        {balance.entitle.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Utilized
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-orange-600">
                        {balance.utilized.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Balance
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">
                        {balance.balance.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      setShiftRows(sampleShiftRows);
                    }}
                  >
                    <CirclePlay className="h-4 w-4" />
                    Process Shift
                  </Button>
                  <div className="overflow-hidden rounded-md border border-border bg-background">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">Shift</th>
                          <th className="px-2 py-1.5 font-medium">From</th>
                          <th className="px-2 py-1.5 font-medium">To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-2 py-3 text-center text-muted-foreground"
                            >
                              No shifts processed
                            </td>
                          </tr>
                        ) : (
                          shiftRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-border"
                            >
                              <td className="whitespace-nowrap px-2 py-1.5">
                                {row.shift}
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                {row.from}
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                {row.to}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      // TODO: wire process lieu shift
                    }}
                  >
                    <CirclePlay className="h-4 w-4" />
                    Process Lieu Shift
                  </Button>
                  <div className={fieldStyleClasses.parentDiv}>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Select Staff Shift"
                        options={shiftOptions}
                        value={formik.values.lieuShiftId}
                        defaultValue=""
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) =>
                          formik.setFieldValue('lieuShiftId', value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <CustomDatePickerField
                  id="requestedDate"
                  placeholder="Requested Date"
                  value={formik.values.requestedDate}
                  onChange={(date) =>
                    formik.setFieldValue('requestedDate', date ?? null)
                  }
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 5}
                />

                <div className={fieldStyleClasses.parentDiv}>
                  <Label className={fieldStyleClasses.labelClassName}>
                    Leave Approved Person
                  </Label>
                  <div className={fieldStyleClasses.inputClassName}>
                    <Combobox
                      label="Search staff"
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
                  placeholder="Leave Approved Date"
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
                  <Button type="submit" className="h-9 gap-1.5">
                    <SaveIcon className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      formik.resetForm({ values: emptyValues });
                      setBalance(defaultBalance);
                      setShiftRows([]);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <RadioGroup
                    value={formik.values.outWithCancel ? 'yes' : ''}
                    onValueChange={() => undefined}
                    className="flex items-center"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem
                        value="yes"
                        id="with-out-cancel"
                        onClick={(event) => {
                          event.preventDefault();
                          formik.setFieldValue(
                            'outWithCancel',
                            !formik.values.outWithCancel
                          );
                        }}
                      />
                      <Label
                        htmlFor="with-out-cancel"
                        className="cursor-pointer font-normal"
                        onClick={(event) => {
                          event.preventDefault();
                          formik.setFieldValue(
                            'outWithCancel',
                            !formik.values.outWithCancel
                          );
                        }}
                      >
                        With Out Cancel
                      </Label>
                    </div>
                  </RadioGroup>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      // TODO: wire delete
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>

                <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="shrink-0 font-semibold text-foreground">
                      Created by:
                    </span>
                    <span className="text-muted-foreground">
                      {formatAuditLine(createdBy)}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="shrink-0 font-semibold text-foreground">
                      Last updated:
                    </span>
                    <span className="text-muted-foreground">
                      {formatAuditLine(lastUpdatedBy)}
                    </span>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="relative rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
              <Plane className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {leaveBalance.total}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Used
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {leaveBalance.used}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {leaveBalance.remaining}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Utilisation</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {utilisationPercent}%
              </span>
            </div>
            <Progress value={utilisationPercent} className="h-2.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
