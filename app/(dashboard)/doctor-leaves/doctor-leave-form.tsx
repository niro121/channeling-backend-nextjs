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
import {
  getAllActiveSessions,
  getCanceledSessions,
  getSessionIdsLockedByOtherLeaves,
  createDoctorLeave,
  updateDoctorLeave
} from '@/app/actions/doctor.leave.action';
import moment from 'moment';
import { formatSessionTime } from '../channel-booking/components/sessions-selection/util';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { CustomSwitch } from '@/components/common/custom-switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LeaveFormProps = {
  doctorId: string;
  doctorName: string;
  doctorLeave: DoctorLeave | null;
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

export default function DoctorLeaveForm({
  doctorId,
  doctorName,
  doctorLeave,
  user,
  onClose,
  onSuccess
}: LeaveFormProps) {
  const [loading, setLoading] = React.useState<boolean>(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const [sessionsLoading, setSessionsLoading] = React.useState<boolean>(false);
  const [activeSessionsFromAPI, setActiveSessionsFromAPI] = React.useState<
    Session[]
  >([]);
  const [canceledSessionsFromAPI, setCanceledSessionsFromAPI] = React.useState<
    Session[]
  >([]);
  const [removedSessions, setRemovedSessions] = React.useState<Session[]>([]);
  /** Session IDs already used by another leave for this doctor — not selectable for this leave */
  const [lockedSessionIds, setLockedSessionIds] = React.useState<Set<string>>(new Set());
  const [sessionsTab, setSessionsTab] = React.useState<'active' | 'selected'>('active');
  const [dateRange, setDateRange] = React.useState<{
    fromDate?: Date;
    toDate?: Date;
  }>({
    fromDate: doctorLeave?.fromDate ?? new Date(),
    toDate: doctorLeave?.toDate ?? new Date()
  });
  const formikRef = React.useRef<any>(null);

  const initialValues: DoctorLeaveFormProps = React.useMemo(
    () => ({
      fromDate: doctorLeave?.fromDate ?? dateRange.fromDate ?? new Date(),
      toDate: doctorLeave?.toDate ?? dateRange.toDate ?? new Date(),
      remarks: doctorLeave?.remarks ?? '',
      sesssions: doctorLeave?.sessions ?? [],
      sendSms: Boolean(doctorLeave?.sendSms),
      status: doctorLeave?.status ?? 1,
      doctorId: doctorLeave?.doctorId ?? doctorId
    }),
    [
      doctorLeave?.id,
      doctorLeave?.fromDate,
      doctorLeave?.toDate,
      doctorLeave?.remarks,
      doctorLeave?.sessions,
      doctorLeave?.sendSms,
      doctorLeave?.status,
      doctorLeave?.doctorId,
      doctorId
    ]
  );

  const validationSchema = Yup.object({
    doctorId: Yup.string().required(),

    fromDate: Yup.date().required('From date is required'),

    toDate: Yup.date()
      .required('To date is required')
      .min(Yup.ref('fromDate'), 'To date cannot be before From date'),

    remarks: Yup.string().required('Remarks is required'),

    sesssions: Yup.array()
      .min(1, 'At least one session must be selected')
      .required('Sessions is required'),

    sendSms: Yup.boolean().required('Send SMS is required'),

    status: Yup.number()
      .oneOf([0, 1], 'Leave status must be Cancelled or Active')
      .required('This field is mandatory')
  });

  const handleSubmit = async (
    values: DoctorLeaveFormProps,
    { setErrors, setTouched }: FormikHelpers<DoctorLeaveFormProps>
  ) => {
    // Ensure doctorId is always sent; convert sendSms boolean to 0/1 for DB
    const payload = {
      ...values,
      doctorId: values.doctorId ?? doctorId,
      sendSms: values.sendSms === true ? 1 : 0
    } as DoctorLeaveFormProps & { sendSms: number };
    const closeAfterSave = saveAndCloseRef.current;

    try {
      let respond: any;

      setLoading(true);

      if (doctorLeave && doctorLeave.id) {
        respond = await updateDoctorLeave(doctorLeave.id, payload, user);

        setLoading(false);

        if (!respond?.success) {
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
        if (onSuccess) {
          if (closeAfterSave) onSuccess();
          else router.refresh();
        } else {
          if (closeAfterSave) router.push(`/doctor-leaves?doctorId=${encodeURIComponent(doctorId)}`);
          else router.refresh();
        }
      } else {
        respond = await createDoctorLeave(payload, user);

        setLoading(false);

        if (!respond?.success) {
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
        const newId = respond?.data?.id;
        const listUrl = `/doctor-leaves?doctorId=${encodeURIComponent(doctorId)}`;
        if (onSuccess) {
          if (closeAfterSave) onSuccess();
          else router.refresh();
        } else if (closeAfterSave) {
          router.push(listUrl);
        } else if (newId) {
          router.push(`/doctor-leaves/${newId}/edit`);
        } else {
          router.push(listUrl);
        }
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
      setActiveSessionsFromAPI([]);
      setCanceledSessionsFromAPI([]);
      setLockedSessionIds(new Set());
      setRemovedSessions([]);
      if (!doctorLeave?.id) {
        formikRef.current?.setFieldValue('sesssions', []);
      }
      return;
    }

    const fromStr = moment(dateRange.fromDate).format('YYYY-MM-DD');
    const toStr = moment(dateRange.toDate).format('YYYY-MM-DD');

    setSessionsLoading(true);

    Promise.all([
      getAllActiveSessions({ doctorId, fromDate: fromStr, toDate: toStr }),
      getCanceledSessions({ doctorId, fromDate: fromStr, toDate: toStr }),
      getSessionIdsLockedByOtherLeaves({
        doctorId,
        excludeLeaveId: doctorLeave?.id ?? undefined
      })
    ])
      .then(([activeRes, canceledRes, lockedRes]) => {
        const activeMapped = activeRes.success && activeRes.data?.length
          ? activeRes.data.map(mapApiSessionToItem)
          : [];
        const canceledMapped = canceledRes.success && canceledRes.data?.length
          ? canceledRes.data.map(mapApiSessionToItem)
          : [];
        setActiveSessionsFromAPI(activeMapped);
        setCanceledSessionsFromAPI(canceledMapped);
        setLockedSessionIds(
          lockedRes.success && Array.isArray(lockedRes.data)
            ? new Set(lockedRes.data)
            : new Set()
        );
        setRemovedSessions([]);
        if (!doctorLeave?.id) {
          formikRef.current?.setFieldValue('sesssions', []);
        }
      })
      .catch(() => {
        setActiveSessionsFromAPI([]);
        setCanceledSessionsFromAPI([]);
        setLockedSessionIds(new Set());
        setRemovedSessions([]);
        if (!doctorLeave?.id) {
          formikRef.current?.setFieldValue('sesssions', []);
        }
      })
      .finally(() => setSessionsLoading(false));
  }, [doctorId, dateRange.fromDate, dateRange.toDate, doctorLeave?.id, doctorLeave?.sessions]);

  return (
    <Formik
      innerRef={formikRef}
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

        const getSessionId = (s: Session | string) => (typeof s === 'string' ? s : s.id);
        const selectedIds = new Set(formik.values.sesssions.map(getSessionId));
        const removedIds = new Set(removedSessions.map((s) => s.id));

        const handleRemoveFromLeave = (session: Session) => {
          const updated = formik.values.sesssions.filter((s) => getSessionId(s) !== session.id);
          formik.setFieldValue('sesssions', updated);
          setRemovedSessions((prev) => (prev.some((s) => s.id === session.id) ? prev : [...prev, session]));
          setSessionsTab('active');
        };

        const handleAddToLeave = (session: Session) => {
          const current = formik.values.sesssions;
          if (current.some((s) => getSessionId(s) === session.id)) return;
          formik.setFieldValue('sesssions', [...current, session]);
          setRemovedSessions((prev) => prev.filter((s) => s.id !== session.id));
          setSessionsTab('selected');
        };

        const handleSelectAll = () => {
          const current = formik.values.sesssions;
          const toAdd = activeSessions.filter((s) => !selectedIds.has(s.id));
          if (toAdd.length === 0) return;
          formik.setFieldValue('sesssions', [...current, ...toAdd]);
          setRemovedSessions((prev) =>
            prev.filter((s) => !toAdd.some((a) => a.id === s.id))
          );
          setSessionsTab('selected');
        };

        const handleRemoveAll = () => {
          const toRemove = selectedSessions;
          formik.setFieldValue('sesssions', []);
          setRemovedSessions((prev) =>
            [...prev, ...toRemove].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
          );
          setSessionsTab('active');
        };

        // Active tab: only sessions that are not selected and not locked by another leave
        const activeSessions = [
          ...activeSessionsFromAPI.filter(
            (s) => !selectedIds.has(s.id) && !lockedSessionIds.has(s.id)
          ),
          ...removedSessions.filter((s) => !lockedSessionIds.has(s.id))
        ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

        // Selected tab: resolve to Session objects (form may have IDs from server; display needs full Session)
        const allSessionSources: Session[] = [
          ...activeSessionsFromAPI,
          ...canceledSessionsFromAPI.filter((s) => !removedIds.has(s.id))
        ];
        const byId = new Map<string, Session>();
        allSessionSources.forEach((s) => byId.set(s.id, s));
        formik.values.sesssions.forEach((s) => {
          const id = getSessionId(s);
          if (typeof s === 'object' && 'date' in s && s.date) byId.set(id, s as Session);
        });
        const selectedSessions = Array.from(byId.values()).filter((s) => selectedIds.has(s.id));

        return (
          <Form className="w-full">
            <div className="grid gap-4 border rounded-lg p-6">
              {/* doctorId is required for submit but not editable — keep in form state via hidden input */}
              <input
                type="hidden"
                name="doctorId"
                value={formik.values.doctorId ?? doctorId}
                readOnly
                aria-hidden
              />
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Doctor<span className="text-red-600"> *</span>
                </Label>
                <div
                  className={`${styleClasses.inputClassName} flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground`}
                  aria-readonly
                >
                  DR. {doctorName}
                </div>
              </div>
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
                      // console.log("From Date: ", date)
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
                      // console.log("To Date: ", date)
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
                <Label className={styleClasses.labelClassName}>
                  Sessions<span className="text-red-600"> *</span>
                </Label>
                <Card
                  className={`${styleClasses.inputClassName} p-3 space-y-3`}
                >
                  <Tabs value={sessionsTab} onValueChange={(v) => setSessionsTab(v as 'active' | 'selected')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="active" className='data-[state=active]:bg-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold'>
                        Active sessions ({activeSessions.length})
                      </TabsTrigger>
                      <TabsTrigger value="selected" className='data-[state=active]:bg-green-700 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-semibold'>
                        Selected sessions ({selectedSessions.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="active" className="mt-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Sessions available for channeling. Add to Selected sessions to include in this leave; on save, booking state follows leave status: Leave Active = sessions go on leave (not bookable); Leave Cancelled = sessions return to normal booking.
                        {lockedSessionIds.size > 0 && (
                          <span className="block mt-1 text-amber-600 dark:text-amber-500">
                            Sessions already in another leave for this doctor are not shown and cannot be selected.
                          </span>
                        )}
                      </p>
                      {!sessionsLoading && activeSessions.length > 0 && (
                        <div className="flex justify-end mb-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleSelectAll}
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Select All
                          </Button>
                        </div>
                      )}
                      <Card className="flex flex-wrap gap-3 p-2 relative min-h-[80px]">
                        {sessionsLoading && (
                          <Loader className="w-4 h-4 animate-spin absolute left-1/2 top-1/4" />
                        )}
                        {!sessionsLoading && activeSessions.length === 0 && (
                          <p className="text-muted-foreground text-center text-sm w-full py-4">
                            No active sessions in this range, or all are already
                            on leave.
                          </p>
                        )}
                        {activeSessions.map((option) => (
                          <Badge
                            key={option.id}
                            variant="secondary"
                            className="h-fit flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 cursor-pointer"
                            onClick={() => handleAddToLeave(option)}
                          >
                            {new Date(option.date).toLocaleDateString()} |{' '}
                            {option.location} | {option.startTime} -{' '}
                            {option.endTime}
                            <Plus className="h-3 w-3 ml-0.5" />
                          </Badge>
                        ))}
                      </Card>
                    </TabsContent>
                    <TabsContent value="selected" className="mt-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Sessions selected for this leave. On save, booking state follows leave status: Leave Active = on leave (not bookable); Leave Cancelled = available for booking again. Remove to exclude from this leave.
                      </p>
                      {selectedSessions.length > 0 && (
                        <div className="flex justify-end mb-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleRemoveAll}
                            className="gap-1.5"
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove All
                          </Button>
                        </div>
                      )}
                      <Card className="flex flex-wrap gap-3 p-2 relative min-h-[80px]">
                        {selectedSessions.length === 0 && (
                          <p className="text-muted-foreground text-center text-sm w-full py-4">
                            No sessions selected. Add from Active sessions tab.
                          </p>
                        )}
                        {selectedSessions.map((option) => (
                          <Badge
                            key={option.id}
                            variant="secondary"
                            className="h-fit flex items-center gap-1 cursor-pointer bg-teal-700 text-white hover:bg-teal-600"
                          >
                            {new Date(option.date).toLocaleDateString()} |{' '}
                            {option.location} | {option.startTime} -{' '}
                            {option.endTime}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                handleRemoveFromLeave(option);
                              }}
                            />
                          </Badge>
                        ))}
                      </Card>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>

              <CustomSwitch
                id="sendSms"
                placeholder="Send SMS"
                checked={formik.values.sendSms}
                onChange={(value) => formik.setFieldValue('sendSms', value)}
                styleClasses={styleClasses}
              />

              <CustomSelectField
                id="status"
                label="Leave status"
                placeholder="Select leave state"
                value={formik.values.status?.toString()}
                onChange={(value) =>
                  formik.setFieldValue('status', parseInt(value))
                }
                required
                options={[
                  {
                    id: '0',
                    name: 'Leave Active (selected sessions unavailable)'
                  },
                  {
                    id: '1',
                    name: 'Leave Cancelled (sessions available again)'
                  }
                ]}
                styleClasses={styleClasses}
              />
              <div className={styleClasses.parentDiv}>
                <span
                  className={`${styleClasses.labelClassName} hidden sm:block sm:col-span-1`}
                  aria-hidden
                />
                <p
                  className={`${styleClasses.inputClassName} text-sm text-muted-foreground`}
                >
                  This sets whether the leave is active after you press Save. It
                  is not the same as Cancel, which exits without saving.
                </p>
              </div>
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
                    if (onClose) onClose();
                    else router.push('/doctor-leaves');
                  }}
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  disabled={loading}
                  size="sm"
                  type="button"
                  className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                  onClick={() => { saveAndCloseRef.current = false; formik.submitForm(); }}
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </Button>
                <Button
                  disabled={loading}
                  size="sm"
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto gap-1 px-6"
                  onClick={() => { saveAndCloseRef.current = true; formik.submitForm(); }}
                >
                  <Save className="h-4 w-4" />
                  <span>Save and Close</span>
                </Button>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
