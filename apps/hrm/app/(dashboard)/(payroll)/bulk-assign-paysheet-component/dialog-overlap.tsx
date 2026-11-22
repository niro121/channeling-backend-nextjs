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
  overlapCount?: number;
  loading?: boolean;
  onCancel: () => void;
  onSkipDuplicates: () => void;
  onOverwrite: () => void;
};

export default function DialogOverlap({
  open,
  selectedCount,
  overlapCount = 0,
  loading = false,
  onCancel,
  onSkipDuplicates,
  onOverwrite
}: DialogOverlapProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Overlapping assignments?</AlertDialogTitle>
          <AlertDialogDescription>
            {overlapCount > 0
              ? `${overlapCount} existing assignment(s) overlap for the ${selectedCount} selected staff.`
              : `You are about to assign a component to ${selectedCount} staff.`}{' '}
            Choose Skip to leave overlaps unchanged, or Overwrite to replace
            them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={loading} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onOverwrite}
          >
            {loading ? 'Working…' : 'Overwrite'}
          </Button>
          <AlertDialogAction disabled={loading} onClick={onSkipDuplicates}>
            {loading ? 'Working…' : 'Skip duplicates'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
