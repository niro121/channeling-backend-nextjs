'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
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

type SelectOption = {
  id: string;
  name: string;
};

export type LeaveTypeFormValues = {
  code: string;
  name: string;
  description: string;
  isPaid: string; // yes | no
  requiresApproval: string; // yes | no
  allowHalfDay: string; // yes | no
  carryForwardAllowed: string; // yes | no
  maxDaysPerYear: string;
  maxCarryForwardDays: string;
  status: string; // 1 | 0
};

type FormLeaveTypeProps = {
  initialValues?: Partial<LeaveTypeFormValues>;
  mode?: 'add' | 'edit';
  leaveTypeId?: string;
  onSubmit?: (
    values: LeaveTypeFormValues,
    options: { saveAndClose: boolean }
  ) => Promise<void> | void;
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

/** UI-first form shell for Leave Types. Server actions will be wired in phase 1 backend. */
export default function FormLeaveType({
  initialValues,
  mode = 'add',
  leaveTypeId,
  onSubmit
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
    _helpers: FormikHelpers<LeaveTypeFormValues>
  ) => {
    const saveAndClose = saveAndCloseRef.current;
    try {
      setLoading(true);
      if (onSubmit) {
        await onSubmit(values, { saveAndClose });
        return;
      }

      toast({
        title: mode === 'edit' ? 'Update' : 'Save',
        description:
          mode === 'edit'
            ? 'Leave type update action is not wired yet.'
            : 'Leave type save action is not wired yet.'
      });

      if (saveAndClose) {
        router.push('/leave-types');
        return;
      }

      if (mode === 'add' && leaveTypeId) {
        router.push(`/leave-types/${leaveTypeId}/edit`);
      }
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
                      placeholder="Code"
                      value={formik.values.code}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
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
