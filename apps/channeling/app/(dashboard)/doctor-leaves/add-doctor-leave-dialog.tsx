'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import DoctorLeaveForm from './doctor-leave-form';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDoctorLeavesRefetch } from './doctor-leaves-refresh-context';

type AddDoctorLeaveDialogProps = {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  doctorId: string;
  doctorName?: string;
};

export default function AddDoctorLeaveDialog({
  open,
  onOpenChange,
  doctorId,
  doctorName
}: AddDoctorLeaveDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const refetch = useDoctorLeavesRefetch();

  const handleSuccess = () => {
    refetch();
    onOpenChange(false);
    router.refresh();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add New Doctor Leave{doctorName ? ` — DR. ${doctorName}` : ''}
          </DialogTitle>
        </DialogHeader>
        <DoctorLeaveForm
          doctorId={doctorId}
          doctorName={doctorName || ''}
          doctorLeave={null}
          user={{
            id: session?.user?.id,
            name: session?.user?.name ?? ''
          }}
          onClose={() => onOpenChange(false)}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
