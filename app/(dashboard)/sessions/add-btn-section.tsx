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

function GenerateSession({
  open,
  setModalOpen,
  formData
}: {
  open: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  formData: {
    options: { id: string; name: string }[];
  };
}) {
  const { data } = useSession();
  const { doctor } = useSessionStore();

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create Session</AlertDialogTitle>
        </AlertDialogHeader>
        <div>
          <SessionsForm
            onClose={handleCloseModal}
            doctorId={doctor.id}
            doctorOptions={formData.options}
            user={{
              id: data?.user?.id,
              name: data?.user?.name || ''
            }}
          />
        </div>
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
  const { doctor } = useSessionStore();
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setModalOpen(true)}
        className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
      >
        <PlusCircle />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Generate Session
        </span>
      </Button>
      {/* ==== ALERT DIALOG ==== */}
      <GenerateSession
        open={modalOpen}
        setModalOpen={setModalOpen}
        formData={{
          options: formData.options
        }}
      />
    </>
  );
}
