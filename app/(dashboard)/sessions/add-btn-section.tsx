'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
import { useSessionStore } from '@/store/store-session';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import SessionsForm from './sessions-form';
import { useSession } from 'next-auth/react';

type ModalMode = 'ONE_DOCTOR' | 'ALL_DOCTOR';

function GenerateSession({
  open,
  setModalOpen,
  formData,
  mode
}: {
  open: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mode: 'ONE_DOCTOR' | 'ALL_DOCTOR';
  formData: {
    options: { id: string; name: string }[];
  };
}) {
  const { data } = useSession();
  const { doctor } = useSessionStore();

  const handleCloseModal = () => setModalOpen(false);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'ALL_DOCTOR'
              ? 'Create Sessions for All Doctors'
              : 'Create Session'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <SessionsForm
          type={mode}
          doctorId={mode === 'ONE_DOCTOR' ? doctor.id : undefined}
          doctorOptions={formData.options}
          onClose={handleCloseModal}
          user={{
            id: data?.user?.id,
            name: data?.user?.name || ""
          }}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AddBtnSection({
  formData
}: {
  formData: {
    options: { id: string; name: string }[];
  };
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<ModalMode>('ALL_DOCTOR');

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setModalMode('ALL_DOCTOR');
          setModalOpen(true);
        }}
      >
        Generate Sessions for all the doctors
      </Button>

      <Button
        size="sm"
        onClick={() => {
          setModalMode('ONE_DOCTOR');
          setModalOpen(true);
        }}
      >
        Generate Session
      </Button>

      {/* ==== ALERT DIALOG ==== */}
      <GenerateSession
        open={modalOpen}
        setModalOpen={setModalOpen}
        mode={modalMode}
        formData={{ options: formData.options }}
      />
    </>
  );
}
