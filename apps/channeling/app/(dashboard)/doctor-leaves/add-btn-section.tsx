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
import AddDoctorLeaveDialog from './add-doctor-leave-dialog';

type AddBtnSectionProps = {
  doctorId?: string | undefined;
  doctorName?: string | undefined;
  /** When false, filters were changed but not applied - disable Add to avoid adding for wrong doctor */
  filtersApplied?: boolean;
};

export default function AddBtnSection({
  doctorId,
  doctorName,
  filtersApplied = true
}: AddBtnSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const canAdd =
    doctorId !== undefined &&
    doctorId !== '' &&
    doctorId !== '__all__' &&
    filtersApplied;

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
          <TooltipContent className='text-white'>
            {canAdd
              ? 'Add new doctor leave'
              : !filtersApplied
                ? 'Click Apply to confirm the selected doctor'
                : 'Select a doctor above to add leaves'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AddDoctorLeaveDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        doctorId={doctorId ?? ''}
        doctorName={doctorName ?? ''}
      />
    </>
  );
}
