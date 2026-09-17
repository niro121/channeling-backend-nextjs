'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import {
  Button,
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
import {
  createAttendanceDeviceAction,
  updateAttendanceDeviceAction
} from '@/app/actions/attendance-actions/device.actions';
import {
  ATTENDANCE_DEVICE_STATUS_OPTIONS,
  type AttendanceDeviceRecord
} from '@/types/attendance';
import type { DeviceFormSheetMode } from './attendance-devices-ui-context';

type SheetDeviceFormProps = {
  open: boolean;
  mode: DeviceFormSheetMode;
  record: AttendanceDeviceRecord | null;
  onOpenChange: (open: boolean) => void;
};

type DeviceFormValues = {
  code: string;
  name: string;
  location: string;
  statusId: string;
  apiKey: string;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const emptyValues: DeviceFormValues = {
  code: '',
  name: '',
  location: '',
  statusId: 'active',
  apiKey: ''
};

const validationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required').max(200),
  code: Yup.string().trim().max(50),
  location: Yup.string().trim().max(200),
  statusId: Yup.string().required('Status is required'),
  apiKey: Yup.string().trim().max(200)
});

export default function SheetDeviceForm({
  open,
  mode,
  record,
  onOpenChange
}: SheetDeviceFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = mode === 'edit';

  const initialValues = useMemo<DeviceFormValues>(() => {
    if (!record) return emptyValues;
    return {
      code: record.code,
      name: record.name,
      location: record.location,
      statusId: record.status === 'inactive' ? 'inactive' : 'active',
      apiKey: ''
    };
  }, [record]);

  const handleSubmit = async (
    values: DeviceFormValues,
    helpers: FormikHelpers<DeviceFormValues>
  ) => {
    const payload = {
      code: values.code.trim() || undefined,
      name: values.name.trim(),
      location: values.location.trim(),
      status: values.statusId === 'inactive' ? 'inactive' : 'active',
      ...(values.apiKey.trim()
        ? { apiKey: values.apiKey.trim() }
        : isEdit
          ? {}
          : {})
    } as const;

    const result = isEdit && record
      ? await updateAttendanceDeviceAction({ id: record.id, ...payload })
      : await createAttendanceDeviceAction(payload);

    helpers.setSubmitting(false);

    if (result.isError) {
      toast({
        variant: 'destructive',
        title: isEdit ? 'Update failed' : 'Create failed',
        description:
          (result.errors as { message?: string })?.message ??
          'Could not save device.'
      });
      return;
    }

    toast({
      variant: 'success',
      title: isEdit ? 'Device updated' : 'Device created',
      description: `${result.data?.name ?? values.name} (${result.data?.code ?? (values.code || 'new')}) saved.`
    });
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Device' : 'Add Device'}</SheetTitle>
          <SheetDescription>
            Register an RFID / finger-scan reader. Optional API key is stored
            hashed; leave blank on edit to keep the existing key. Ingest still
            accepts the global ATTENDANCE_DEVICE_API_KEY.
          </SheetDescription>
        </SheetHeader>

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {(formik) => (
            <Form className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 pb-4">
              <CustomFormField
                id="code"
                type="text"
                placeholder={
                  isEdit
                    ? 'Device Code'
                    : 'Device Code (leave blank to auto-generate ATD-n)'
                }
                value={formik.values.code}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                disabled={isEdit}
                styleClasses={fieldStyleClasses}
              />
              <CustomFormField
                id="name"
                type="text"
                placeholder="Device Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={fieldStyleClasses}
              />
              <CustomFormField
                id="location"
                type="text"
                placeholder="Location"
                value={formik.values.location}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={fieldStyleClasses}
              />
              <CustomSelectField
                id="statusId"
                placeholder="Status"
                options={ATTENDANCE_DEVICE_STATUS_OPTIONS}
                value={formik.values.statusId}
                onChange={(value) => formik.setFieldValue('statusId', value)}
                onBlur={() => formik.setFieldTouched('statusId', true)}
                required
                styleClasses={fieldStyleClasses}
              />
              <CustomFormField
                id="apiKey"
                type="password"
                placeholder={
                  isEdit && record?.hasApiKey
                    ? 'API Key (leave blank to keep existing)'
                    : 'Optional per-device API Key'
                }
                value={formik.values.apiKey}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required={false}
                styleClasses={fieldStyleClasses}
              />

              <SheetFooter className="mt-auto gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formik.isSubmitting}>
                  {formik.isSubmitting
                    ? 'Saving…'
                    : isEdit
                      ? 'Save Changes'
                      : 'Create Device'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
