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
import {
  formatSessionTime,
  getSessionStartAt
} from '../channel-booking/components/sessions-selection/util';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { CustomSwitch } from '@/components/common/custom-switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SESSION_STARTED_TOOLTIP =
  'This session has already started (or its start time is now or in the past). It cannot be added to or removed from this leave.';

const SAVE_DISABLED_ILLEGAL_TOOLTIP =
  'The session list cannot be changed to add or remove sessions that have already started. Reload the form and avoid altering those entries.';

const SAVE_DISABLED_NO_SESSIONS_TOOLTIP =
  'Select at least one session to save this leave. Add sessions from the Active sessions tab to Selected sessions, then try again.';

/** True when the session’s scheduled start (date + start time) is at or before the current time. */
function isSessionStartOnOrBeforeNow(s: Session): boolean {
  if (s.startAt && !Number.isNaN(new Date(s.startAt).getTime())) {
    return new Date(s.startAt).getTime() <= Date.now();
  }
  if (!s.startTime) return false;
  const m = s.startTime.trim().match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const d = new Date(s.date);
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (!Number.isNaN(h) && !Number.isNaN(min)) {
      const start = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        h,
        min,
        0,
        0
      );
      return start.getTime() <= Date.now();
    }
  }
  const ampm = s.startTime.trim().match(/^(\d{1,2})\.(\d{2})(AM|PM)$/i);
  if (ampm) {
    const d = new Date(s.date);
    let h = parseInt(ampm[1], 10);
    const min = parseInt(ampm[2], 10);
    const p = ampm[3].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    if (!Number.isNaN(h) && !Number.isNaN(min)) {
      const start = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        h,
        min,
        0,
        0
      );
      return start.getTime() <= Date.now();
    }
  }
  return false;
}

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
  /** Clears `removedSessions` only when doctor or date range changes — not on every refetch (see sessions fetch effect). */
  const sessionsFetchKeyRef = React.useRef<string>('');

  const initialValues: DoctorLeaveFormProps = React.useMemo(
    () => ({
      fromDate: doctorLeave?.fromDate ?? dateRange.fromDate ?? new Date(),
      toDate: doctorLeave?.toDate ?? dateRange.toDate ?? new Date(),
      remarks: doctorLeave?.remarks ?? '',
      sesssions: doctorLeave?.sessions ?? [],
      sendSms: Boolean(doctorLeave?.sendSms),
      status: doctorLeave?.status ?? 0,
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

  const isEditingExistingLeave = Boolean(doctorLeave?.id);
  /** When editing, calendar day of the saved To Date — To Date may only stay the same or move later. */
  const savedEndDateFloor = React.useMemo(() => {
    if (!doctorLeave?.toDate) return undefined;
    return moment(doctorLeave.toDate).startOf('day').toDate();
  }, [doctorLeave?.id, doctorLeave?.toDate]);

  const validationSchema = React.useMemo(
    () =>
      Yup.object({
        doctorId: Yup.string().required(),

        fromDate: Yup.date().required('From date is required'),

        toDate: Yup.date()
          .required('To date is required')
          .min(Yup.ref('fromDate'), 'To date cannot be before From date')
          .test(
            'edit-to-not-before-saved',
            'To date cannot be earlier than the current end date',
            function (value) {
              if (!isEditingExistingLeave || !savedEndDateFloor || !value) {
                return true;
              }
              return (
                moment(value).startOf('day').valueOf() >=
                moment(savedEndDateFloor).startOf('day').valueOf()
              );
            }
          ),

        remarks: Yup.string().required('Remarks is required'),

        sesssions: Yup.array()
          .min(1, 'At least one session must be selected')
          .required('Sessions is required'),

        sendSms: Yup.boolean().required('Send SMS is required'),

        status: Yup.number()
          .oneOf([0, 1], 'Leave status must be Cancelled or Active')
          .required('This field is mandatory')
      }),
    [
      isEditingExistingLeave,
      savedEndDateFloor
    ]
  );

  const handleSubmit = async (
    values: DoctorLeaveFormProps,
    { setErrors, setTouched }: FormikHelpers<DoctorLeaveFormProps>
  ) => {
    // Ensure doctorId is always sent; convert sendSms boolean to 0/1 for DB.
    // Duplicate selected sessions under `sessions` so server actions always receive ids (some paths only read `sessions`).
    const sessionIds = values.sesssions.map((s) =>
      typeof s === 'string' ? s : s.id
    );
    const payload = {
      ...values,
      doctorId: values.doctorId ?? doctorId,
      sendSms: values.sendSms === true ? 1 : 0,
      sessions: sessionIds.map((id) => ({ id }))
    } as DoctorLeaveFormProps & { sendSms: number; sessions: { id: string }[] };
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
    const date = new Date(raw.date);
    return {
      id: raw.id,
      date,
      location: raw.location?.name ?? '',
      startTime: formatSessionTime(raw.startTime, raw.date),
      endTime: formatSessionTime(raw.endTime, raw.date),
      startAt: getSessionStartAt(raw.startTime, date)
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
    const fetchKey = `${doctorId}|${fromStr}|${toStr}`;
    if (sessionsFetchKeyRef.current !== fetchKey) {
      sessionsFetchKeyRef.current = fetchKey;
      setRemovedSessions([]);
    }

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
        if (!doctorLeave?.id) {
          formikRef.current?.setFieldValue('sesssions', []);
        }
      })
      .catch(() => {
        setActiveSessionsFromAPI([]);
        setCanceledSessionsFromAPI([]);
        setLockedSessionIds(new Set());
        if (!doctorLeave?.id) {
          formikRef.current?.setFieldValue('sesssions', []);
        }
      })
      .finally(() => setSessionsLoading(false));
    // Intentionally omit `doctorLeave?.sessions`: it is a new array reference on many parent renders and
    // would refetch and previously cleared `removedSessions` after the user deselects on-leave sessions (edit only).
  }, [doctorId, dateRange.fromDate, dateRange.toDate, doctorLeave?.id]);

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
          ...canceledSessionsFromAPI.filter((s) => !removedIds.has(s.id)),
          ...removedSessions
        ];
        const byId = new Map<string, Session>();
        allSessionSources.forEach((s) => byId.set(s.id, s));
        formik.values.sesssions.forEach((s) => {
          const id = getSessionId(s);
          if (typeof s === 'object' && 'date' in s && s.date) byId.set(id, s as Session);
        });
        (formik.initialValues.sesssions ?? []).forEach((s) => {
          const id = getSessionId(s);
          if (!byId.has(id) && typeof s === 'object' && 'date' in s && s.date) {
            byId.set(id, s as Session);
          }
        });
        const selectedSessions = Array.from(byId.values()).filter((s) => selectedIds.has(s.id));

        const initSessionIds = new Set(
          (formik.initialValues.sesssions ?? []).map((s) => getSessionId(s))
        );
        const currSessionIds = new Set(formik.values.sesssions.map((s) => getSessionId(s)));
        let illegalSessionMembershipChange = false;
        for (const id of initSessionIds) {
          if (currSessionIds.has(id)) continue;
          const s = byId.get(id);
          if (s && isSessionStartOnOrBeforeNow(s)) {
            illegalSessionMembershipChange = true;
            break;
          }
        }
        if (!illegalSessionMembershipChange) {
          for (const id of currSessionIds) {
            if (initSessionIds.has(id)) continue;
            const s = byId.get(id);
            if (s && isSessionStartOnOrBeforeNow(s)) {
              illegalSessionMembershipChange = true;
              break;
            }
          }
        }

        const canSelectAllActive = activeSessions.some(
          (s) => !selectedIds.has(s.id) && !isSessionStartOnOrBeforeNow(s)
        );
        const canRemoveAll = selectedSessions.some((s) => !isSessionStartOnOrBeforeNow(s));

        const handleRemoveFromLeave = (session: Session) => {
          if (isSessionStartOnOrBeforeNow(session)) return;
          const updated = formik.values.sesssions.filter((s) => getSessionId(s) !== session.id);
          void formik.setFieldValue('sesssions', updated);
          if (updated.length === 0) {
            void formik.setFieldTouched('sesssions', true, false);
          }
          setRemovedSessions((prev) => (prev.some((s) => s.id === session.id) ? prev : [...prev, session]));
        };

        const handleAddToLeave = (session: Session) => {
          if (isSessionStartOnOrBeforeNow(session)) return;
          const current = formik.values.sesssions;
          if (current.some((s) => getSessionId(s) === session.id)) return;
          formik.setFieldValue('sesssions', [...current, session]);
          setRemovedSessions((prev) => prev.filter((s) => s.id !== session.id));
        };

        const handleSelectAll = () => {
          const current = formik.values.sesssions;
          const toAdd = activeSessions.filter(
            (s) => !selectedIds.has(s.id) && !isSessionStartOnOrBeforeNow(s)
          );
          if (toAdd.length === 0) return;
          formik.setFieldValue('sesssions', [...current, ...toAdd]);
          setRemovedSessions((prev) =>
            prev.filter((s) => !toAdd.some((a) => a.id === s.id))
          );
          setSessionsTab('selected');
        };

        const handleRemoveAll = () => {
          const toRemove = selectedSessions.filter((s) => !isSessionStartOnOrBeforeNow(s));
          if (toRemove.length === 0) return;
          const stay = selectedSessions.filter((s) => isSessionStartOnOrBeforeNow(s));
          const stayIds = new Set(stay.map((s) => s.id));
          formik.setFieldValue(
            'sesssions',
            formik.values.sesssions.filter((s) => stayIds.has(getSessionId(s)))
          );
          setRemovedSessions((prev) =>
            [...prev, ...toRemove].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
          );
          if (stay.length > 0) {
            setSessionsTab('selected');
          } else {
            setSessionsTab('active');
            void formik.setFieldTouched('sesssions', true, false);
          }
        };

        const hasNoSelectedSessions = formik.values.sesssions.length === 0;
        const saveActionsDisabled =
          loading || illegalSessionMembershipChange || hasNoSelectedSessions;
        const showSaveDisabledWhyTooltip =
          !loading && (illegalSessionMembershipChange || hasNoSelectedSessions);
        const saveDisabledWhyTooltip = illegalSessionMembershipChange
          ? SAVE_DISABLED_ILLEGAL_TOOLTIP
          : SAVE_DISABLED_NO_SESSIONS_TOOLTIP;

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
                    disabled={isEditingExistingLeave}
                    error={
                      formik.touched.fromDate &&
                      typeof formik.errors.fromDate === 'string'
                        ? formik.errors.fromDate
                        : undefined
                    }
                    touched={!!formik.touched.fromDate}
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
                    disablePast={!isEditingExistingLeave}
                    minDate={isEditingExistingLeave ? savedEndDateFloor : undefined}
                    required
                  />
                </div>
              </div>
              <div className={styleClasses.parentDiv}>
                <Label className={styleClasses.labelClassName}>
                  Sessions<span className="text-red-600"> *</span>
                </Label>
                <Card
                  id="doctor-leave-sessions-field"
                  className={cn(
                    styleClasses.inputClassName,
                    'p-3 space-y-3',
                    hasNoSelectedSessions &&
                      'border-amber-500/50 dark:border-amber-500/40',
                    hasNoSelectedSessions &&
                      formik.submitCount > 0 &&
                      'ring-2 ring-amber-500/30 ring-offset-1 ring-offset-background'
                  )}
                  role="group"
                  aria-describedby={
                    hasNoSelectedSessions ? 'doctor-leave-sessions-hint' : undefined
                  }
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
                          {canSelectAllActive ? (
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
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5"
                                    disabled
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Select All
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                className="max-w-56"
                              >
                                {SESSION_STARTED_TOOLTIP}
                              </TooltipContent>
                            </Tooltip>
                          )}
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
                        {activeSessions.map((option) => {
                          const started = isSessionStartOnOrBeforeNow(option);
                          const label = (
                            <>
                              {new Date(option.date).toLocaleDateString()} |{' '}
                              {option.location} | {option.startTime} -{' '}
                              {option.endTime}
                              <Plus className="h-3 w-3 ml-0.5" />
                            </>
                          );
                          if (started) {
                            return (
                              <Tooltip key={option.id}>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-not-allowed">
                                    <Badge
                                      variant="secondary"
                                      className="h-fit flex items-center gap-1 bg-muted text-muted-foreground border border-border opacity-70 pointer-events-none"
                                      aria-disabled
                                    >
                                      {label}
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  className="max-w-xs"
                                >
                                  {SESSION_STARTED_TOOLTIP}
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          return (
                            <Badge
                              key={option.id}
                              variant="secondary"
                              className="h-fit flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 cursor-pointer"
                              onClick={() => handleAddToLeave(option)}
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      </Card>
                    </TabsContent>
                    <TabsContent value="selected" className="mt-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Sessions selected for this leave. On save, booking state follows leave status: Leave Active = on leave (not bookable); Leave Cancelled = available for booking again. Remove to exclude from this leave.
                      </p>
                      {selectedSessions.length > 0 && (
                        <div className="flex justify-end mb-2">
                          {canRemoveAll ? (
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
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5"
                                    disabled
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Remove All
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-56">
                                {SESSION_STARTED_TOOLTIP}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                      <Card className="flex flex-wrap gap-3 p-2 relative min-h-[80px]">
                        {selectedSessions.length === 0 && (
                          <p className="text-muted-foreground text-center text-sm w-full py-4">
                            No sessions selected. Add from Active sessions tab.
                          </p>
                        )}
                        {selectedSessions.map((option) => {
                          const started = isSessionStartOnOrBeforeNow(option);
                          const line = (
                            <>
                              {new Date(option.date).toLocaleDateString()} |{' '}
                              {option.location} | {option.startTime} -{' '}
                              {option.endTime}
                            </>
                          );
                          if (started) {
                            return (
                              <Tooltip key={option.id}>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-not-allowed">
                                    <Badge
                                      variant="secondary"
                                      className="h-fit flex items-center gap-1 bg-muted text-muted-foreground border border-border opacity-80 pointer-events-none"
                                      aria-disabled
                                    >
                                      {line}
                                      <X
                                        className="h-3 w-3 opacity-50"
                                        aria-hidden
                                      />
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {SESSION_STARTED_TOOLTIP}
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          return (
                            <Badge
                              key={option.id}
                              variant="secondary"
                              className="h-fit flex items-center gap-1 cursor-pointer bg-teal-700 text-white hover:bg-teal-600"
                            >
                              {line}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  handleRemoveFromLeave(option);
                                }}
                              />
                            </Badge>
                          );
                        })}
                      </Card>
                    </TabsContent>
                  </Tabs>
                </Card>
                {hasNoSelectedSessions && (
                  <p
                    id="doctor-leave-sessions-hint"
                    className="col-span-full sm:col-span-3 sm:col-start-2 text-sm text-amber-800 dark:text-amber-200/90 mt-1.5"
                    role="status"
                  >
                    <span className="font-medium">At least one session is required. </span>
                    Add sessions from the <strong>Active sessions</strong> tab. Save and Save
                    and Close stay disabled until you select at least one session.
                  </p>
                )}
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
                {showSaveDisabledWhyTooltip ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex w-full sm:w-auto">
                          <Button
                            disabled
                            size="sm"
                            type="button"
                            className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        className="max-w-xs"
                      >
                        {saveDisabledWhyTooltip}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex w-full sm:w-auto">
                          <Button
                            disabled
                            size="sm"
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto gap-1 px-6"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save and Close</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        className="max-w-56"
                      >
                        {saveDisabledWhyTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <Button
                      disabled={saveActionsDisabled}
                      size="sm"
                      type="button"
                      className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
                      onClick={() => { saveAndCloseRef.current = false; formik.submitForm(); }}
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </Button>
                    <Button
                      disabled={saveActionsDisabled}
                      size="sm"
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto gap-1 px-6"
                      onClick={() => { saveAndCloseRef.current = true; formik.submitForm(); }}
                    >
                      <Save className="h-4 w-4" />
                      <span>Save and Close</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
