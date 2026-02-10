'use client';

import React from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import CustomFormField from '@/components/common/form-field';
import CustomSelectField from '@/components/common/custom-select-field';
import { Button } from '@/components/ui/button';
import { Ban, Save } from 'lucide-react';
import {
  ADVANCED_BOOKING_OPTIONS,
  DoctorSession,
  DoctorSessionFormValues,
  Fee
} from '@/types/doctor.session';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import {
  createDoctorSession,
  getAllRoomsByLocaionID,
  updateOneDoctorSession
} from '@/app/actions/doctor.sessions.action';
import {
  extractTime,
  buildDateFromTime,
  calculateDurationMinutes,
  SRI_LANKA_TZ
} from '@/lib/utils';
import { CustomTimeField } from '@/components/common/custom-time-field';
import { Loader } from 'lucide-react';
import { DoctorSessionFeeColumns } from './session-fee-columns';
import CustomTable from '@/components/common/custom-table';
import { FeeTotals } from './fee-total';

type DoctorSessionFormProps = {
  doctorId: string;
  doctorSession: DoctorSession | null;
  institutionOptions: { id: string; name: string }[];
  departmentOptions: { id: string; name: string }[] | undefined;
  locationOptions: { id: string; name: string }[] | undefined;
  dayTypeOptions: { id: string; name: string }[];
  refundableOptions: { id: string; name: string }[];
  feeTypeOptions: Fee[];
  isEditPage?: boolean;
  user?: {
    id?: string;
    name?: string;
  };
};

type FormSubmissionValues = DoctorSessionFormValues & {
  startTimeValue: string;
  startMeridiem: any;
  endTimeValue: string;
  endMeridiem: any;
};

export default function DoctorSessionForm({
  doctorId,
  doctorSession,
  institutionOptions,
  departmentOptions,
  locationOptions,
  dayTypeOptions,
  refundableOptions,
  feeTypeOptions,
  user
}: DoctorSessionFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [roomOptions, setRoomOptions] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [roomloading, setRoomLoading] = React.useState<boolean>(false);
  const [newLocationId, setNewLocationId] = React.useState(
    doctorSession?.locationId
  );

  const previousSessions = React.useMemo(
    () =>
      doctorSession?.previousSessions?.map((session) => ({
        id: session.id,
        name: session.name
      })),
    [doctorSession]
  );

  const startExtracted = doctorSession?.startTime
    ? extractTime(new Date(doctorSession.startTime), SRI_LANKA_TZ)
    : { time: '', meridiem: 'AM' };

  const endExtracted = doctorSession?.endTime
    ? extractTime(new Date(doctorSession.endTime), SRI_LANKA_TZ)
    : { time: '', meridiem: 'AM' };

  const initialValues: FormSubmissionValues = {
    name: doctorSession?.name ?? '',
    institution: doctorSession?.institution ?? 0,
    departmentId: doctorSession?.departmentId ?? '',
    locationId: doctorSession?.locationId ?? '',
    roomId: doctorSession?.roomId ?? '',
    // == time == //
    startTime: doctorSession?.startTime ?? new Date(),
    endTime: doctorSession?.endTime ?? new Date(),

    startTimeValue: startExtracted.time,
    startMeridiem: startExtracted.meridiem,
    endTimeValue: endExtracted.time,
    endMeridiem: endExtracted.meridiem,

    durationMinutes: doctorSession?.durationMinutes ?? 0,
    dayType: doctorSession?.dayType ?? 0,
    applyTo: doctorSession?.applyTo ?? undefined,
    startingPatientNumber: doctorSession?.startingPatientNumber ?? 1,
    maxPatientNumber: doctorSession?.maxPatientNumber ?? 1,
    previousSessionId: doctorSession?.previousSessionId ?? '',
    refundable: doctorSession?.refundable ?? 0,
    advancedBookingDays: doctorSession?.advancedBookingDays ?? 0,
    status: doctorSession?.status ?? 0,
    fees: doctorSession?.fees ?? feeTypeOptions,
    amountLocal: doctorSession?.amountLocal ?? 0,
    amountForeign: doctorSession?.amountForeign ?? 0
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .max(150, 'Must be less than 150 characters')
      .required('This field is mandatory'),
    institution: Yup.number()
      .transform((value) => (isNaN(value) ? 0 : value))
      .moreThan(0, 'This field is mandatory')
      .required('This field is mandatory'),
    departmentId: Yup.string().required('This field is mandatory'),
    locationId: Yup.string().required('This field is mandatory'),
    roomId: Yup.string().required('This field is mandatory'),
    startTime: Yup.mixed().test(
      'is-valid-date',
      'Start time is required',
      function () {
        const { startTimeValue, startMeridiem } = this.parent;
        if (!startTimeValue) return false;
        const date = buildDateFromTime(
          startTimeValue,
          startMeridiem,
          new Date()
        );
        return !isNaN(date.getTime());
      }
    ),
    endTime: Yup.mixed().test(
      'is-valid-date',
      'End time is required',
      function () {
        const { endTimeValue, endMeridiem } = this.parent;
        if (!endTimeValue) return false;
        const date = buildDateFromTime(endTimeValue, endMeridiem, new Date());
        return !isNaN(date.getTime());
      }
    ),
    durationMinutes: Yup.number()
      .typeError('Duration is required')
      .min(1, 'Duration must be greater than 0')
      .required('This field is mandatory'),
    dayType: Yup.number()
      .transform((value) => (isNaN(value) ? 0 : value))
      .moreThan(0, 'This field is mandatory')
      .required('This field is mandatory'),

    applyTo: Yup.mixed().when('dayType', (dayType, schema) => {
      return typeof dayType === 'number' && dayType === 8
        ? Yup.date()
            .typeError('This field is mandatory')
            .required('This field is mandatory')
        : schema.notRequired();
    }),

    startingPatientNumber: Yup.number()
      .min(1, 'Minimum value is 1')
      .required('This field is mandatory'),

    maxPatientNumber: Yup.number()
      .min(1, 'Minimum value is 1')
      .required('This field is mandatory'),

    advancedBookingDays: Yup.number()
      .min(0)
      .max(100)
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: FormSubmissionValues,
    { resetForm }: FormikHelpers<FormSubmissionValues>
  ) => {
    try {
      const startTime = buildDateFromTime(
        values.startTimeValue,
        values.startMeridiem,
        values.startTime
      );

      const endTime = buildDateFromTime(
        values.endTimeValue,
        values.endMeridiem,
        values.endTime
      );

      const {
        startTimeValue,
        startMeridiem,
        endTimeValue,
        endMeridiem,
        ...payload
      } = values;

      payload.startTime = startTime;
      payload.endTime = endTime;

      setLoading(true);
      let respond: any;

      if (doctorSession && doctorSession.id) {
        respond = await updateOneDoctorSession(
          doctorId,
          doctorSession.id,
          payload,
          user
        );
        setLoading(false);

        if (!respond?.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Doctor Session update unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor Session was updated successfully'
        });
        router.push('/doctor-sessions');
      } else {
        respond = await createDoctorSession(doctorId, payload, user);
        setLoading(false);

        if (!respond?.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Doctor Session save unsuccessful.'
          });
          return;
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Doctor Session was created successfully'
        });

        if (respond.data?.id) {
          router.push(`/doctor-sessions/${respond.data.id}/edit`);
        } else {
          router.push('/doctor-sessions');
        }
      }
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Doctor Session save unsuccessful.'
      });
    }
  };

  const fetchRooms = async (value: string) => {
    setRoomLoading(true);

    try {
      const result = await getAllRoomsByLocaionID(value);

      if (result.success) {
        const mappedRooms = result.data?.map((r) => ({
          id: r.id,
          name: r.number
        }));

        setRoomOptions(mappedRooms || []);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Getting rooms unsuccessful.'
        });
        setRoomLoading(false);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Getting rooms unsuccessful.'
      });
    } finally {
      setRoomLoading(false);
    }
  };

  React.useEffect(() => {
    if (newLocationId) fetchRooms(newLocationId);
  }, [newLocationId]);

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      enableReinitialize={false}
    >
      {(formik) => {
        const styleClasses = {
          parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
          labelClassName: 'text-sm text-black font-semibold capitalize',
          inputClassName: 'col-span-full sm:col-span-3'
        };

        const setLocationHandler = (value: string) => {
          formik.setFieldValue('locationId', value);
          setNewLocationId(value);
        };

        return (
          <Form className="w-full">
            <div className="border rounded-lg p-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList>
                  <TabsTrigger value="details">Session Details</TabsTrigger>
                  <TabsTrigger value="fees">Session Fees</TabsTrigger>
                </TabsList>
                <TabsContent value="details">
                  <div className="grid gap-4">
                    <CustomFormField
                      type="text"
                      id="name"
                      placeholder="Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="institution"
                      placeholder="Institution"
                      value={
                        formik.values.institution === 0
                          ? ''
                          : String(formik.values.institution)
                      }
                      onChange={(value) =>
                        formik.setFieldValue('institution', Number(value))
                      }
                      required
                      options={institutionOptions}
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="departmentId"
                      placeholder="Department"
                      value={formik.values.department}
                      onChange={(value) =>
                        formik.setFieldValue('departmentId', value)
                      }
                      required
                      disabled={departmentOptions?.length === 0}
                      options={departmentOptions || []}
                      styleClasses={styleClasses}
                    />

                    <CustomSelectField
                      id="locationId"
                      placeholder="Location"
                      value={formik.values.locationId}
                      onChange={setLocationHandler}
                      required
                      disabled={locationOptions?.length === 0}
                      options={locationOptions || []}
                      styleClasses={styleClasses}
                    />
                    {
                      <div className="relative">
                        <>
                          {roomloading && (
                            <Loader className="w-4 h-4 animate-spin absolute left-1/2 top-1/4" />
                          )}
                          <CustomSelectField
                            id="roomId"
                            placeholder="Room"
                            value={formik.values.roomId}
                            onChange={(value) =>
                              formik.setFieldValue('roomId', value)
                            }
                            required
                            disabled={roomOptions.length === 0}
                            options={roomOptions}
                            styleClasses={styleClasses}
                          />
                        </>{' '}
                      </div>
                    }

                    <CustomTimeField
                      label="Start Time"
                      timeId="startTimeValue"
                      meridiemId="startMeridiem"
                      timeValue={formik.values.startTimeValue}
                      meridiemValue={formik.values.startMeridiem}
                      onTimeChange={(e) => {
                        formik.handleChange(e);
                        const duration = calculateDurationMinutes(
                          e.target.value,
                          formik.values.startMeridiem,
                          formik.values.endTimeValue,
                          formik.values.endMeridiem
                        );
                        formik.setFieldValue('durationMinutes', duration);
                      }}
                      onMeridiemChange={(v) => {
                        formik.setFieldValue('startMeridiem', v);
                        const duration = calculateDurationMinutes(
                          formik.values.startTimeValue,
                          v,
                          formik.values.endTimeValue,
                          formik.values.endMeridiem
                        );
                        formik.setFieldValue('durationMinutes', duration);
                      }}
                      required
                      styleClasses={styleClasses}
                    />

                    <CustomTimeField
                      label="End Time"
                      timeId="endTimeValue"
                      meridiemId="endMeridiem"
                      timeValue={formik.values.endTimeValue}
                      meridiemValue={formik.values.endMeridiem}
                      onTimeChange={(e) => {
                        formik.handleChange(e);
                        const duration = calculateDurationMinutes(
                          formik.values.startTimeValue,
                          formik.values.startMeridiem,
                          e.target.value,
                          formik.values.endMeridiem
                        );
                        formik.setFieldValue('durationMinutes', duration);
                      }}
                      onMeridiemChange={(v) => {
                        formik.setFieldValue('endMeridiem', v);
                        const duration = calculateDurationMinutes(
                          formik.values.startTimeValue,
                          formik.values.startMeridiem,
                          formik.values.endTimeValue,
                          v
                        );
                        formik.setFieldValue('durationMinutes', duration);
                      }}
                      required
                      styleClasses={styleClasses}
                    />

                    <CustomFormField
                      type="number"
                      id="durationMinutes"
                      placeholder="Duration in Minutes"
                      value={formik.values.durationMinutes}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      disabled
                      required
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="dayType"
                      placeholder="Day Type"
                      value={
                        formik.values.dayType === 0
                          ? ''
                          : String(formik.values.dayType)
                      }
                      onChange={(value) =>
                        formik.setFieldValue('dayType', Number(value))
                      }
                      required
                      options={dayTypeOptions}
                      styleClasses={styleClasses}
                    />
                    <CustomDatePickerField
                      id="applyTo"
                      placeholder="Apply Only To"
                      value={
                        formik.values.applyTo
                          ? new Date(formik.values.applyTo)
                          : undefined
                      }
                      onChange={(date) => {
                        formik.setFieldValue('applyTo', date ?? undefined);
                      }}
                      onBlur={formik.handleBlur}
                      required={formik.values.dayType === 8}
                      disabled={formik.values.dayType !== 8}
                      styleClasses={styleClasses}
                      error={formik.errors.applyTo}
                      touched={formik.touched.applyTo}
                      captionLayout="dropdown"
                      disablePast
                    />
                    <CustomFormField
                      type="number"
                      id="startingPatientNumber"
                      placeholder="Starting Patient No."
                      value={formik.values.startingPatientNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={styleClasses}
                    />
                    <CustomFormField
                      type="number"
                      id="maxPatientNumber"
                      placeholder="Maximum Patient No"
                      value={formik.values.maxPatientNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="previousSessionId"
                      placeholder="Previous Session"
                      value={formik.values.previousSessionId}
                      onChange={formik.handleChange}
                      required={false}
                      disabled={
                        previousSessions?.length === 0 ||
                        previousSessions === undefined
                      }
                      options={previousSessions || []}
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="refundable"
                      placeholder="Refundable"
                      value={String(formik.values.refundable)}
                      onChange={(value) =>
                        formik.setFieldValue('refundable', Number(value))
                      }
                      required
                      options={refundableOptions}
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="advancedBookingDays"
                      placeholder="Advance Booking Date"
                      value={String(formik.values.advancedBookingDays)}
                      onChange={(value) =>
                        formik.setFieldValue(
                          'advancedBookingDays',
                          Number(value)
                        )
                      }
                      required
                      options={ADVANCED_BOOKING_OPTIONS}
                      styleClasses={styleClasses}
                    />
                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status?.toString()}
                      onChange={(value) =>
                        formik.setFieldValue('status', parseInt(value))
                      }
                      required
                      options={[
                        { id: '0', name: 'Unpublish' },
                        { id: '1', name: 'Publish' }
                      ]}
                      styleClasses={styleClasses}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="fees">
                  <CustomTable
                    columns={DoctorSessionFeeColumns(formik)}
                    data={formik.values.fees}
                    rowCount={formik.values.fees.length}
                  />

                  <FeeTotals formik={formik} />
                </TabsContent>
              </Tabs>
              <div className="mt-5 flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={() => {
                    router.push('/doctor-sessions');
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
