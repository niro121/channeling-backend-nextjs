'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import CustomFormField from '@/components/common/form-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import CustomSelectField from '@/components/common/custom-select-field';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import {
  DoctorLeave,
  DoctorLeaveFormProps,
  Session
} from '@/types/doctor.leave';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { getAllActiveSessions } from '@/app/actions/doctor.leave.action';
import moment from 'moment';
import { formatSessionTime } from '../channel-booking/components/sessions-selection/util';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

type LeaveFormProps = {
  doctorId: string;
  doctorName: string;
  doctorLeave: DoctorLeave | null;
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
};

export default function DoctorLeaveForm({
  doctorId,
  doctorName,
  doctorLeave,
  user
}: LeaveFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [sessionsLoading, setSessionsLoading] = React.useState<boolean>(false);
  const [availableSessions, setAvailableSessions] = React.useState<Session[]>(
    []
  );
  const [dateRange, setDateRange] = React.useState<{
    fromDate?: Date;
    toDate?: Date;
  }>({
    fromDate: doctorLeave?.fromDate ?? new Date(),
    toDate: doctorLeave?.toDate ?? new Date()
  });

  const initialValues: DoctorLeaveFormProps = {
    fromDate: doctorLeave?.fromDate ?? new Date(),
    toDate: doctorLeave?.toDate ?? new Date(),
    remarks: doctorLeave?.remarks ?? '',
    sesssions: doctorLeave?.sessions ?? [],
    sendSms: doctorLeave?.sendSms ?? 0,
    status: doctorLeave?.status ?? 0,
    doctorId: doctorLeave?.doctorId ?? doctorId
  };

  const validationSchema = Yup.object({
    doctorId: Yup.string().required(),

    fromDate: Yup.date().required('From date is required'),

    toDate: Yup.date()
      .required('To date is required')
      .min(Yup.ref('fromDate'), 'To date cannot be before From date'),

    remarks: Yup.string().required('Remarks is required'),

    sessions: Yup.array()
      .min(1, 'At least one session must be selected')
      .required('Sessions is required'),

    sendSms: Yup.number()
      .oneOf([0, 1], 'Send SMS must be No (0) or Yes (1)')
      .required('This field is mandatory'),

    status: Yup.number()
      .oneOf([0, 1], 'Visibility must be Unpublish (0) or Publish (1)')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: DoctorLeaveFormProps,
    { resetForm, setErrors, setTouched }: FormikHelpers<DoctorLeaveFormProps>
  ) => {
    try {
      let respond: any;

      setLoading(true);

      if (doctorLeave && doctorLeave.id) {
        // respond = await updateOneRoom(room.id, values);

        setLoading(false);

        if (!respond?.success) {
          // Handle server-side validation errors
          if (respond?.error?.issues) {
            const fieldErrors: any = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errors = respond.error.issues[key];
              if (Array.isArray(errors) && errors.length > 0) {
                fieldErrors[key] = errors[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as any)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description:
              respond.error?.message || 'Doctor leave update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor leave was updated successfully'
        });

        // router.push('/rooms');
      } else {
        // respond = await createRoom(values, user);

        setLoading(false);

        if (!respond?.success) {
          // Handle server-side validation errors
          if (respond?.error?.issues) {
            const fieldErrors: any = {};
            Object.keys(respond.error.issues).forEach((key) => {
              const errors = respond.error.issues[key];
              if (Array.isArray(errors) && errors.length > 0) {
                fieldErrors[key] = errors[0];
              }
            });
            setErrors(fieldErrors);
            setTouched(
              Object.keys(fieldErrors).reduce((acc, key) => {
                acc[key] = true;
                return acc;
              }, {} as any)
            );
          }

          toast({
            variant: 'destructive',
            title: 'Error',
            description:
              respond.error?.message || 'Doctor leave save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor leave was created successfully'
        });

        /* if (respond.data?.id) {
          router.push(`/rooms/${respond.data.id}/edit`);
        } else {
          router.push('/rooms');
        } */
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Doctor leave save unsuccessful.'
      });
    }
  };

  function mapApiSessionToItem(raw: any): Session {
    return {
      id: raw.id,
      date: new Date(raw.date),
      location: raw.location?.name ?? '',
      startTime: formatSessionTime(raw.startTime, raw.date),
      endTime: formatSessionTime(raw.endTime, raw.date)
    };
  }

  React.useEffect(() => {
    if (
      !doctorId ||
      !dateRange.fromDate ||
      !dateRange.toDate ||
      dateRange.toDate < dateRange.fromDate
    ) {
      setAvailableSessions([]);
      return;
    }

    const fromStr = moment(dateRange.fromDate).format('YYYY-MM-DD');
    const toStr = moment(dateRange.toDate).format('YYYY-MM-DD');

    setSessionsLoading(true);

    getAllActiveSessions({ doctorId, fromDate: fromStr, toDate: toStr })
      .then((res) => {
        if (res.success && res.data?.length) {
          setAvailableSessions(res.data.map(mapApiSessionToItem));
        } else {
          setAvailableSessions([]);
        }
      })
      .catch(() => {
        setAvailableSessions([]);
      })
      .finally(() => setSessionsLoading(false));
  }, [doctorId, dateRange.fromDate, dateRange.toDate]);

  const handleRemove = (sessionId: string) => {
    const leaveSessions = availableSessions.filter(
      (session) => sessionId !== session.id
    );

    setAvailableSessions(leaveSessions);
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize
    >
      {(formik) => {
        const styleClasses = {
          parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
          labelClassName: 'text-sm text-black font-semibold capitalize',
          inputClassName: 'col-span-full sm:col-span-3'
        };

        return (
          <Form className="w-full">
            <div className="grid gap-4 border rounded-lg p-6">
              <CustomFormField
                type="text"
                id="doctorName"
                placeholder="Doctor"
                value={`DR.${doctorName}`}
                disabled
                required
                onChange={() => {}}
                onBlur={() => {}}
                styleClasses={styleClasses}
              />
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Date Range
                </Label>
                <div
                  className={`${styleClasses.inputClassName} flex flex-wrap md:flex-nowrap gap-10`}
                >
                  <CustomDatePickerField
                    id="fromDate"
                    placeholder="From Date"
                    value={formik.values.fromDate}
                    onChange={(date) => {
                      formik.setFieldValue('fromDate', date ?? undefined);
                      setDateRange({ ...dateRange, fromDate: date });
                    }}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.toDate &&
                      typeof formik.errors.toDate === 'string'
                        ? formik.errors.toDate
                        : undefined
                    }
                    touched={!!formik.touched.toDate}
                    captionLayout="dropdown"
                    disablePast
                    required
                  />
                  <CustomDatePickerField
                    id="toDate"
                    placeholder="To Date"
                    value={formik.values.toDate}
                    onChange={(date) => {
                      formik.setFieldValue('toDate', date ?? undefined);
                      setDateRange({ ...dateRange, toDate: date });
                    }}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.toDate &&
                      typeof formik.errors.toDate === 'string'
                        ? formik.errors.toDate
                        : undefined
                    }
                    touched={!!formik.touched.toDate}
                    captionLayout="dropdown"
                    disablePast
                    required
                  />
                </div>
              </div>
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>Sessions</Label>
                <Card
                  className={`${styleClasses.inputClassName} p-3 space-y-3`}
                >
                  <p className="text-sm text-red-500 font-semibold">
                    Removing sessions are remained as ACTIVE sessions.
                  </p>
                  <Card className={`flex flex-wrap gap-3 p-2`}>
                    {sessionsLoading && (
                      <Loader className="w-4 h-4 animate-spin absolute left-1/2 top-1/4" />
                    )}
                    {availableSessions.map((option) => (
                      <Badge
                        key={option.id}
                        variant="secondary"
                        className={`flex items-center gap-1 cursor-pointer bg-teal-700 text-white hover:bg-teal-600`}
                      >
                        {new Date(option.date).toLocaleDateString()} |{' '}
                        {option.location} | {option.startTime} -{' '}
                        {option.endTime}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onPointerDown={() => handleRemove(option.id)}
                        />
                      </Badge>
                    ))}
                  </Card>
                </Card>
              </div>

              <CustomSelectField
                id="status"
                placeholder="Status"
                value={formik.values.status?.toString()}
                onChange={(value) =>
                  formik.setFieldValue('status', parseInt(value))
                }
                required
                options={[
                  { id: '0', name: 'Cancel' },
                  { id: '1', name: 'Active' }
                ]}
                styleClasses={styleClasses}
              />

              <CustomFormField
                type="textarea"
                id="remarks"
                placeholder="Remarks"
                value={formik.values.remarks || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={() => {
                    // router.push('/rooms');
                  }}
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  disabled={loading}
                  size={'sm'}
                  type="submit"
                  className="w-full sm:w-24 gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
