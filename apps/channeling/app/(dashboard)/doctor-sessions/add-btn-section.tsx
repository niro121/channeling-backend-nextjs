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

type AddBtnSectionProps = {
  /** When false, button is disabled until user has clicked Search Sessions (or after doctor/institution change). */
  searchDone?: boolean;
  /** Preloaded options so Add dialog only fetches sessions (faster open). */
  departmentOptions?: { id: string; name: string }[];
  locationOptions?: { id: string; name: string }[];
};

export default function AddBtnSection({
  searchDone = false,
  departmentOptions,
  locationOptions
}: AddBtnSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const { doctor } = useDoctorSessionStore();
  const hasDoctor = doctor && doctor.id !== '__all__';
  const canAdd = hasDoctor && searchDone;

  const handleClick = () => {
    if (canAdd) setAddDialogOpen(true);
  };

  const tooltipMessage = !hasDoctor
    ? 'Select a Doctor above to add sessions'
    : !searchDone
      ? 'Click Search Sessions first to add sessions'
      : 'Add new doctor session';

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
            {tooltipMessage}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AddDoctorSessionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        doctorId={doctor?.id ?? ''}
        doctorName={doctor?.name}
        preloadedDepartmentOptions={departmentOptions}
        preloadedLocationOptions={locationOptions}
      />
    </>
  );
}
