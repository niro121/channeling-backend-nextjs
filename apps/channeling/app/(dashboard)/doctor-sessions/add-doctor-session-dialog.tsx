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
  getLocationOptions
} from '@/app/actions/doctor.sessions.action';
import {
  DAY_TYPES,
  FEE_TYPES,
  INSTITUTION_OPTIONS,
  REFUNDABLE_OPTIONS
} from '@/types/doctor.session';

type AddDoctorSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  doctorName?: string;
  /** When provided, dialog only fetches sessions (faster open). */
  preloadedDepartmentOptions?: { id: string; name: string }[];
  preloadedLocationOptions?: { id: string; name: string }[];
};

export function AddDoctorSessionDialog({
  open,
  onOpenChange,
  doctorId,
  doctorName,
  preloadedDepartmentOptions,
  preloadedLocationOptions
}: AddDoctorSessionDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [departmentOptions, setDepartmentOptions] = useState<
    { id: string; name: string }[]
  >(preloadedDepartmentOptions ?? []);
  const [locationOptions, setLocationOptions] = useState<
    { id: string; name: string }[]
  >(preloadedLocationOptions ?? []);
  const [doctorSessionsForPreviousDropdown, setDoctorSessionsForPreviousDropdown] =
    useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setDepartmentOptions(preloadedDepartmentOptions ?? []);
    setLocationOptions(preloadedLocationOptions ?? []);

    const hasPreloaded =
      (preloadedDepartmentOptions?.length ?? 0) > 0 &&
      (preloadedLocationOptions?.length ?? 0) > 0;

    if (hasPreloaded) {
      getAllDoctorSessions({
        doctorId,
        page: '0',
        limit: '1000'
      })
        .then((sessionsRes) => {
          if (cancelled) return;
          const list = sessionsRes.data ?? [];
          setDoctorSessionsForPreviousDropdown(
            list.map((s: { id: string; name: string }) => ({
              id: s.id,
              name: s.name
            }))
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      Promise.all([
        getDepartmentOptions(),
        getLocationOptions(),
        getAllDoctorSessions({
          doctorId,
          page: '0',
          limit: '1000'
        })
      ])
        .then(([deptRes, locRes, sessionsRes]) => {
          if (cancelled) return;
          setDepartmentOptions(deptRes.data ?? []);
          setLocationOptions(locRes.data ?? []);
          const list = sessionsRes.data ?? [];
          setDoctorSessionsForPreviousDropdown(
            list.map((s: { id: string; name: string }) => ({
              id: s.id,
              name: s.name
            }))
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, doctorId, preloadedDepartmentOptions, preloadedLocationOptions]);

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add New Doctor Session{doctorName ? ` — DR. ${doctorName}` : ''}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <DoctorSessionForm
            doctorId={doctorId}
            doctorSession={null}
            doctorSessionsForPreviousDropdown={doctorSessionsForPreviousDropdown}
            institutionOptions={INSTITUTION_OPTIONS}
            departmentOptions={departmentOptions}
            locationOptions={locationOptions}
            dayTypeOptions={DAY_TYPES}
            refundableOptions={REFUNDABLE_OPTIONS}
            feeTypeOptions={FEE_TYPES}
            isEditPage={false}
            user={{
              id: session?.user?.id,
              name: session?.user?.name ?? ''
            }}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
