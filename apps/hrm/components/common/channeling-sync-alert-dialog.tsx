'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { buttonStyles } from '@/lib/utils/common-styles';

export type ChannelingSyncAlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  cancelLabel?: string;
  hrmOnlyLabel?: string;
  continueLabel?: string;
  /** When false, the Channeling action is hidden (no linked Channeling record). */
  showContinue?: boolean;
  /** Optional style for HRM-only (e.g. delete danger). */
  hrmOnlyClassName?: string;
  continueClassName?: string;
  cancelClassName?: string;
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
  showContinue = true,
  hrmOnlyClassName,
  continueClassName,
  cancelClassName,
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
            className={cn('relative cursor-pointer h-9! mr-0!', cancelClassName)}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            type="button"
            variant={hrmOnlyClassName ? 'default' : 'outline'}
            disabled={loading}
            className={cn('relative cursor-pointer h-9! mr-0!', hrmOnlyClassName)}
            onClick={onSaveHrmOnly}
          >
            {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            {hrmOnlyLabel}
          </Button>
          {showContinue ? (
            <Button
              type="button"
              disabled={loading}
              className={cn('relative cursor-pointer h-9! mr-0!', continueClassName)}
              onClick={onContinue}
            >
              {continueLabel}
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
