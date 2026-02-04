'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useDoctorSessionStore } from '@/store/store-doctor-session';
import { useRouter } from 'next/navigation';

export default function AddBtnSection() {
  const router = useRouter();
  const { doctor } = useDoctorSessionStore();

  const handleClick = (id: string) => {
    router.push(`/doctor-sessions/${id}/add`);
  };

  return (
    doctor &&
    doctor.id !== '__all__' && (
      <Button
        size="sm"
        onClick={() => handleClick(doctor.id)}
        className="gap-1.5 h-9"
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add New
        </span>
      </Button>
    )
  );
}
