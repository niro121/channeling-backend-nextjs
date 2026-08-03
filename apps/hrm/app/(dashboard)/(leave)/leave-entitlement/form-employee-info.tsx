'use client';

import { Formik, Form } from 'formik';
import { format } from 'date-fns';
import { SaveIcon, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label
} from '@archmage/ui';

export type EmployeeInfoFormValues = {
  employeeId: string;
  leaveTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  entitledDaysPerYear: string;
};

type FilterOption = {
  id: string;
  name: string;
};

type AuditInfo = {
  name: string;
  position?: string | null;
  at: Date | string | null;
};

type FormEmployeeInfoProps = {
  employeeOptions?: FilterOption[];
  leaveTypeOptions?: FilterOption[];
  initialValues?: Partial<EmployeeInfoFormValues>;
  createdBy?: AuditInfo | null;
  lastUpdatedBy?: AuditInfo | null;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const defaultEmployeeOptions: FilterOption[] = [
  { id: 'emp-1', name: 'Nimal Perera' },
  { id: 'emp-2', name: 'Kamal Silva' },
  { id: 'emp-3', name: 'Samanthi Fernando' }
];

const defaultLeaveTypeOptions: FilterOption[] = [
  { id: 'annual', name: 'Annual Leave' },
  { id: 'casual', name: 'Casual Leave' },
  { id: 'medical', name: 'Medical Leave' },
  { id: 'maternity', name: 'Maternity Leave' }
];

const emptyValues: EmployeeInfoFormValues = {
  employeeId: '',
  leaveTypeId: '',
  fromDate: null,
  toDate: null,
  entitledDaysPerYear: ''
};

function formatAuditLine(info?: AuditInfo | null): string {
  if (!info?.name || !info.at) return '—';

  const date = info.at instanceof Date ? info.at : new Date(info.at);
  if (Number.isNaN(date.getTime())) return '—';

  const namePart = info.position
    ? `${info.name} (${info.position})`
    : info.name;
  const datePart = format(date, 'do MMM yyyy');
  const timePart = format(date, 'HH:mm');

  return `${namePart} · ${datePart} · ${timePart}`;
}

/** UI-only employee information form for leave entitlement. Actions are stubs for now. */
export default function FormEmployeeInfo({
  employeeOptions = defaultEmployeeOptions,
  leaveTypeOptions = defaultLeaveTypeOptions,
  initialValues,
  createdBy = {
    name: 'Admin User',
    position: 'HR Manager',
    at: new Date('2025-08-12T09:15:00')
  },
  lastUpdatedBy = {
    name: 'Nimal Perera',
    position: 'HR Officer',
    at: new Date('2025-08-12T14:30:00')
  }
}: FormEmployeeInfoProps) {
  const formInitialValues: EmployeeInfoFormValues = {
    ...emptyValues,
    ...initialValues
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">
            Employee Information
          </CardTitle>
          <CardDescription>
            Configure leave entitlement details for the selected employee.
          </CardDescription>
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
                <div className="grid grid-cols-1 gap-4">
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Employee
                      <span className="text-red-600"> *</span>
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Select Employee"
                        options={employeeOptions}
                        value={formik.values.employeeId}
                        defaultValue=""
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) =>
                          formik.setFieldValue('employeeId', value)
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

                  <CustomFormField
                    type="number"
                    id="entitledDaysPerYear"
                    placeholder="Entitled Days Per Year"
                    value={formik.values.entitledDaysPerYear}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      // TODO: wire delete
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    type="submit"
                    className="gap-1.5"
                    onClick={() => {
                      // TODO: wire save (submit handled by Formik)
                    }}
                  >
                    <SaveIcon className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
          <Card className="rounded-lg border border-border shadow-sm mt-8">
        <CardContent className="space-y-3 pt-6 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="shrink-0 font-semibold text-foreground">
              Created by:
            </span>
            <span className="text-muted-foreground">
              {formatAuditLine(createdBy)}
            </span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="shrink-0 font-semibold text-foreground">
              Last updated:
            </span>
            <span className="text-muted-foreground">
              {formatAuditLine(lastUpdatedBy)}
            </span>
          </div>
        </CardContent>
      </Card>
        </CardContent>
      </Card>
    </div>
  );
}
