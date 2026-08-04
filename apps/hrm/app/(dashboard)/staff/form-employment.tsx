'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { Formik, Form, FormikHelpers, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CustomCheckedField,
  CustomFormField,
  CustomSelectField,
  Separator,
  useToast
} from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import type { EmploymentFormValues, StaffRecord } from '@/types/staff';
import {
  BANK_OPTIONS,
  DEPARTMENT_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  INSTITUTION_OPTIONS,
  PAYING_METHOD_OPTIONS,
  ROSTER_OPTIONS,
  SALARY_PAYMENT_METHOD_OPTIONS,
  SHIFT_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  STAFF_DESIGNATION_OPTIONS,
  STAFF_GRADE_OPTIONS
} from '@/types/staff-employment-options';
import { updateStaffEmploymentAction } from '@/app/actions/staff-actions/staff.actions';
import {
  employmentFormValuesToPayload,
  staffRecordToEmploymentFormValues
} from '@/lib/mappers/staff-employment-details.mapper';

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

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
  onRegisterActions,
  onLoadingChange
}: FormEmploymentProps) {
  const saveAndCloseRef = useRef(false);
  const { toast } = useToast();
  const router = useRouter();

  const resolvedInitialValues = staffRecordToEmploymentFormValues(staff);

  const handleSubmit = async (
    values: EmploymentFormValues,
    { setErrors, setTouched }: FormikHelpers<EmploymentFormValues>
  ) => {
    const closeAfterSave = saveAndCloseRef.current;

    try {
      onLoadingChange?.(true);
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
      onLoadingChange?.(false);
    }
  };

  return (
    <Formik
      initialValues={resolvedInitialValues ?? initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(formik) => (
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
                  <CustomSelectField
                    id="institution"
                    placeholder="Institution"
                    options={INSTITUTION_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.institution}
                    onChange={(v) => formik.setFieldValue('institution', v)}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="department"
                    placeholder="Working Department"
                    options={DEPARTMENT_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.department}
                    onChange={(v) => formik.setFieldValue('department', v)}
                    required
                    styleClasses={fieldStyleClasses}
                  />
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
                  <CustomSelectField
                    id="staffGrade"
                    placeholder="Staff Grade"
                    options={STAFF_GRADE_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.staffGrade}
                    onChange={(v) => formik.setFieldValue('staffGrade', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="staffDesignation"
                    placeholder="Staff Designation"
                    options={STAFF_DESIGNATION_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.staffDesignation}
                    onChange={(v) =>
                      formik.setFieldValue('staffDesignation', v)
                    }
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="roster"
                    placeholder="Roster"
                    options={ROSTER_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.roster}
                    onChange={(v) => formik.setFieldValue('roster', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="shift"
                    placeholder="Shift"
                    options={SHIFT_OPTIONS.map((o) => ({
                      id: o.id,
                      name: o.name
                    }))}
                    value={formik.values.shift}
                    onChange={(v) => formik.setFieldValue('shift', v)}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
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
      )}
    </Formik>
  );
}
