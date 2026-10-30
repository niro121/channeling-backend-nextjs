'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Formik, Form, FormikHelpers, useFormikContext } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  Combobox,
  CustomAlertDialog,
  CustomCheckedField,
  CustomFormField,
  CustomSelectField,
  Label,
  Separator,
  useToast
} from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import type {
  EmploymentFormValues,
  StaffEmploymentFormOptions,
  StaffEmploymentRosterOption,
  StaffRecord
} from '@/types/staff';
import {
  BANK_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  PAYING_METHOD_OPTIONS,
  SALARY_PAYMENT_METHOD_OPTIONS
} from '@/types/staff-employment-options';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-category';
import {
  getStaffEmploymentRosterShiftSummaryAction,
  updateStaffEmploymentAction,
  type StaffEmploymentRosterShiftSummary
} from '@/app/actions/staff-actions/staff.actions';
import {
  employmentFormValuesToPayload,
  staffRecordToEmploymentFormValues
} from '@/lib/mappers/staff-employment-details.mapper';

type EmploymentConfirmKind = 'org-change' | 'roster-mismatch';

function formatEmploymentDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'd MMM yyyy');
}

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

function withOrphanOption(
  options: Array<{ id: string; name: string }>,
  currentId: string
) {
  if (!currentId || options.some((o) => o.id === currentId)) return options;
  return [{ id: currentId, name: currentId }, ...options];
}

function findRosterMeta(
  rosters: StaffEmploymentRosterOption[],
  rosterCode: string
): StaffEmploymentRosterOption | undefined {
  if (!rosterCode) return undefined;
  return rosters.find((r) => r.id === rosterCode);
}

function rosterDepartmentMismatch(
  rosters: StaffEmploymentRosterOption[],
  departmentId: string,
  rosterCode: string
): boolean {
  if (!departmentId || !rosterCode) return false;
  const meta = findRosterMeta(rosters, rosterCode);
  if (!meta?.departmentId) return false;
  return meta.departmentId !== departmentId;
}

const optionalString = () =>
  Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value));

const optionalMaxString = (max: number) =>
  optionalString().max(max, `Must be less than ${max} characters`);

const requiredString = (message: string) =>
  Yup.string().trim().required(message);

const optionalNumberString = () =>
  Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .test('is-number', 'Enter a valid number', (value) => {
      if (!value) return true;
      const parsed = Number(value);
      return !Number.isNaN(parsed) && parsed >= 0;
    });

const validationSchema = Yup.object({
  eligibleWelfareValue: optionalNumberString(),
  utilizedThisYear: optionalNumberString(),
  institution: requiredString('Institution is required'),
  department: requiredString('Working department is required'),
  employeeStatus: requiredString('Employee status is required'),
  staffCategory: optionalString(),
  staffGrade: optionalString(),
  staffDesignation: optionalString(),
  basic: Yup.string()
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .test('positive-number', 'Must be a positive number', (value) => {
      if (!value) return true;
      const n = Number(value);
      return Number.isFinite(n) && n > 0;
    }),
  roster: optionalString(),
  shift: optionalString(),
  payingMethod: optionalString(),
  salaryPaymentMethod: optionalString(),
  bank: optionalString(),
  bankBranch: optionalMaxString(100),
  accountNumber: optionalMaxString(50),
  perWeekStandard: optionalNumberString(),
  perWeekOt: optionalNumberString(),
  perWeekNoPay: optionalNumberString(),
  allowedLateInLeave: Yup.boolean(),
  allowedEarlyOutLeave: Yup.boolean(),
  memo: optionalMaxString(2000)
});

const initialValues: EmploymentFormValues = {
  eligibleWelfareValue: '',
  utilizedThisYear: '',
  institution: '',
  department: '',
  employeeStatus: '',
  staffCategory: '',
  staffGrade: '',
  staffDesignation: '',
  basic: '',
  roster: '',
  shift: '',
  payingMethod: '',
  salaryPaymentMethod: '',
  bank: '',
  bankBranch: '',
  accountNumber: '',
  perWeekStandard: '',
  perWeekOt: '',
  perWeekNoPay: '',
  allowedLateInLeave: false,
  allowedEarlyOutLeave: false,
  memo: ''
};

type FormEmploymentProps = {
  staff: StaffRecord;
  staffId: string;
  formOptions?: StaffEmploymentFormOptions;
  onRegisterActions?: (actions: EmploymentFormActions) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export type EmploymentFormActions = {
  submit: (saveAndClose: boolean) => void;
};

function FormActionBridge({
  onRegisterActions,
  saveAndCloseRef
}: {
  onRegisterActions?: (actions: EmploymentFormActions) => void;
  saveAndCloseRef: MutableRefObject<boolean>;
}) {
  const formik = useFormikContext<EmploymentFormValues>();

  useEffect(() => {
    onRegisterActions?.({
      submit: (saveAndClose) => {
        saveAndCloseRef.current = saveAndClose;
        void formik.submitForm();
      }
    });
  }, [formik.submitForm, onRegisterActions, saveAndCloseRef]);

  return null;
}

export default function FormEmployment({
  staff,
  staffId,
  formOptions = {
    departments: [],
    designations: [],
    grades: [],
    rosters: []
  },
  onRegisterActions,
  onLoadingChange
}: FormEmploymentProps) {
  const saveAndCloseRef = useRef(false);
  const pendingOrgAckRef = useRef(false);
  const pendingRosterAckRef = useRef(false);
  const { toast } = useToast();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] =
    useState<EmploymentConfirmKind>('roster-mismatch');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [rosterShiftSummary, setRosterShiftSummary] =
    useState<StaffEmploymentRosterShiftSummary>({
      count: 0,
      activeCount: 0,
      assignments: []
    });
  const pendingSubmitRef = useRef<{
    values: EmploymentFormValues;
    helpers: FormikHelpers<EmploymentFormValues>;
  } | null>(null);

  const resolvedInitialValues = staffRecordToEmploymentFormValues(staff);
  const shiftAssignmentCount = rosterShiftSummary.count;
  const rosterLockedByAssignments = shiftAssignmentCount > 0;

  useEffect(() => {
    let cancelled = false;
    void getStaffEmploymentRosterShiftSummaryAction(staffId).then((result) => {
      if (cancelled || result.isError || !result.data) return;
      setRosterShiftSummary(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  const institutionOptions = useMemo(
    () =>
      withOrphanOption(
        INSTITUTION_OPTIONS.map((o) => ({ id: o.id, name: o.name })),
        resolvedInitialValues.institution
      ),
    [resolvedInitialValues.institution]
  );
  const departmentOptions = useMemo(
    () =>
      withOrphanOption(
        formOptions.departments,
        resolvedInitialValues.department
      ),
    [formOptions.departments, resolvedInitialValues.department]
  );
  const designationOptions = useMemo(
    () =>
      withOrphanOption(
        formOptions.designations,
        resolvedInitialValues.staffDesignation
      ),
    [formOptions.designations, resolvedInitialValues.staffDesignation]
  );
  const gradeOptions = useMemo(
    () =>
      withOrphanOption(formOptions.grades, resolvedInitialValues.staffGrade),
    [formOptions.grades, resolvedInitialValues.staffGrade]
  );

  const persistEmployment = async (
    values: EmploymentFormValues,
    { setErrors, setTouched }: FormikHelpers<EmploymentFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;

    try {
      onLoadingChange?.(true);
      setConfirmSaving(true);
      const payload = employmentFormValuesToPayload(values);
      const respond = await updateStaffEmploymentAction(staffId, payload);

      if (
        respond?.isError &&
        respond?.errors &&
        typeof respond.errors === 'object' &&
        !Array.isArray(respond.errors)
      ) {
        const fieldErrors: Record<string, string> = {};
        const errorMap = respond.errors as Record<
          string,
          string | string[] | undefined
        >;

        Object.keys(errorMap).forEach((key) => {
          if (key === 'message') return;
          const err = errorMap[key];
          const msg =
            Array.isArray(err) && err.length > 0
              ? err[0]
              : typeof err === 'string'
                ? err
                : undefined;
          if (!msg) return;
          fieldErrors[key] = msg;
        });

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          setTouched(
            Object.keys(fieldErrors).reduce(
              (acc, key) => ({ ...acc, [key]: true }),
              {} as Record<string, boolean>
            )
          );
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            ((respond.errors as Record<string, unknown>)?.message as string) ??
            'Employment details save unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Employment details were updated successfully.'
      });

      if (closeAfterSave) router.push('/staff');
      else router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Employment details save unsuccessful.'
      });
    } finally {
      pendingOrgAckRef.current = false;
      pendingRosterAckRef.current = false;
      onLoadingChange?.(false);
      setConfirmSaving(false);
    }
  };

  const orgFieldsChanged = (values: EmploymentFormValues) =>
    values.institution !== resolvedInitialValues.institution ||
    values.department !== resolvedInitialValues.department;

  const handleSubmit = async (
    values: EmploymentFormValues,
    helpers: FormikHelpers<EmploymentFormValues>
  ) => {
    if (
      !pendingOrgAckRef.current &&
      shiftAssignmentCount > 0 &&
      orgFieldsChanged(values)
    ) {
      pendingSubmitRef.current = { values, helpers };
      setConfirmKind('org-change');
      setConfirmDescription(
        `This staff member has ${shiftAssignmentCount} standing shift assignment(s). Changing Institution or Working Department does not move or update those assignments automatically. Continue anyway?`
      );
      setConfirmOpen(true);
      return;
    }

    if (
      !pendingRosterAckRef.current &&
      rosterDepartmentMismatch(
        formOptions.rosters,
        values.department,
        values.roster
      )
    ) {
      const meta = findRosterMeta(formOptions.rosters, values.roster);
      const deptLabel =
        departmentOptions.find((d) => d.id === values.department)?.name ??
        values.department;
      pendingSubmitRef.current = { values, helpers };
      setConfirmKind('roster-mismatch');
      setConfirmDescription(
        `Roster "${meta?.name ?? values.roster}" belongs to a different department than working department "${deptLabel}". Continue anyway? Roster membership and duty allocations are not auto-updated.`
      );
      setConfirmOpen(true);
      return;
    }

    await persistEmployment(values, helpers);
  };

  const handleConfirmContinue = () => {
    const pending = pendingSubmitRef.current;
    const kind = confirmKind;
    setConfirmOpen(false);
    pendingSubmitRef.current = null;
    if (!pending) return;

    if (kind === 'org-change') {
      pendingOrgAckRef.current = true;
      void handleSubmit(pending.values, pending.helpers);
      return;
    }

    pendingRosterAckRef.current = true;
    void persistEmployment(pending.values, pending.helpers);
  };

  return (
    <>
    <Formik
      initialValues={resolvedInitialValues ?? initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(formik) => {
        const rosterOptionsForDept = formOptions.rosters.filter(
          (r) =>
            !formik.values.department ||
            r.departmentId === formik.values.department
        );
        const rosterOptions = withOrphanOption(
          rosterOptionsForDept.map((r) => ({ id: r.id, name: r.name })),
          formik.values.roster
        );

        return (
        <Form className="w-full">
          <FormActionBridge
            onRegisterActions={onRegisterActions}
            saveAndCloseRef={saveAndCloseRef}
          />
          <Accordion
            multiple
            defaultValue={[
              'welfare',
              'employment-information',
              'payroll-information'
            ]}
            className="space-y-4"
          >
            <AccordionItem value="welfare" className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="space-y-1 text-left">
                  <p className="text-xl font-semibold">Welfare</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t-2 pt-2">
                <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                  <CustomFormField
                    type="number"
                    id="eligibleWelfareValue"
                    placeholder="Eligible Welfare Value"
                    value={formik.values.eligibleWelfareValue}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    type="number"
                    id="utilizedThisYear"
                    placeholder="Utilized (This Year)"
                    value={formik.values.utilizedThisYear}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="employment-information"
              className="rounded-lg border px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="space-y-1 text-left">
                  <p className="text-xl font-semibold">
                    Employment Information
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t-2 pt-2">
                <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                  <div className={fieldStyleClasses.parentDiv}>
                    <CustomSelectField
                      id="institution"
                      placeholder="Institution"
                      options={institutionOptions}
                      value={formik.values.institution}
                      onChange={(v) => formik.setFieldValue('institution', v)}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    {shiftAssignmentCount > 0 &&
                    formik.values.institution !==
                      resolvedInitialValues.institution ? (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Warning: this staff has {shiftAssignmentCount} standing
                        shift assignment(s). Changing institution does not update
                        those assignments.
                      </p>
                    ) : null}
                  </div>
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Working Department
                      <span className="text-red-600"> *</span>
                    </Label>
                    <Combobox
                      label="Working Department"
                      options={departmentOptions}
                      value={formik.values.department || ''}
                      defaultValue=""
                      clearable
                      onChange={(value) => {
                        void formik.setFieldValue('department', value);
                        if (rosterLockedByAssignments) return;
                        const rosterMeta = findRosterMeta(
                          formOptions.rosters,
                          formik.values.roster
                        );
                        if (
                          rosterMeta?.departmentId &&
                          value &&
                          rosterMeta.departmentId !== value
                        ) {
                          void formik.setFieldValue('roster', '');
                        }
                      }}
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                    {formik.touched.department && formik.errors.department ? (
                      <p className="text-sm text-red-600">
                        {formik.errors.department}
                      </p>
                    ) : null}
                    {shiftAssignmentCount > 0 &&
                    formik.values.department !==
                      resolvedInitialValues.department ? (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Warning: this staff has {shiftAssignmentCount} standing
                        shift assignment(s). Changing working department does not
                        update those assignments.
                      </p>
                    ) : null}
                  </div>
                  <CustomSelectField
                    id="employeeStatus"
                    placeholder="Employee Status"
                    options={EMPLOYEE_STATUS_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.employeeStatus}
                    onChange={(v) => formik.setFieldValue('employeeStatus', v)}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="staffCategory"
                    placeholder="Staff Category"
                    options={STAFF_CATEGORY_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.staffCategory}
                    onChange={(v) => formik.setFieldValue('staffCategory', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Staff Grade
                    </Label>
                    <Combobox
                      label="Staff Grade"
                      options={gradeOptions}
                      value={formik.values.staffGrade || ''}
                      defaultValue=""
                      clearable
                      onChange={(value) =>
                        void formik.setFieldValue('staffGrade', value)
                      }
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Staff Designation
                    </Label>
                    <Combobox
                      label="Staff Designation"
                      options={designationOptions}
                      value={formik.values.staffDesignation || ''}
                      defaultValue=""
                      clearable
                      onChange={(value) =>
                        void formik.setFieldValue('staffDesignation', value)
                      }
                      triggerClassName="w-full max-w-none font-normal!"
                      popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                    />
                  </div>
                  <CustomFormField
                    id="basic"
                    type="number"
                    placeholder="Staff Basic"
                    value={formik.values.basic}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    min={0}
                    styleClasses={fieldStyleClasses}
                  />
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Roster group
                    </Label>
                    {rosterLockedByAssignments ? (
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                        <p className="font-semibold text-foreground">
                          {(() => {
                            const meta = findRosterMeta(
                              formOptions.rosters,
                              formik.values.roster
                            );
                            if (meta) {
                              return `${meta.name} (${meta.id})`;
                            }
                            return formik.values.roster
                              ? formik.values.roster
                              : 'No roster group set';
                          })()}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Locked while standing shift assignments exist. Change
                          or remove assignments in Shift Assignment before
                          changing roster membership.
                        </p>
                      </div>
                    ) : (
                      <Combobox
                        label="Roster"
                        options={rosterOptions}
                        value={formik.values.roster || ''}
                        defaultValue=""
                        clearable
                        onChange={(value) =>
                          void formik.setFieldValue('roster', value)
                        }
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                      />
                    )}
                    {!rosterLockedByAssignments ? (
                      <p className="text-xs text-muted-foreground">
                        Rosters for the selected working department only (Manage
                        Rosters code). Day duties stay in Roster &amp; Shifts.
                      </p>
                    ) : null}
                  </div>

                  <div className={`${fieldStyleClasses.parentDiv} md:col-span-2`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Label className={fieldStyleClasses.labelClassName}>
                        Standing shift assignments
                      </Label>
                      <Link
                        href="/shift-assignment"
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Manage in Shift Assignment
                      </Link>
                    </div>
                    {rosterShiftSummary.assignments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                        No standing shift assignments yet. Assign shift types
                        from Roster &amp; Shifts → Shift Assignment.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
                          <thead className="bg-muted/60 text-muted-foreground">
                            <tr>
                              <th className="px-2 py-1.5 font-medium">Code</th>
                              <th className="px-2 py-1.5 font-medium">
                                Shift type
                              </th>
                              <th className="px-2 py-1.5 font-medium">
                                Roster
                              </th>
                              <th className="px-2 py-1.5 font-medium">From</th>
                              <th className="px-2 py-1.5 font-medium">To</th>
                              <th className="px-2 py-1.5 font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rosterShiftSummary.assignments.map((row) => (
                              <tr
                                key={row.id}
                                className="border-t border-border"
                              >
                                <td className="px-2 py-1.5 font-medium text-foreground">
                                  {row.code}
                                </td>
                                <td className="px-2 py-1.5 text-foreground">
                                  {row.shiftTypeCode
                                    ? `${row.shiftTypeCode} — ${row.shiftTypeName}`
                                    : row.shiftTypeName || '—'}
                                </td>
                                <td className="px-2 py-1.5 text-muted-foreground">
                                  {row.manageRosterCode
                                    ? row.manageRosterName
                                      ? `${row.manageRosterName} (${row.manageRosterCode})`
                                      : row.manageRosterCode
                                    : '—'}
                                </td>
                                <td className="px-2 py-1.5 text-muted-foreground">
                                  {formatEmploymentDate(row.effectiveFrom)}
                                </td>
                                <td className="px-2 py-1.5 text-muted-foreground">
                                  {formatEmploymentDate(row.effectiveTo)}
                                </td>
                                <td className="px-2 py-1.5 capitalize text-muted-foreground">
                                  {row.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="border-t border-border px-2 py-1.5 text-[11px] text-muted-foreground">
                          {rosterShiftSummary.activeCount} active of{' '}
                          {rosterShiftSummary.count} standing assignment
                          {rosterShiftSummary.count === 1 ? '' : 's'}. Default
                          Shift on Employment is no longer edited here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="payroll-information"
              className="rounded-lg border px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="space-y-1 text-left">
                  <p className="text-xl font-semibold">Payroll Information</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t-2 pt-2">
                <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                  <CustomSelectField
                    id="payingMethod"
                    placeholder="Paying Method"
                    options={PAYING_METHOD_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.payingMethod}
                    onChange={(v) => formik.setFieldValue('payingMethod', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="salaryPaymentMethod"
                    placeholder="Salary Payment Method"
                    options={SALARY_PAYMENT_METHOD_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.salaryPaymentMethod}
                    onChange={(v) =>
                      formik.setFieldValue('salaryPaymentMethod', v)
                    }
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="bank"
                    placeholder="Bank"
                    options={BANK_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.bank}
                    onChange={(v) => formik.setFieldValue('bank', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    type="text"
                    id="bankBranch"
                    placeholder="Bank Branch"
                    value={formik.values.bankBranch}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    type="text"
                    id="accountNumber"
                    placeholder="Account Number"
                    value={formik.values.accountNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="working-hours"
              className="rounded-lg border px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="space-y-1 text-left">
                  <p className="text-xl font-semibold">Working Hours</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t-2 pt-2">
                <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <CustomFormField
                      type="number"
                      id="perWeekStandard"
                      placeholder="Per Week (Standard)"
                      value={formik.values.perWeekStandard}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hours per week
                    </p>
                  </div>
                  <div className="space-y-1">
                    <CustomFormField
                      type="number"
                      id="perWeekOt"
                      placeholder="Per Week (OT)"
                      value={formik.values.perWeekOt}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <p className="text-xs text-muted-foreground">
                      Threshold before overtime
                    </p>
                  </div>
                  <div className="space-y-1">
                    <CustomFormField
                      type="number"
                      id="perWeekNoPay"
                      placeholder="Per Week (For No Pay)"
                      value={formik.values.perWeekNoPay}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <p className="text-xs text-muted-foreground">
                      Threshold for no-pay calculation
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="permissions" className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="space-y-1 text-left">
                  <p className="text-xl font-semibold">Permissions</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t-2 pt-2">
                <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <CustomCheckedField
                        id="allowedLateInLeave"
                        placeholder=""
                        value={formik.values.allowedLateInLeave}
                        onChange={() =>
                          formik.setFieldValue(
                            'allowedLateInLeave',
                            !formik.values.allowedLateInLeave
                          )
                        }
                        required={false}
                        options={[
                          {
                            id: true,
                            name: 'Allowed Late in Leave'
                          }
                        ]}
                        styleClasses={{
                          parentDiv: '',
                          labelClassName: 'hidden',
                          inputClassName: ''
                        }}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Grant late-arrival exemptions
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <CustomCheckedField
                        id="allowedEarlyOutLeave"
                        placeholder=""
                        value={formik.values.allowedEarlyOutLeave}
                        onChange={() =>
                          formik.setFieldValue(
                            'allowedEarlyOutLeave',
                            !formik.values.allowedEarlyOutLeave
                          )
                        }
                        required={false}
                        options={[
                          {
                            id: true,
                            name: 'Allowed Early Out Leave'
                          }
                        ]}
                        styleClasses={{
                          parentDiv: '',
                          labelClassName: 'hidden',
                          inputClassName: ''
                        }}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Allow early departures
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="notes" className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="space-y-1 text-left">
                  <p className="text-xl font-semibold">Notes</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t-2 pt-2">
                <div className="grid grid-cols-1 gap-4 pb-2">
                  <CustomFormField
                    type="textarea"
                    id="memo"
                    placeholder="Memo — Internal notes about this staff member"
                    value={formik.values.memo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Form>
        );
      }}
    </Formik>

    <CustomAlertDialog
      open={confirmOpen}
      title={
        confirmKind === 'org-change'
          ? 'Institution / department change'
          : 'Department and roster differ'
      }
      description={confirmDescription}
      loading={confirmSaving}
      handleVisibilityChange={(open) => {
        if (!open) {
          pendingSubmitRef.current = null;
          pendingOrgAckRef.current = false;
          pendingRosterAckRef.current = false;
        }
        setConfirmOpen(open);
      }}
      handleContinue={handleConfirmContinue}
    />
    </>
  );
}
