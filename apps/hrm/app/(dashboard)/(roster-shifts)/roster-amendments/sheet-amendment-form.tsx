'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomAlertDialog,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import { formatAuditDateTime } from '@/lib/utils/date';
import { buttonStyles } from '@/lib/utils/common-styles';
import { RosterLeaveHint } from '@/components/roster/leave-application-hint';
import {
  amendmentFormValuesToPayload,
  amendmentRecordToFormValues
} from '@/lib/mappers/roster-amendment-form.mapper';
import {
  createRosterAmendmentAction,
  getRosterAmendmentConflictPreviewAction,
  listPublishedAllocationsForAmendmentAction,
  lookupPublishedAllocationForAmendmentAction,
  updateRosterAmendmentAction
} from '@/app/actions/roster-actions/roster-amendment.actions';
import {
  getDutySwapCandidatesAction,
  getStaffStandingAssignmentsForDutyAction
} from '@/app/actions/roster-actions/duty-roster.actions';
import type {
  DutyRosterStandingAssignmentOption,
  DutyRosterSwapCandidate,
  RosterAmendmentAllocationLookup,
  RosterAmendmentConflictPreview,
  RosterAmendmentFormOptions,
  RosterAmendmentPublishedDuty,
  RosterAmendmentRecord,
  RosterAmendmentReplacementStaffOption
} from '@/types/roster';
import type { AmendmentFormSheetMode } from './roster-amendments-ui-context';

export type AmendmentFormValues = {
  amendmentNo: string;
  amendmentTypeId: string;
  staffId: string;
  rosterDate: Date | null;
  originalShift: string;
  originalShiftTypeId: string;
  amendedShiftId: string;
  replacementStaffId: string;
  dutyLocationDepartmentId: string;
  dutyZoneId: string;
  dutyRoomId: string;
  requestedById: string;
  status: string;
  reason: string;
  remarks: string;
};

type SheetAmendmentFormProps = {
  open: boolean;
  mode: AmendmentFormSheetMode;
  record: RosterAmendmentRecord | null;
  formOptions: RosterAmendmentFormOptions;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function emptyValues(): AmendmentFormValues {
  return {
    amendmentNo: 'Auto-assigned on save',
    amendmentTypeId: '',
    staffId: '',
    rosterDate: null,
    originalShift: '',
    originalShiftTypeId: '',
    amendedShiftId: '',
    replacementStaffId: '',
    dutyLocationDepartmentId: '',
    dutyZoneId: '',
    dutyRoomId: '',
    requestedById: '',
    status: 'pending_approval',
    reason: '',
    remarks: ''
  };
}

function typeMeta(type: string) {
  return {
    isShiftChange: type === 'shift_change',
    isShiftSwap: type === 'shift_swap',
    isStaffReplacement: type === 'staff_replacement',
    isCancellation: type === 'duty_cancellation',
    isLocationChange: type === 'location_change',
    isExtraDuty: type === 'extra_duty',
    needsAmendedShift: type === 'shift_change' || type === 'extra_duty',
    needsSwapStaff: type === 'staff_replacement' || type === 'shift_swap',
    needsDutyLocation: type === 'location_change',
    needsPublishedCell: type !== 'extra_duty',
    needsConflictStrip: type === 'extra_duty' || type === 'shift_change',
    needsPublishedDutySelect:
      type === 'duty_cancellation' ||
      type === 'shift_change' ||
      type === 'location_change' ||
      type === 'staff_replacement' ||
      type === 'shift_swap',
    needsDutySummary:
      type === 'shift_change' ||
      type === 'shift_swap' ||
      type === 'staff_replacement' ||
      type === 'duty_cancellation' ||
      type === 'location_change'
  };
}

function typeHint(type: string): string | null {
  switch (type) {
    case 'shift_change':
      return 'Change the shift type on one published duty for this staff member on the selected date. Choose which duty when more than one exists that day.';
    case 'shift_swap':
      return 'Swap one published duty with another staff member’s published duty that day. Choose both duties when either person has more than one.';
    case 'staff_replacement':
      return 'Hand one published duty to a different staff member who is free that day. The shift stays the same.';
    case 'duty_cancellation':
      return 'Cancel and remove one published duty for this staff member on the selected date. If they have more than one duty that day, choose which shift to cancel.';
    case 'location_change':
      return 'Update the duty place on one published cell without changing the shift. Choose which duty when more than one exists that day.';
    case 'extra_duty':
      return 'Add an extra published duty. A published cell that day is optional.';
    default:
      return null;
  }
}

function formatDutyDay(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function placeLine(lookup: RosterAmendmentAllocationLookup): string {
  if (!lookup) return '—';
  const parts = [
    lookup.dutyLocationDepartmentName || lookup.dutyLocation || lookup.department,
    lookup.dutyZoneName,
    lookup.dutyRoomName
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

function OriginalDutyCard({
  lookup,
  title = 'Published duty'
}: {
  lookup: RosterAmendmentAllocationLookup;
  title?: string;
}) {
  if (!lookup) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-muted-foreground">
          Select staff and date to load the published duty summary.
        </p>
      </div>
    );
  }

  const staffLabel = lookup.staffCode
    ? `${lookup.staffCode} — ${lookup.staffName}`
    : lookup.staffName;

  return (
    <div className="space-y-2 rounded-lg border-2 border-border bg-muted/40 px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">{title}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
          {lookup.status || 'published'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff: <span className="text-foreground">{staffLabel || '—'}</span>
        </p>
        <p>
          Date:{' '}
          <span className="text-foreground">
            {formatDutyDay(lookup.dutyDate)}
          </span>
        </p>
        <p>
          Shift:{' '}
          <span className="text-foreground">
            {lookup.originalShiftLabel || '—'}
          </span>
        </p>
        <p>
          Times:{' '}
          <span className="text-foreground">
            {lookup.startTime && lookup.endTime
              ? `${lookup.startTime} – ${lookup.endTime}`
              : '—'}
          </span>
        </p>
        <p>
          Department:{' '}
          <span className="text-foreground">
            {lookup.department || '—'}
          </span>
        </p>
        <p>
          Duty place:{' '}
          <span className="text-foreground">{placeLine(lookup)}</span>
        </p>
        <p>
          Ward / unit:{' '}
          <span className="text-foreground">{lookup.unit || '—'}</span>
        </p>
        <p>
          Roster:{' '}
          <span className="text-foreground">{lookup.roster || '—'}</span>
        </p>
        <p className="sm:col-span-2">
          Supervisor:{' '}
          <span className="text-foreground">
            {lookup.supervisorName || '—'}
          </span>
        </p>
      </div>
    </div>
  );
}

function SwapPartnerCard({
  candidate
}: {
  candidate: DutyRosterSwapCandidate | null;
}) {
  if (!candidate) {
    return (
      <div className="space-y-2 rounded-lg border border-sky-500/40 bg-sky-50/50 px-3 py-3 text-sm dark:bg-sky-950/20">
        <p className="font-semibold text-foreground">Swap partner duty</p>
        <p className="text-muted-foreground">
          Select another staff member who already has a published duty that day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-sky-500/60 bg-sky-50/60 px-3 py-3 text-sm dark:bg-sky-950/20">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">Swap partner duty</p>
        <span className="rounded-full bg-sky-600/10 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:text-sky-300">
          Partner
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff: <span className="text-foreground">{candidate.name}</span>
        </p>
        <p>
          Date:{' '}
          <span className="text-foreground">
            {formatDutyDay(candidate.date)}
          </span>
        </p>
        <p>
          Shift:{' '}
          <span className="text-foreground">{candidate.shiftName}</span>
        </p>
        <p>
          Times:{' '}
          <span className="text-foreground">
            {candidate.startTime} – {candidate.endTime}
          </span>
        </p>
        <p>
          Department:{' '}
          <span className="text-foreground">
            {candidate.department || '—'}
          </span>
        </p>
        <p>
          Duty location:{' '}
          <span className="text-foreground">
            {candidate.dutyLocation || '—'}
          </span>
        </p>
        <p>
          Ward / unit:{' '}
          <span className="text-foreground">{candidate.wardUnit || '—'}</span>
        </p>
        <p>
          Roster:{' '}
          <span className="text-foreground">{candidate.roster || '—'}</span>
        </p>
      </div>
    </div>
  );
}

function ReplacementPreviewCard({
  staff,
  duty,
  standing
}: {
  staff: RosterAmendmentReplacementStaffOption | null;
  duty: RosterAmendmentAllocationLookup;
  standing: DutyRosterStandingAssignmentOption | null;
}) {
  if (!staff) {
    return (
      <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-50/50 px-3 py-3 text-sm dark:bg-amber-950/20">
        <p className="font-semibold text-foreground">Replacement preview</p>
        <p className="text-muted-foreground">
          Select a staff member who does not already have a duty on this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-amber-500/70 bg-amber-50/60 px-3 py-3 text-sm dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">Replacement preview</p>
        <span className="rounded-full bg-amber-600/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
          Incoming staff
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff: <span className="text-foreground">{staff.name}</span>
        </p>
        <p>
          Institution:{' '}
          <span className="text-foreground">
            {staff.institutionName || '—'}
          </span>
        </p>
        <p>
          Working dept:{' '}
          <span className="text-foreground">
            {staff.workingDepartmentName || '—'}
          </span>
        </p>
        <p>
          Roster:{' '}
          <span className="text-foreground">{staff.roster || '—'}</span>
        </p>
        {standing ? (
          <>
            <p>
              Standing shift:{' '}
              <span className="text-foreground">{standing.shiftName}</span>
            </p>
            <p>
              Assignment:{' '}
              <span className="text-foreground">{standing.name}</span>
            </p>
          </>
        ) : (
          <p className="sm:col-span-2">
            Standing assignment:{' '}
            <span className="text-foreground">None covering this date</span>
          </p>
        )}
      </div>
      {duty ? (
        <div className="rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-2 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">
            Will take over this duty
          </p>
          <p>
            {duty.originalShiftLabel}
            {duty.startTime && duty.endTime
              ? ` · ${duty.startTime}–${duty.endTime}`
              : ''}
            {` · ${placeLine(duty)}`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ConflictStrip({
  preview
}: {
  preview: RosterAmendmentConflictPreview | null;
}) {
  if (!preview) return null;
  if (
    !preview.blocksSave &&
    !preview.infoMessage &&
    preview.allocations.length === 0
  ) {
    return null;
  }

  if (preview.blocksSave) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        {preview.blockReason ??
          'Cannot save this amendment for the selected staff and date.'}
      </div>
    );
  }

  if (preview.infoMessage) {
    return (
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        {preview.infoMessage}
      </div>
    );
  }

  return null;
}

function AutoPublishedAllocationLookup({
  staffId,
  rosterDate,
  amendmentTypeId,
  setFieldValue,
  toast,
  onLookup
}: {
  staffId: string;
  rosterDate: Date | null;
  amendmentTypeId: string;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
  toast: ReturnType<typeof useToast>['toast'];
  onLookup: (lookup: RosterAmendmentAllocationLookup) => void;
}) {
  const lookupKey = useRef('');
  const meta = typeMeta(amendmentTypeId);

  useEffect(() => {
    if (meta.needsPublishedDutySelect) {
      return;
    }

    if (!staffId || !rosterDate) {
      void setFieldValue('originalShift', '');
      void setFieldValue('originalShiftTypeId', '');
      onLookup(null);
      return;
    }

    const key = `${staffId}:${format(rosterDate, 'yyyy-MM-dd')}:${amendmentTypeId}`;
    if (lookupKey.current === key) return;
    lookupKey.current = key;

    let cancelled = false;

    void (async () => {
      const result = await lookupPublishedAllocationForAmendmentAction(
        staffId,
        format(rosterDate, 'yyyy-MM-dd')
      );
      if (cancelled) return;

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Lookup failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not load published shift for this staff member and date.'
        });
        void setFieldValue('originalShift', '');
        void setFieldValue('originalShiftTypeId', '');
        onLookup(null);
        return;
      }

      const allocation = result.data;
      if (!allocation) {
        void setFieldValue('originalShift', meta.isExtraDuty ? '—' : '');
        void setFieldValue('originalShiftTypeId', '');
        onLookup(null);
        if (meta.needsPublishedCell) {
          toast({
            variant: 'destructive',
            title: 'No published shift',
            description:
              'No published roster cell exists for this staff member on the selected date.'
          });
        }
        return;
      }

      void setFieldValue('originalShift', allocation.originalShiftLabel);
      void setFieldValue('originalShiftTypeId', allocation.originalShiftTypeId);
      onLookup(allocation);
      if (meta.isLocationChange) {
        void setFieldValue(
          'dutyLocationDepartmentId',
          allocation.dutyLocationDepartmentId || ''
        );
        void setFieldValue('dutyZoneId', allocation.dutyZoneId || '');
        void setFieldValue('dutyRoomId', allocation.dutyRoomId || '');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    amendmentTypeId,
    meta.isExtraDuty,
    meta.isLocationChange,
    meta.needsPublishedDutySelect,
    meta.needsPublishedCell,
    onLookup,
    rosterDate,
    setFieldValue,
    staffId,
    toast
  ]);

  return null;
}

function applyPublishedDutySelection(
  duty: RosterAmendmentPublishedDuty,
  amendmentTypeId: string,
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'],
  onLookup: (lookup: RosterAmendmentAllocationLookup) => void
) {
  void setFieldValue('originalShift', duty.originalShiftLabel);
  void setFieldValue('originalShiftTypeId', duty.originalShiftTypeId);
  onLookup(duty);
  if (amendmentTypeId === 'location_change') {
    void setFieldValue(
      'dutyLocationDepartmentId',
      duty.dutyLocationDepartmentId || ''
    );
    void setFieldValue('dutyZoneId', duty.dutyZoneId || '');
    void setFieldValue('dutyRoomId', duty.dutyRoomId || '');
  }
  if (amendmentTypeId === 'staff_replacement') {
    void setFieldValue('amendedShiftId', duty.originalShiftTypeId);
  }
}

function PublishedDutiesLoader({
  open,
  enabled,
  staffId,
  rosterDate,
  amendmentTypeId,
  preferredShiftTypeId,
  setFieldValue,
  toast,
  onDuties,
  onLookup
}: {
  open: boolean;
  enabled: boolean;
  staffId: string;
  rosterDate: Date | null;
  amendmentTypeId: string;
  preferredShiftTypeId: string;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
  toast: ReturnType<typeof useToast>['toast'];
  onDuties: (duties: RosterAmendmentPublishedDuty[]) => void;
  onLookup: (lookup: RosterAmendmentAllocationLookup) => void;
}) {
  const loadKey = useRef('');
  const preferredRef = useRef(preferredShiftTypeId);
  preferredRef.current = preferredShiftTypeId;

  useEffect(() => {
    if (!open || !enabled) {
      onDuties([]);
      loadKey.current = '';
      return;
    }

    if (!staffId || !rosterDate) {
      onDuties([]);
      void setFieldValue('originalShift', '');
      void setFieldValue('originalShiftTypeId', '');
      onLookup(null);
      loadKey.current = '';
      return;
    }

    const key = `${staffId}:${format(rosterDate, 'yyyy-MM-dd')}:${amendmentTypeId}`;
    if (loadKey.current === key) return;
    loadKey.current = key;

    let cancelled = false;

    void (async () => {
      const result = await listPublishedAllocationsForAmendmentAction(
        staffId,
        format(rosterDate, 'yyyy-MM-dd')
      );
      if (cancelled) return;

      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Lookup failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not load published duties for this staff member and date.'
        });
        onDuties([]);
        void setFieldValue('originalShift', '');
        void setFieldValue('originalShiftTypeId', '');
        onLookup(null);
        return;
      }

      const duties = result.data;
      onDuties(duties);

      if (duties.length === 0) {
        void setFieldValue('originalShift', '');
        void setFieldValue('originalShiftTypeId', '');
        onLookup(null);
        toast({
          variant: 'destructive',
          title: 'No published shift',
          description:
            'No published roster cell exists for this staff member on the selected date.'
        });
        return;
      }

      if (duties.length === 1) {
        applyPublishedDutySelection(
          duties[0],
          amendmentTypeId,
          setFieldValue,
          onLookup
        );
        return;
      }

      const preferred = preferredRef.current;
      const matched =
        (preferred
          ? duties.find((d) => d.originalShiftTypeId === preferred)
          : null) ?? null;
      if (matched) {
        applyPublishedDutySelection(
          matched,
          amendmentTypeId,
          setFieldValue,
          onLookup
        );
      } else {
        void setFieldValue('originalShift', '');
        void setFieldValue('originalShiftTypeId', '');
        onLookup(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    amendmentTypeId,
    enabled,
    onDuties,
    onLookup,
    open,
    rosterDate,
    setFieldValue,
    staffId,
    toast
  ]);

  return null;
}

function AutoAmendmentTypeFields({
  amendmentTypeId,
  originalShiftTypeId,
  setFieldValue
}: {
  amendmentTypeId: string;
  originalShiftTypeId: string;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
}) {
  const previousType = useRef(amendmentTypeId);

  useEffect(() => {
    if (previousType.current === amendmentTypeId) return;
    previousType.current = amendmentTypeId;

    const meta = typeMeta(amendmentTypeId);
    if (!meta.needsAmendedShift) {
      void setFieldValue(
        'amendedShiftId',
        meta.isStaffReplacement ? originalShiftTypeId : ''
      );
    }
    if (!meta.needsSwapStaff) {
      void setFieldValue('replacementStaffId', '');
    }
    if (!meta.needsDutyLocation) {
      void setFieldValue('dutyLocationDepartmentId', '');
      void setFieldValue('dutyZoneId', '');
      void setFieldValue('dutyRoomId', '');
    }
    if (meta.isStaffReplacement && originalShiftTypeId) {
      void setFieldValue('amendedShiftId', originalShiftTypeId);
    }
  }, [amendmentTypeId, originalShiftTypeId, setFieldValue]);

  return null;
}

function SwapCandidatesLoader({
  open,
  rosterDate,
  staffId,
  enabled,
  onLoaded
}: {
  open: boolean;
  rosterDate: Date | null;
  staffId: string;
  enabled: boolean;
  onLoaded: (options: DutyRosterSwapCandidate[]) => void;
}) {
  useEffect(() => {
    if (!open || !rosterDate) {
      onLoaded([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getDutySwapCandidatesAction(
          format(rosterDate, 'yyyy-MM-dd')
        );
        if (cancelled) return;
        if (response.isError || !response.data) {
          onLoaded([]);
          return;
        }
        onLoaded(
          response.data.filter((row) => {
            if (row.staffId === staffId) return false;
            if (!enabled) return true;
            return row.status === 'published' || row.status === 'amended';
          })
        );
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, onLoaded, open, rosterDate, staffId]);

  return null;
}

function OccupiedStaffLoader({
  open,
  rosterDate,
  onLoaded
}: {
  open: boolean;
  rosterDate: Date | null;
  onLoaded: (staffIds: Set<string>) => void;
}) {
  useEffect(() => {
    if (!open || !rosterDate) {
      onLoaded(new Set());
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getDutySwapCandidatesAction(
          format(rosterDate, 'yyyy-MM-dd')
        );
        if (cancelled) return;
        if (response.isError || !response.data) {
          onLoaded(new Set());
          return;
        }
        onLoaded(new Set(response.data.map((row) => row.staffId)));
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [onLoaded, open, rosterDate]);

  return null;
}

function StandingAssignmentLoader({
  open,
  staffId,
  rosterDate,
  enabled,
  onLoaded
}: {
  open: boolean;
  staffId: string;
  rosterDate: Date | null;
  enabled: boolean;
  onLoaded: (standing: DutyRosterStandingAssignmentOption | null) => void;
}) {
  useEffect(() => {
    if (!open || !enabled || !staffId || !rosterDate) {
      onLoaded(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const response = await getStaffStandingAssignmentsForDutyAction(
        staffId,
        format(rosterDate, 'yyyy-MM-dd')
      );
      if (cancelled) return;
      if (response.isError || !response.data?.length) {
        onLoaded(null);
        return;
      }
      onLoaded(response.data[0] ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, onLoaded, open, rosterDate, staffId]);

  return null;
}

function ConflictPreviewEffect({
  open,
  enabled,
  staffId,
  rosterDate,
  shiftTypeId,
  excludeAllocationId,
  onPreview
}: {
  open: boolean;
  enabled: boolean;
  staffId: string;
  rosterDate: Date | null;
  shiftTypeId: string;
  excludeAllocationId?: string | null;
  onPreview: (preview: RosterAmendmentConflictPreview | null) => void;
}) {
  useEffect(() => {
    if (!open || !enabled || !staffId || !rosterDate) {
      onPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getRosterAmendmentConflictPreviewAction({
          staffId,
          dutyDate: format(rosterDate, 'yyyy-MM-dd'),
          shiftTypeId: shiftTypeId || null,
          excludeAllocationId
        });
        if (cancelled) return;
        if (response.isError || !response.data) {
          onPreview(null);
          return;
        }
        onPreview(response.data);
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    excludeAllocationId,
    onPreview,
    open,
    rosterDate,
    shiftTypeId,
    staffId
  ]);

  return null;
}

export default function SheetAmendmentForm({
  open,
  mode,
  record,
  formOptions,
  onOpenChange
}: SheetAmendmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState<
    DutyRosterSwapCandidate[]
  >([]);
  const [occupiedStaffIds, setOccupiedStaffIds] = useState<Set<string>>(
    new Set()
  );
  const [primaryLookup, setPrimaryLookup] =
    useState<RosterAmendmentAllocationLookup>(null);
  const [publishedDuties, setPublishedDuties] = useState<
    RosterAmendmentPublishedDuty[]
  >([]);
  const [replacementStanding, setReplacementStanding] =
    useState<DutyRosterStandingAssignmentOption | null>(null);
  const [conflictPreview, setConflictPreview] =
    useState<RosterAmendmentConflictPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const pendingSubmitRef = useRef<{
    values: AmendmentFormValues;
    helpers: FormikHelpers<AmendmentFormValues>;
  } | null>(null);
  const pendingAckRef = useRef(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit && !!record;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        amendmentTypeId: Yup.string().required('Amendment type is required'),
        staffId: Yup.string().required('Staff member is required'),
        rosterDate: Yup.date().nullable().required('Roster date is required'),
        originalShiftTypeId: Yup.string().when('amendmentTypeId', {
          is: 'extra_duty',
          then: (schema) => schema,
          otherwise: (schema) =>
            schema.when('amendmentTypeId', {
              is: 'duty_cancellation',
              then: (inner) =>
                inner.required('Select the shift to cancel'),
              otherwise: (inner) =>
                inner.required('Select the published duty')
            })
        }),
        amendedShiftId: Yup.string().when('amendmentTypeId', {
          is: (value: string) =>
            value === 'shift_change' ||
            value === 'extra_duty' ||
            value === 'shift_swap',
          then: (schema) =>
            schema.when('amendmentTypeId', {
              is: 'shift_swap',
              then: (inner) =>
                inner.required('Select the partner duty to swap with'),
              otherwise: (inner) =>
                inner.required('Amended shift is required')
            }),
          otherwise: (schema) => schema
        }),
        replacementStaffId: Yup.string().when('amendmentTypeId', {
          is: (value: string) =>
            value === 'staff_replacement' || value === 'shift_swap',
          then: (schema) =>
            schema
              .required('Partner staff is required')
              .notOneOf(
                [Yup.ref('staffId')],
                'Must be different from the selected staff'
              ),
          otherwise: (schema) => schema
        }),
        dutyLocationDepartmentId: Yup.string().when('amendmentTypeId', {
          is: 'location_change',
          then: (schema) => schema.required('Duty department is required'),
          otherwise: (schema) => schema
        }),
        requestedById: Yup.string().required('Requested by is required'),
        status: Yup.string().required('Approval status is required'),
        reason: Yup.string()
          .required('Reason for amendment is required')
          .max(500, 'Must be less than 500 characters'),
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (record && isEdit) return amendmentRecordToFormValues(record);
    return emptyValues();
  }, [isEdit, record]);

  const staffOptions = useMemo(
    () => formOptions.staff.map(({ id, name }) => ({ id, name })),
    [formOptions.staff]
  );

  useEffect(() => {
    if (!open) {
      setPrimaryLookup(null);
      setPublishedDuties([]);
      setSwapCandidates([]);
      setOccupiedStaffIds(new Set());
      setReplacementStanding(null);
      setConflictPreview(null);
      pendingSubmitRef.current = null;
      pendingAckRef.current = false;
      setConfirmOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isEdit || !record) return;
    if (
      record.amendmentType === 'duty_cancellation' ||
      record.amendmentType === 'shift_change' ||
      record.amendmentType === 'location_change' ||
      record.amendmentType === 'staff_replacement' ||
      record.amendmentType === 'shift_swap'
    ) {
      return;
    }
    void (async () => {
      const result = await lookupPublishedAllocationForAmendmentAction(
        record.staffId,
        record.dutyDate.slice(0, 10),
        record.originalShiftTypeId
      );
      if (!result.isError && result.data) {
        setPrimaryLookup(result.data);
      }
    })();
  }, [isEdit, open, record]);

  const persistAmendment = async (
    values: AmendmentFormValues,
    _helpers: FormikHelpers<AmendmentFormValues>
  ) => {
    setLoading(true);
    try {
      const payload = amendmentFormValuesToPayload(values, {
        acknowledgedWarnings: pendingAckRef.current
      });
      const result =
        isEdit && record
          ? await updateRosterAmendmentAction(record.id, payload)
          : await createRosterAmendmentAction(payload);

      if (result.isError) {
        const errorMap = result.errors as Record<
          string,
          string | string[] | boolean | undefined
        >;

        if (errorMap.requiresAck) {
          const softWarnings = Array.isArray(errorMap.softWarnings)
            ? errorMap.softWarnings.filter(
                (item): item is string => typeof item === 'string'
              )
            : [];
          pendingSubmitRef.current = { values, helpers: _helpers };
          setConfirmDescription(
            softWarnings.join(' ') ||
              (typeof errorMap.message === 'string'
                ? errorMap.message
                : 'This staff member has leave or weekly off on that date. Continue anyway?')
          );
          setConfirmOpen(true);
          return;
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : undefined) ?? 'Roster amendment could not be saved.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? `${record?.code ?? 'Amendment'} updated.`
          : `${result.data?.code ?? 'Amendment'} saved.`
      });
      pendingAckRef.current = false;
      onOpenChange(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Roster amendment could not be saved.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
            <SheetTitle>
              {isEdit ? 'Edit Amendment' : 'New Amendment'}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update the record. All changes are captured in the audit trail.'
                : 'Raise an amendment against a published roster entry.'}
            </SheetDescription>
          </SheetHeader>

          <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={(values, helpers) => persistAmendment(values, helpers)}
          >
            {(formik) => {
              const meta = typeMeta(formik.values.amendmentTypeId);
              const hint = typeHint(formik.values.amendmentTypeId);
              const partnerOptions = meta.isShiftSwap
                ? swapCandidates.map((row) => ({
                    id: `${row.staffId}:${row.shiftTypeId}`,
                    name: `${row.name} · ${row.shiftName}`
                  }))
                : formOptions.replacementStaff
                    .filter(
                      (option) =>
                        option.id !== formik.values.staffId &&
                        !occupiedStaffIds.has(option.id)
                    )
                    .map(({ id, name }) => ({ id, name }));
              const partnerLabel = meta.isShiftSwap
                ? 'Swap With Duty'
                : 'Replacement Staff';
              const swapPartnerValue =
                meta.isShiftSwap &&
                formik.values.replacementStaffId &&
                formik.values.amendedShiftId
                  ? `${formik.values.replacementStaffId}:${formik.values.amendedShiftId}`
                  : '';
              const publishedDutyLabel = meta.isCancellation
                ? 'Shift to Cancel'
                : 'Published Duty';
              const selectedStaff = formOptions.staff.find(
                (row) => row.id === formik.values.staffId
              );
              const institutionId = selectedStaff?.institutionId ?? '';
              const departmentOptions = (
                institutionId
                  ? formOptions.departments.filter(
                      (d) => d.institutionId === institutionId
                    )
                  : formOptions.departments
              ).map((d) => ({ id: d.id, name: d.name }));
              if (
                formik.values.dutyLocationDepartmentId &&
                !departmentOptions.some(
                  (d) => d.id === formik.values.dutyLocationDepartmentId
                )
              ) {
                const orphan = formOptions.departments.find(
                  (d) => d.id === formik.values.dutyLocationDepartmentId
                );
                if (orphan) {
                  departmentOptions.unshift({
                    id: orphan.id,
                    name: orphan.name
                  });
                } else if (record?.dutyLocation) {
                  departmentOptions.unshift({
                    id: formik.values.dutyLocationDepartmentId,
                    name: record.dutyLocation
                  });
                }
              }
              const roomOptions = (
                formik.values.dutyZoneId
                  ? formOptions.rooms.filter(
                      (r) => r.zoneId === formik.values.dutyZoneId
                    )
                  : formOptions.rooms
              ).map((r) => ({ id: r.id, name: r.name }));
              const selectedPartner = meta.isShiftSwap
                ? swapCandidates.find(
                    (row) =>
                      row.staffId === formik.values.replacementStaffId &&
                      row.shiftTypeId === formik.values.amendedShiftId
                  ) ?? null
                : null;
              const selectedReplacement = meta.isStaffReplacement
                ? formOptions.replacementStaff.find(
                    (row) => row.id === formik.values.replacementStaffId
                  ) ?? null
                : null;
              const conflictShiftId = meta.isExtraDuty
                ? formik.values.amendedShiftId
                : meta.isShiftChange
                  ? formik.values.amendedShiftId
                  : '';
              const excludeAllocationId = meta.isShiftChange
                ? primaryLookup?.allocationId
                : null;

              return (
                <Form className="flex min-h-0 flex-1 flex-col">
                  {!isEdit && !meta.needsPublishedDutySelect ? (
                    <AutoPublishedAllocationLookup
                      staffId={formik.values.staffId}
                      rosterDate={formik.values.rosterDate}
                      amendmentTypeId={formik.values.amendmentTypeId}
                      setFieldValue={formik.setFieldValue}
                      toast={toast}
                      onLookup={setPrimaryLookup}
                    />
                  ) : null}
                  <PublishedDutiesLoader
                    open={open}
                    enabled={meta.needsPublishedDutySelect}
                    staffId={formik.values.staffId}
                    rosterDate={formik.values.rosterDate}
                    amendmentTypeId={formik.values.amendmentTypeId}
                    preferredShiftTypeId={formik.values.originalShiftTypeId}
                    setFieldValue={formik.setFieldValue}
                    toast={toast}
                    onDuties={setPublishedDuties}
                    onLookup={setPrimaryLookup}
                  />
                  <AutoAmendmentTypeFields
                    amendmentTypeId={formik.values.amendmentTypeId}
                    originalShiftTypeId={formik.values.originalShiftTypeId}
                    setFieldValue={formik.setFieldValue}
                  />
                  <SwapCandidatesLoader
                    open={open}
                    rosterDate={formik.values.rosterDate}
                    staffId={formik.values.staffId}
                    enabled={meta.isShiftSwap}
                    onLoaded={setSwapCandidates}
                  />
                  <OccupiedStaffLoader
                    open={open}
                    rosterDate={formik.values.rosterDate}
                    onLoaded={setOccupiedStaffIds}
                  />
                  <StandingAssignmentLoader
                    open={open}
                    staffId={formik.values.replacementStaffId}
                    rosterDate={formik.values.rosterDate}
                    enabled={meta.isStaffReplacement}
                    onLoaded={setReplacementStanding}
                  />
                  <ConflictPreviewEffect
                    open={open}
                    enabled={meta.needsConflictStrip}
                    staffId={formik.values.staffId}
                    rosterDate={formik.values.rosterDate}
                    shiftTypeId={conflictShiftId}
                    excludeAllocationId={excludeAllocationId}
                    onPreview={setConflictPreview}
                  />

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {hint ? (
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                        {hint}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CustomFormField
                        id="amendmentNo"
                        type="text"
                        placeholder="Amendment No"
                        value={formik.values.amendmentNo}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        disabled
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="amendmentTypeId"
                        placeholder="Amendment Type"
                        value={formik.values.amendmentTypeId}
                        onChange={(value) =>
                          formik.setFieldValue('amendmentTypeId', value)
                        }
                        required
                        options={formOptions.amendmentTypes}
                        styleClasses={fieldStyleClasses}
                      />
                      <div className={fieldStyleClasses.parentDiv}>
                        <Label className={fieldStyleClasses.labelClassName}>
                          Staff Member *
                        </Label>
                        <div className={fieldStyleClasses.inputClassName}>
                          <Combobox
                            label="Staff Member"
                            options={staffOptions}
                            value={formik.values.staffId}
                            defaultValue=""
                            clearable={!isEdit}
                            disabled={isEdit}
                            triggerClassName="w-full max-w-none font-normal!"
                            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                            onChange={(value) => {
                              void formik.setFieldValue('staffId', value);
                            }}
                          />
                        </div>
                        {formik.touched.staffId && formik.errors.staffId ? (
                          <p className="text-xs text-destructive">
                            {formik.errors.staffId}
                          </p>
                        ) : null}
                      </div>
                      <CustomDatePickerField
                        id="rosterDate"
                        placeholder="Roster Date"
                        value={formik.values.rosterDate}
                        onChange={(value) =>
                          formik.setFieldValue('rosterDate', value ?? null)
                        }
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      {meta.needsPublishedDutySelect ? (
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            {publishedDutyLabel} *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label={publishedDutyLabel}
                              options={publishedDuties.map((duty) => ({
                                id: duty.originalShiftTypeId,
                                name: `${duty.originalShiftLabel}${
                                  duty.startTime && duty.endTime
                                    ? ` · ${duty.startTime}–${duty.endTime}`
                                    : ''
                                }`
                              }))}
                              value={formik.values.originalShiftTypeId}
                              defaultValue=""
                              clearable={publishedDuties.length > 1}
                              disabled={publishedDuties.length === 0}
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) => {
                                const selected =
                                  publishedDuties.find(
                                    (duty) => duty.originalShiftTypeId === value
                                  ) ?? null;
                                if (!selected) {
                                  void formik.setFieldValue(
                                    'originalShiftTypeId',
                                    ''
                                  );
                                  void formik.setFieldValue('originalShift', '');
                                  setPrimaryLookup(null);
                                  return;
                                }
                                applyPublishedDutySelection(
                                  selected,
                                  formik.values.amendmentTypeId,
                                  formik.setFieldValue,
                                  setPrimaryLookup
                                );
                              }}
                            />
                          </div>
                          {formik.touched.originalShiftTypeId &&
                          formik.errors.originalShiftTypeId ? (
                            <p className="text-xs text-destructive">
                              {formik.errors.originalShiftTypeId}
                            </p>
                          ) : null}
                          {formik.values.rosterDate &&
                          publishedDuties.length > 1 ? (
                            <p className="text-xs text-muted-foreground">
                              This staff member has {publishedDuties.length}{' '}
                              published duties on this date. Choose which one
                              this amendment applies to.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <CustomFormField
                          id="originalShift"
                          type="text"
                          placeholder="Original Shift"
                          value={formik.values.originalShift}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          required={false}
                          disabled
                          styleClasses={fieldStyleClasses}
                        />
                      )}

                      {meta.needsSwapStaff ? (
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            {partnerLabel} *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label={partnerLabel}
                              options={partnerOptions}
                              value={
                                meta.isShiftSwap
                                  ? swapPartnerValue
                                  : formik.values.replacementStaffId
                              }
                              defaultValue=""
                              clearable
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) => {
                                if (meta.isShiftSwap) {
                                  const [staffIdPart, shiftTypePart] =
                                    value.split(':');
                                  const selected =
                                    swapCandidates.find(
                                      (row) =>
                                        row.staffId === staffIdPart &&
                                        row.shiftTypeId === shiftTypePart
                                    ) ?? null;
                                  void formik.setFieldValue(
                                    'replacementStaffId',
                                    selected?.staffId ?? ''
                                  );
                                  void formik.setFieldValue(
                                    'amendedShiftId',
                                    selected?.shiftTypeId ?? ''
                                  );
                                  return;
                                }
                                void formik.setFieldValue(
                                  'replacementStaffId',
                                  value
                                );
                              }}
                            />
                          </div>
                          {(formik.touched.replacementStaffId &&
                            formik.errors.replacementStaffId) ||
                          (meta.isShiftSwap &&
                            formik.touched.amendedShiftId &&
                            formik.errors.amendedShiftId) ? (
                            <p className="text-xs text-destructive">
                              {formik.errors.replacementStaffId ||
                                formik.errors.amendedShiftId}
                            </p>
                          ) : null}
                          {meta.isShiftSwap &&
                          formik.values.rosterDate &&
                          partnerOptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No other published duties on this date to swap
                              with.
                            </p>
                          ) : null}
                          {meta.isStaffReplacement &&
                          formik.values.rosterDate &&
                          partnerOptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No free staff available on this date (everyone
                              already has a duty).
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {meta.needsAmendedShift ? (
                        <CustomSelectField
                          id="amendedShiftId"
                          placeholder="Amended Shift"
                          value={formik.values.amendedShiftId}
                          onChange={(value) =>
                            formik.setFieldValue('amendedShiftId', value)
                          }
                          required
                          options={formOptions.shiftTypes}
                          styleClasses={fieldStyleClasses}
                        />
                      ) : null}

                      {meta.needsDutyLocation ? (
                        <>
                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Duty Department *
                            </Label>
                            <div className={fieldStyleClasses.inputClassName}>
                              <Combobox
                                label="Duty Department"
                                options={departmentOptions}
                                value={formik.values.dutyLocationDepartmentId}
                                defaultValue=""
                                clearable
                                triggerClassName="w-full max-w-none font-normal!"
                                popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                                onChange={(value) => {
                                  void formik.setFieldValue(
                                    'dutyLocationDepartmentId',
                                    value
                                  );
                                }}
                              />
                            </div>
                            {formik.touched.dutyLocationDepartmentId &&
                            formik.errors.dutyLocationDepartmentId ? (
                              <p className="text-xs text-destructive">
                                {formik.errors.dutyLocationDepartmentId}
                              </p>
                            ) : null}
                          </div>
                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Zone
                            </Label>
                            <div className={fieldStyleClasses.inputClassName}>
                              <Combobox
                                label="Select zone"
                                options={formOptions.zones}
                                value={formik.values.dutyZoneId}
                                defaultValue=""
                                clearable
                                triggerClassName="w-full max-w-none font-normal!"
                                popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                                onChange={(value) => {
                                  void formik.setFieldValue(
                                    'dutyZoneId',
                                    value
                                  );
                                  void formik.setFieldValue('dutyRoomId', '');
                                }}
                              />
                            </div>
                          </div>
                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Unit / Room
                            </Label>
                            <div className={fieldStyleClasses.inputClassName}>
                              <Combobox
                                label="Select unit / room"
                                options={roomOptions}
                                value={formik.values.dutyRoomId}
                                defaultValue=""
                                clearable
                                triggerClassName="w-full max-w-none font-normal!"
                                popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                                onChange={(value) =>
                                  formik.setFieldValue('dutyRoomId', value)
                                }
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      <CustomSelectField
                        id="requestedById"
                        placeholder="Requested By"
                        value={formik.values.requestedById}
                        onChange={(value) =>
                          formik.setFieldValue('requestedById', value)
                        }
                        required
                        options={formOptions.requesters}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomSelectField
                        id="status"
                        placeholder="Approval Status"
                        value={formik.values.status}
                        onChange={(value) =>
                          formik.setFieldValue('status', value)
                        }
                        required
                        options={formOptions.statuses}
                        styleClasses={fieldStyleClasses}
                      />
                    </div>

                    {meta.needsDutySummary ? (
                      <OriginalDutyCard
                        lookup={primaryLookup}
                        title={
                          meta.isStaffReplacement
                            ? 'Duty to hand over'
                            : meta.isShiftSwap
                              ? 'Primary staff duty'
                              : 'Published duty'
                        }
                      />
                    ) : null}

                    {meta.isShiftSwap ? (
                      <SwapPartnerCard candidate={selectedPartner} />
                    ) : null}

                    {meta.isStaffReplacement ? (
                      <ReplacementPreviewCard
                        staff={selectedReplacement}
                        duty={primaryLookup}
                        standing={replacementStanding}
                      />
                    ) : null}

                    {meta.needsConflictStrip ? (
                      <ConflictStrip preview={conflictPreview} />
                    ) : null}

                    <RosterLeaveHint
                      open={open}
                      staffId={formik.values.staffId}
                      date={formik.values.rosterDate}
                      startTime={primaryLookup?.startTime}
                      endTime={primaryLookup?.endTime}
                      staffLabel={
                        formOptions.staff.find(
                          (s) => s.id === formik.values.staffId
                        )?.name
                      }
                    />
                    {meta.isShiftSwap ? (
                      <RosterLeaveHint
                        open={open}
                        staffId={formik.values.replacementStaffId}
                        date={formik.values.rosterDate}
                        startTime={selectedPartner?.startTime}
                        endTime={selectedPartner?.endTime}
                        staffLabel={selectedPartner?.staffName}
                      />
                    ) : null}
                    {meta.isStaffReplacement ? (
                      <RosterLeaveHint
                        open={open}
                        staffId={formik.values.replacementStaffId}
                        date={formik.values.rosterDate}
                        startTime={primaryLookup?.startTime}
                        endTime={primaryLookup?.endTime}
                        staffLabel={selectedReplacement?.name}
                      />
                    ) : null}

                    <CustomFormField
                      id="reason"
                      type="textarea"
                      placeholder="Reason for Amendment"
                      value={formik.values.reason}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="remarks"
                      type="textarea"
                      placeholder="Approver Remarks"
                      value={formik.values.remarks}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />

                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>
                        Created by:{' '}
                        {showAudit
                          ? record?.createdUser?.name ||
                            record?.createdBy ||
                            '—'
                          : '—'}
                        {showAudit && record?.createdAt
                          ? ` · ${formatAuditDateTime(record.createdAt)}`
                          : null}
                      </p>
                      <p className="sm:text-right">
                        Last updated:{' '}
                        {showAudit
                          ? record?.updatedUser?.name ||
                            record?.updatedBy ||
                            '—'
                          : '—'}
                        {showAudit && record?.updatedAt
                          ? ` · ${formatAuditDateTime(record.updatedAt)}`
                          : null}
                      </p>
                    </div>
                  </div>

                  <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      size="sm"
                      className={buttonStyles.cancel.normal}
                      onClick={() => onOpenChange(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        loading ||
                        Boolean(
                          meta.needsConflictStrip && conflictPreview?.blocksSave
                        )
                      }
                      className={buttonStyles.save}
                    >
                      {isEdit ? 'Save Changes' : 'Save Amendment'}
                    </Button>
                  </SheetFooter>
                </Form>
              );
            }}
          </Formik>
        </SheetContent>
      </Sheet>

      <CustomAlertDialog
        open={confirmOpen}
        title="Confirm roster warning"
        description={confirmDescription}
        loading={loading}
        handleVisibilityChange={(nextOpen) => {
          if (!nextOpen) {
            pendingSubmitRef.current = null;
            pendingAckRef.current = false;
          }
          setConfirmOpen(nextOpen);
        }}
        handleContinue={async () => {
          const pending = pendingSubmitRef.current;
          if (!pending) {
            setConfirmOpen(false);
            return;
          }
          pendingAckRef.current = true;
          setConfirmOpen(false);
          await persistAmendment(pending.values, pending.helpers);
        }}
      />
    </>
  );
}
