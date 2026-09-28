'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button
} from '@archmage/ui';

type DialogOverlapProps = {
  open: boolean;
  selectedCount: number;
  onCancel: () => void;
  onSkipDuplicates: () => void;
  onOverwrite: () => void;
};

export default function DialogOverlap({
  open,
  selectedCount,
  onCancel,
  onSkipDuplicates,
  onOverwrite
}: DialogOverlapProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Overlapping assignments?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to assign a component to {selectedCount} staff. If any
            already have this component in the same date range, choose how to
            continue. Default is to skip duplicates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <Button type="button" variant="outline" onClick={onOverwrite}>
            Overwrite
          </Button>
          <AlertDialogAction onClick={onSkipDuplicates}>
            Skip duplicates
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
