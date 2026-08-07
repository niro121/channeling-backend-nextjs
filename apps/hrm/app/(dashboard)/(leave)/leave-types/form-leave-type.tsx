'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomFormField,
  CustomSelectField,
  useToast
} from '@archmage/ui';
import { CustomFormSubmitBtns } from '@/components/custom/custom-form-submit-btns';
import {
  createLeaveTypeAction,
  updateLeaveTypeAction
} from '@/app/actions/leave-actions/leave-type.actions';
import {
  leaveTypeFormValuesToPayload
} from '@/lib/mappers/leave-type-form.mapper';
import type { LeaveTypeFormValues } from '@/types/leave';

export type { LeaveTypeFormValues };

type SelectOption = {
  id: string;
  name: string;
};

type FormLeaveTypeProps = {
  initialValues?: Partial<LeaveTypeFormValues>;
  mode?: 'add' | 'edit';
  leaveTypeId?: string;
};

const YES_NO_OPTIONS: SelectOption[] = [
  { id: 'yes', name: 'Yes' },
  { id: 'no', name: 'No' }
];

const STATUS_OPTIONS: SelectOption[] = [
  { id: '1', name: 'Published' },
  { id: '0', name: 'Unpublished' }
];

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const emptyValues: LeaveTypeFormValues = {
  code: '',
  name: '',
  description: '',
  isPaid: 'yes',
  requiresApproval: 'yes',
  allowHalfDay: 'yes',
  carryForwardAllowed: 'no',
  maxDaysPerYear: '',
  maxCarryForwardDays: '',
  status: '1'
};

const validationSchema = Yup.object({
  code: Yup.string().max(50, 'Must be less than 50 characters'),
  name: Yup.string()
    .required('Name is required')
    .max(150, 'Must be less than 150 characters'),
  description: Yup.string().max(500, 'Must be less than 500 characters'),
  isPaid: Yup.string().oneOf(['yes', 'no']).required('Paid type is required'),
  requiresApproval: Yup.string()
    .oneOf(['yes', 'no'])
    .required('Approval required is required'),
  allowHalfDay: Yup.string()
    .oneOf(['yes', 'no'])
    .required('Half-day allowed is required'),
  carryForwardAllowed: Yup.string()
    .oneOf(['yes', 'no'])
    .required('Carry forward allowed is required'),
  maxDaysPerYear: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .nullable()
    .optional(),
  maxCarryForwardDays: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .nullable()
    .optional(),
  status: Yup.string().oneOf(['0', '1']).required('Status is required')
});

export default function FormLeaveType({
  initialValues,
  mode = 'add',
  leaveTypeId
}: FormLeaveTypeProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const saveAndCloseRef = useRef(false);
  const submitFormRef = useRef<(() => Promise<void>) | null>(null);

  const formInitialValues: LeaveTypeFormValues = {
    ...emptyValues,
    ...initialValues
  };

  const handleSubmit = async (
    values: LeaveTypeFormValues,
    { setErrors, setTouched }: FormikHelpers<LeaveTypeFormValues>
  ) => {
    const saveAndClose = saveAndCloseRef.current;
    try {
      setLoading(true);
      const payload = leaveTypeFormValuesToPayload(values);

      const respond =
        mode === 'edit' && leaveTypeId
          ? await updateLeaveTypeAction(leaveTypeId, payload)
          : await createLeaveTypeAction(payload);

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
            'Leave type save unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description:
          mode === 'edit'
            ? 'Leave type updated successfully.'
            : 'Leave type created successfully.'
      });

      if (saveAndClose) {
        router.push('/leave-types');
        return;
      }

      const newId = respond?.data?.id;
      if (mode === 'add' && newId) {
        router.push(`/leave-types/${newId}/edit`);
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Leave type save unsuccessful.'
      });
    } finally {
      setLoading(false);
      saveAndCloseRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">
            {mode === 'edit' ? 'Edit Leave Type' : 'Leave Type Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={formInitialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {(formik) => {
              submitFormRef.current = formik.submitForm;
              return (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CustomFormField
                      id="code"
                      type="text"
                      placeholder="Code (Auto Generated)"
                      value={formik.values.code}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="name"
                      type="text"
                      placeholder="Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="description"
                    type="textarea"
                    placeholder="Description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CustomSelectField
                      id="isPaid"
                      placeholder="Paid Type"
                      value={formik.values.isPaid}
                      onChange={(value) => formik.setFieldValue('isPaid', value)}
                      required
                      options={YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="requiresApproval"
                      placeholder="Approval Required"
                      value={formik.values.requiresApproval}
                      onChange={(value) =>
                        formik.setFieldValue('requiresApproval', value)
                      }
                      required
                      options={YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="allowHalfDay"
                      placeholder="Half-day Allowed"
                      value={formik.values.allowHalfDay}
                      onChange={(value) =>
                        formik.setFieldValue('allowHalfDay', value)
                      }
                      required
                      options={YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="carryForwardAllowed"
                      placeholder="Carry Forward Allowed"
                      value={formik.values.carryForwardAllowed}
                      onChange={(value) =>
                        formik.setFieldValue('carryForwardAllowed', value)
                      }
                      required
                      options={YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="maxDaysPerYear"
                      type="number"
                      placeholder="Max Days Per Year"
                      value={formik.values.maxDaysPerYear}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="maxCarryForwardDays"
                      type="number"
                      placeholder="Max Carry Forward Days"
                      value={formik.values.maxCarryForwardDays}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={STATUS_OPTIONS}
                    styleClasses={fieldStyleClasses}
                  />
                </Form>
              );
            }}
          </Formik>
        </CardContent>
      </Card>

      <Card className="flex items-center justify-end gap-2 p-6">
        <CustomFormSubmitBtns
          loading={loading}
          onCancel={() => router.push('/leave-types')}
          onSave={() => {
            saveAndCloseRef.current = false;
            void submitFormRef.current?.();
          }}
          onSaveAndClose={() => {
            saveAndCloseRef.current = true;
            void submitFormRef.current?.();
          }}
        />
      </Card>
    </div>
  );
}
