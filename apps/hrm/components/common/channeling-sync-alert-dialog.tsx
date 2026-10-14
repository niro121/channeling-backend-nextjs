'use client';

import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button
} from '@archmage/ui';

export type ChannelingSyncAlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  cancelLabel?: string;
  hrmOnlyLabel?: string;
  continueLabel?: string;
  onCancel: () => void;
  onSaveHrmOnly: () => void;
  onContinue: () => void;
};

/**
 * Reusable Channeling sync prompt.
 * Cancel discards; HRM-only skips Channeling; Continue syncs both apps.
 */
export function ChannelingSyncAlertDialog({
  open,
  title,
  description,
  loading = false,
  cancelLabel = 'Cancel',
  hrmOnlyLabel = 'Save HRM only',
  continueLabel = 'Continue',
  onCancel,
  onSaveHrmOnly,
  onContinue
}: ChannelingSyncAlertDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel
            onClick={onCancel}
            disabled={loading}
            className="text-red-500 hover:text-white hover:bg-red-500 transition-colors"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="relative cursor-pointer"
            onClick={onSaveHrmOnly}
          >
            {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            {hrmOnlyLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="relative cursor-pointer"
            onClick={onContinue}
          >
            {continueLabel}
            {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
