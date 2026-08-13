'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik } from 'formik';
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
  SAMPLE_SHIFT_CATEGORIES,
  SAMPLE_STATUS_OPTIONS,
  SAMPLE_YES_NO_OPTIONS,
  type ShiftTypeSample
} from './sample-data';

export type ShiftTypeFormValues = {
  code: string;
  name: string;
  categoryId: string;
  startTime: string;
  endTime: string;
  durationHours: string;
  isNightShift: string;
  isOvernight: string;
  holidayEligible: string;
  status: string;
};

type FormShiftTypeProps = {
  mode?: 'add' | 'edit';
  sample?: ShiftTypeSample;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const emptyValues: ShiftTypeFormValues = {
  code: '',
  name: '',
  categoryId: '',
  startTime: '07:00',
  endTime: '15:00',
  durationHours: '8',
  isNightShift: 'no',
  isOvernight: 'no',
  holidayEligible: 'yes',
  status: 'active'
};

const validationSchema = Yup.object({
  code: Yup.string().max(50, 'Must be less than 50 characters'),
  name: Yup.string()
    .required('Name is required')
    .max(150, 'Must be less than 150 characters'),
  categoryId: Yup.string().required('Category is required'),
  startTime: Yup.string().required('Start time is required'),
  endTime: Yup.string().required('End time is required'),
  durationHours: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('Duration is required'),
  isNightShift: Yup.string().oneOf(['yes', 'no']).required(),
  isOvernight: Yup.string().oneOf(['yes', 'no']).required(),
  holidayEligible: Yup.string().oneOf(['yes', 'no']).required(),
  status: Yup.string().oneOf(['active', 'inactive']).required()
});

function sampleToFormValues(sample: ShiftTypeSample): ShiftTypeFormValues {
  const categoryId =
    SAMPLE_SHIFT_CATEGORIES.find((c) => c.name === sample.category)?.id ?? '';
  return {
    code: sample.code,
    name: sample.name,
    categoryId,
    startTime: sample.startTime,
    endTime: sample.endTime,
    durationHours: String(sample.durationHours),
    isNightShift: sample.isNightShift ? 'yes' : 'no',
    isOvernight: sample.isOvernight ? 'yes' : 'no',
    holidayEligible: sample.holidayEligible ? 'yes' : 'no',
    status: sample.status
  };
}

const LATER = 'Will be wired in a later phase.';

export default function FormShiftType({
  mode = 'add',
  sample
}: FormShiftTypeProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const submitFormRef = useRef<(() => Promise<void>) | null>(null);
  const saveAndCloseRef = useRef(false);

  const formInitialValues: ShiftTypeFormValues = sample
    ? sampleToFormValues(sample)
    : emptyValues;

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">
            {mode === 'edit' ? 'Edit Shift Type' : 'Shift Type Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={formInitialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={async () => {
              setLoading(true);
              toast({
                title:
                  mode === 'add' ? 'Create shift type' : 'Update shift type',
                description: LATER
              });
              setLoading(false);
              if (saveAndCloseRef.current) {
                router.push('/shift-types');
              }
              saveAndCloseRef.current = false;
            }}
          >
            {(formik) => {
              submitFormRef.current = formik.submitForm;
              return (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CustomFormField
                      id="code"
                      type="text"
                      placeholder="Code (Auto SHF-n)"
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
                      placeholder="Shift Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="categoryId"
                      placeholder="Category"
                      value={formik.values.categoryId}
                      onChange={(value) =>
                        formik.setFieldValue('categoryId', value)
                      }
                      required
                      options={SAMPLE_SHIFT_CATEGORIES}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status}
                      onChange={(value) =>
                        formik.setFieldValue('status', value)
                      }
                      required
                      options={SAMPLE_STATUS_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="startTime"
                      type="time"
                      placeholder="Start Time"
                      value={formik.values.startTime}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="endTime"
                      type="time"
                      placeholder="End Time"
                      value={formik.values.endTime}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="durationHours"
                      type="number"
                      placeholder="Duration (hours)"
                      value={formik.values.durationHours}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="isNightShift"
                      placeholder="Night Shift"
                      value={formik.values.isNightShift}
                      onChange={(value) =>
                        formik.setFieldValue('isNightShift', value)
                      }
                      required
                      options={SAMPLE_YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="isOvernight"
                      placeholder="Overnight"
                      value={formik.values.isOvernight}
                      onChange={(value) =>
                        formik.setFieldValue('isOvernight', value)
                      }
                      required
                      options={SAMPLE_YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="holidayEligible"
                      placeholder="Holiday Eligible"
                      value={formik.values.holidayEligible}
                      onChange={(value) =>
                        formik.setFieldValue('holidayEligible', value)
                      }
                      required
                      options={SAMPLE_YES_NO_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </Form>
              );
            }}
          </Formik>
        </CardContent>
      </Card>

      <Card className="flex flex-wrap items-center justify-end gap-2 p-6">
        <CustomFormSubmitBtns
          loading={loading}
          onCancel={() => router.push('/shift-types')}
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
