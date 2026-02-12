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
};

export function AddDoctorSessionDialog({
  open,
  onOpenChange,
  doctorId,
  doctorName
}: AddDoctorSessionDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [departmentOptions, setDepartmentOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [locationOptions, setLocationOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getDepartmentOptions(), getLocationOptions()])
      .then(([deptRes, locRes]) => {
        if (cancelled) return;
        setDepartmentOptions(deptRes.data ?? []);
        setLocationOptions(locRes.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
