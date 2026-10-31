'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import DoctorSessionForm from './doctor-session-form';
import {
  getDepartmentOptions,
  getAllDoctorSessions,
  getLocationOptions,
  getDoctorSessionById
} from '@/app/actions/doctor.sessions.action';
import {
  DAY_TYPES,
  FEE_TYPES,
  INSTITUTION_OPTIONS,
  REFUNDABLE_OPTIONS
} from '@/types/doctor.session';
import type { DoctorSession } from '@/types/doctor.session';

type EditDoctorSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
};

export function EditDoctorSessionDialog({
  open,
  onOpenChange,
  sessionId
}: EditDoctorSessionDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [doctorSessionData, setDoctorSessionData] =
    useState<DoctorSession | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [locationOptions, setLocationOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [doctorSessionsForPreviousDropdown, setDoctorSessionsForPreviousDropdown] =
    useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getDoctorSessionById(sessionId),
      getDepartmentOptions(),
      getLocationOptions()
    ])
      .then(async ([sessionRes, deptRes, locRes]) => {
        if (cancelled) return;
        if (!sessionRes.success || !sessionRes.data) {
          setError(sessionRes.error?.message ?? 'Session not found');
          return;
        }
        setDoctorSessionData(sessionRes.data);
        setDepartmentOptions(deptRes.data ?? []);
        setLocationOptions(locRes.data ?? []);
        const doctorId =
          sessionRes.data.doctorId ?? sessionRes.data.doctor?.id ?? '';
        if (doctorId) {
          const res = await getAllDoctorSessions({
            doctorId,
            page: '0',
            limit: '1000'
          });
          if (!cancelled) {
            const list = res.data ?? [];
            setDoctorSessionsForPreviousDropdown(
              list.map((s: { id: string; name: string }) => ({
                id: s.id,
                name: s.name
              }))
            );
          }
        } else {
          setDoctorSessionsForPreviousDropdown([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const doctorId =
    doctorSessionData?.doctorId ?? doctorSessionData?.doctor?.id ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Session
            {doctorSessionData?.name
              ? ` — ${doctorSessionData.name}`
              : sessionId
                ? ' (Loading...)'
                : ''}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : doctorSessionData ? (
          <DoctorSessionForm
            doctorId={doctorId}
            doctorSession={doctorSessionData}
            doctorSessionsForPreviousDropdown={doctorSessionsForPreviousDropdown}
            institutionOptions={INSTITUTION_OPTIONS}
            departmentOptions={departmentOptions}
            locationOptions={locationOptions}
            dayTypeOptions={DAY_TYPES}
            refundableOptions={REFUNDABLE_OPTIONS}
            feeTypeOptions={FEE_TYPES}
            isEditPage={true}
            user={{
              id: session?.user?.id,
              name: session?.user?.name ?? ''
            }}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
