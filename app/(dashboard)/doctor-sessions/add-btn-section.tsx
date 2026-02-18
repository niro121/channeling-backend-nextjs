'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { useDoctorSessionStore } from '@/store/store-doctor-session';
import { AddDoctorSessionDialog } from './add-doctor-session-dialog';

export default function AddBtnSection() {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const { doctor } = useDoctorSessionStore();
  const canAdd = doctor && doctor.id !== '__all__';

  const handleClick = () => {
    if (canAdd) setAddDialogOpen(true);
  };

  const button = (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={!canAdd}
      className="gap-1.5 h-9"
    >
      <Plus className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
        Add New
      </span>
    </Button>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            {canAdd
              ? 'Add new doctor session'
              : 'Select a Doctor above to add sessions'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AddDoctorSessionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        doctorId={doctor?.id ?? ''}
        doctorName={doctor?.name}
      />
    </>
  );
}
