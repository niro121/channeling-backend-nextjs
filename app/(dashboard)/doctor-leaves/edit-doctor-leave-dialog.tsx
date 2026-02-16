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
import DoctorLeaveForm from './doctor-leave-form';
import { getOneLeaveByID, getSessionsByIds } from '@/app/actions/doctor.leave.action';
import { useDoctorLeavesRefetch } from './doctor-leaves-refresh-context';
import type { DoctorLeave, Session } from '@/types/doctor.leave';
import { formatSessionTime } from '../channel-booking/components/sessions-selection/util';
import Loading from '../loading';

type EditDoctorLeaveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveId: string | null;
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

export function EditDoctorLeaveDialog({
  open,
  onOpenChange,
  leaveId
}: EditDoctorLeaveDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const refetch = useDoctorLeavesRefetch();
  const [doctorLeaveData, setDoctorLeaveData] = useState<DoctorLeave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !leaveId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOneLeaveByID(leaveId)
      .then((leaveRes) => {
        if (cancelled) return;
        if (!leaveRes.success || !leaveRes.data) {
          setError(leaveRes.message ?? 'Doctor leave not found');
          return;
        }
        const leave = leaveRes.data as any;
        const doctorId = leave.doctorId ?? leave.doctor?.id ?? '';
        const leaveSessionIds: string[] = Array.isArray(leave.sessions)
          ? leave.sessions
          : [];
        // Load sessions on leave (status 0) by IDs for Canceled tab; they are not in getActiveSessions
        return getSessionsByIds(leaveSessionIds).then((sessionsRes) => {
          if (cancelled) return;
          let sessions: Session[] = [];
          if (sessionsRes.success && sessionsRes.data?.length) {
            sessions = sessionsRes.data.map(mapApiSessionToItem);
          }
          const doctorLeave: DoctorLeave = {
            id: leave.id,
            fromDate: new Date(leave.fromDate),
            toDate: new Date(leave.toDate),
            remarks: leave.remarks ?? null,
            sessions,
            sendSms: leave.sendSms === 1,
            status: leave.status ?? 1,
            doctorId,
            doctor: leave.doctor,
            createdBy: leave.createdBy ?? null,
            updatedBy: leave.updatedBy ?? null,
            createdAt: new Date(leave.createdAt),
            updatedAt: new Date(leave.updatedAt)
          };
          setDoctorLeaveData(doctorLeave);
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load doctor leave');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, leaveId]);

  const handleSuccess = () => {
    refetch();
    onOpenChange(false);
    router.refresh();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const doctorName =
    (doctorLeaveData as any)?.doctor?.name ??
    (doctorLeaveData as any)?.doctor?.code ??
    '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Doctor Leave{doctorName ? ` — DR. ${doctorName}` : ''}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground space-y-2">
            <Loading />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : doctorLeaveData ? (
          <DoctorLeaveForm
            doctorId={doctorLeaveData.doctorId}
            doctorName={doctorName}
            doctorLeave={doctorLeaveData}
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
