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
  timeToMinutes,
  minutesToTime,
  SRI_LANKA_TZ
} from '@/lib/utils';
import { TimePickerSelect } from '@/components/common/time-picker-select';
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
  /** When provided (e.g. in a dialog), called instead of navigating on Close */
  onClose?: () => void;
  /** When provided (e.g. in a dialog), called after successful create/update instead of navigating */
  onSuccess?: () => void;
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
  user,
  onClose,
  onSuccess
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
      .min(0, 'This field is mandatory')
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
      .required('This field is mandatory'),

    amountLocal: Yup.number()
      .transform((value) => (value === '' || value == null ? undefined : Number(value)))
      .required('Local fee is required')
      .min(0.01, 'Local fee must be greater than 0'),

    amountForeign: Yup.number()
      .transform((value) => (value === '' || value == null ? undefined : Number(value)))
      .required('Foreign fee is required')
      .min(0.01, 'Foreign fee must be greater than 0')
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
        if (onSuccess) onSuccess();
        else router.push('/doctor-sessions');
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

        if (onSuccess) onSuccess();
        else if (respond.data?.id) {
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
        const compactClasses = {
          parentDiv: 'flex flex-col gap-2',
          labelClassName: 'text-sm font-medium text-foreground',
          inputClassName: 'w-full'
        };

        // Default end to start + 1 hour when start is set and end is empty; enforce end >= start; sync duration
        React.useEffect(() => {
          const startVal = formik.values.startTimeValue;
          const startMer = formik.values.startMeridiem;
          const endVal = formik.values.endTimeValue;
          const endMer = formik.values.endMeridiem;

          const startMins = timeToMinutes(startVal, startMer);
          const endMins = timeToMinutes(endVal, endMer);
          const minEndMins = startMins + 1; // end must be at least 1 minute after start

          let effectiveEndMins = endMins;
          if (startVal && startVal.trim()) {
            if (!endVal || !endVal.trim()) {
              // Default to start + 1 hour when end is empty
              effectiveEndMins = startMins + 60;
              const { timeStr, meridiem } = minutesToTime(effectiveEndMins);
              formik.setFieldValue('endTimeValue', timeStr);
              formik.setFieldValue('endMeridiem', meridiem);
            } else if (endMins < minEndMins) {
              // End is before or equal to start: clamp to start + 1 minute
              effectiveEndMins = minEndMins;
              const { timeStr, meridiem } = minutesToTime(minEndMins);
              if (endVal !== timeStr || endMer !== meridiem) {
                formik.setFieldValue('endTimeValue', timeStr);
                formik.setFieldValue('endMeridiem', meridiem);
              }
            }
          }

          const duration = Math.max(0, effectiveEndMins - startMins);
          if (formik.values.durationMinutes !== duration) {
            formik.setFieldValue('durationMinutes', duration);
          }
        }, [
          formik.values.startTimeValue,
          formik.values.startMeridiem,
          formik.values.endTimeValue,
          formik.values.endMeridiem
        ]);

        const sectionTitle = 'text-sm font-semibold text-green-700 border-b border-border pb-2 mb-4';
        const sectionCard = 'rounded-lg border border-border bg-muted/30 p-5 space-y-4';

        const setLocationHandler = (value: string) => {
          formik.setFieldValue('locationId', value);
          setNewLocationId(value);
        };

        return (
          <Form className="w-full">
            <div className="border rounded-lg p-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full bg-muted rounded-lg p-1.5 h-11">
                  <TabsTrigger
                    value="details"
                    className="flex-1 data-[state=active]:bg-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                  >
                    Session Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="fees"
                    className="flex-1 data-[state=active]:bg-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                  >
                    Session Fees
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-6">
                  <div className="space-y-8">
                    <CustomFormField
                      type="text"
                      id="name"
                      placeholder="Session Name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={compactClasses}
                    />

                    {/* Where */}
                    <div className={sectionCard}>
                      <h3 className={sectionTitle}>Where</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <CustomSelectField
                          id="institution"
                          placeholder="Institution"
                          value={String(formik.values.institution)}
                          onChange={(value) =>
                            formik.setFieldValue('institution', Number(value))
                          }
                          required
                          options={institutionOptions}
                          styleClasses={compactClasses}
                        />
                        <CustomSelectField
                          id="departmentId"
                          placeholder="Department"
                          value={formik.values.departmentId}
                          onChange={(value) =>
                            formik.setFieldValue('departmentId', value)
                          }
                          required
                          disabled={departmentOptions?.length === 0}
                          options={departmentOptions || []}
                          styleClasses={compactClasses}
                        />
                        <CustomSelectField
                          id="locationId"
                          placeholder="Location"
                          value={formik.values.locationId}
                          onChange={setLocationHandler}
                          required
                          disabled={locationOptions?.length === 0}
                          options={locationOptions || []}
                          styleClasses={compactClasses}
                        />
                        <div className="relative">
                          {roomloading && (
                            <Loader className="w-4 h-4 animate-spin absolute left-1/2 top-1/4 z-10" />
                          )}
                          <CustomSelectField
                            id="roomId"
                            placeholder="Room"
                            value={formik.values.roomId}
                            onChange={(value) =>
                              formik.setFieldValue('roomId', value)
                            }
                            required={false}
                            disabled={roomOptions.length === 0}
                            options={roomOptions}
                            styleClasses={compactClasses}
                          />
                        </div>
                      </div>
                    </div>

                    {/* When */}
                    <div className={sectionCard}>
                      <h3 className={sectionTitle}>When</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <TimePickerSelect
                          id="startTimeValue"
                          label="Start Time"
                          timeValue={formik.values.startTimeValue}
                          meridiemValue={formik.values.startMeridiem}
                          onTimeChange={(e) => {
                            formik.setFieldValue('startTimeValue', e.target.value);
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
                          styleClasses={compactClasses}
                        />
                        <TimePickerSelect
                          id="endTimeValue"
                          label="End Time"
                          timeValue={formik.values.endTimeValue}
                          meridiemValue={formik.values.endMeridiem}
                          onTimeChange={(e) => {
                            formik.setFieldValue('endTimeValue', e.target.value);
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
                          styleClasses={compactClasses}
                        />
                        <CustomFormField
                          type="number"
                          id="durationMinutes"
                          placeholder="Duration (minutes)"
                          value={formik.values.durationMinutes}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          disabled
                          required
                          styleClasses={compactClasses}
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
                          styleClasses={compactClasses}
                        />
                        <div className={formik.values.dayType === 8 ? 'sm:col-span-2' : ''}>
                          <CustomDatePickerField
                            id="applyTo"
                            placeholder="Apply only to (specific date)"
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
                            styleClasses={compactClasses}
                            error={formik.errors.applyTo}
                            touched={formik.touched.applyTo}
                            captionLayout="dropdown"
                            disablePast
                          />
                        </div>
                      </div>
                    </div>

                    {/* Capacity */}
                    <div className={sectionCard}>
                      <h3 className={sectionTitle}>Capacity</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <CustomFormField
                          type="number"
                          id="startingPatientNumber"
                          placeholder="Starting Patient No."
                          value={formik.values.startingPatientNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          required
                          styleClasses={compactClasses}
                        />
                        <CustomFormField
                          type="number"
                          id="maxPatientNumber"
                          placeholder="Maximum Patient No."
                          value={formik.values.maxPatientNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          required
                          styleClasses={compactClasses}
                        />
                        <CustomSelectField
                          id="previousSessionId"
                          placeholder="Previous Session"
                          value={formik.values.previousSessionId}
                          onChange={(value) =>
                            formik.setFieldValue('previousSessionId', value)
                          }
                          required={false}
                          disabled={
                            previousSessions?.length === 0 ||
                            previousSessions === undefined
                          }
                          options={previousSessions || []}
                          styleClasses={compactClasses}
                        />
                      </div>
                    </div>

                    {/* Booking & status */}
                    <div className={sectionCard}>
                      <h3 className={sectionTitle}>Booking & status</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                        <CustomSelectField
                          id="refundable"
                          placeholder="Refundable"
                          value={String(formik.values.refundable)}
                          onChange={(value) =>
                            formik.setFieldValue('refundable', Number(value))
                          }
                          required={false}
                          options={refundableOptions}
                          styleClasses={compactClasses}
                        />
                        <CustomSelectField
                          id="advancedBookingDays"
                          placeholder="Advance Booking Days"
                          value={String(formik.values.advancedBookingDays)}
                          onChange={(value) =>
                            formik.setFieldValue(
                              'advancedBookingDays',
                              Number(value)
                            )
                          }
                          required
                          options={ADVANCED_BOOKING_OPTIONS}
                          styleClasses={compactClasses}
                        />
                        <CustomSelectField
                          id="status"
                          placeholder="Status"
                          value={formik.values.status?.toString()}
                          onChange={(value) =>
                            formik.setFieldValue('status', parseInt(value))
                          }
                          required={false}
                          options={[
                            { id: '0', name: 'Unpublish' },
                            { id: '1', name: 'Publish' }
                          ]}
                          styleClasses={compactClasses}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="fees" className="mt-4">
                  <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                    <CustomTable
                      columns={DoctorSessionFeeColumns(formik)}
                      data={formik.values.fees}
                      rowCount={formik.values.fees.length}
                      compact
                      showFooter={false}
                      noCard
                    />
                    <FeeTotals formik={formik} />
                  </div>
                </TabsContent>
              </Tabs>
              <div className="mt-5 flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    else router.push('/doctor-sessions');
                  }}
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  <span>Close</span>
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
