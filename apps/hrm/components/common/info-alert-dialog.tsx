'use client';

import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@archmage/ui';

export type InfoAlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  /** Primary dismiss label (default OK). */
  actionLabel?: string;
  handleVisibilityChange: (value: boolean) => void;
  /** Optional hook after OK / dismiss. Defaults to closing. */
  onAcknowledge?: () => void;
  className?: {
    actionButton?: string;
  };
};

/**
 * Single-action AlertDialog for hard blocks and informational notes.
 * Use CustomAlertDialog when Cancel + Continue is required.
 */
export function InfoAlertDialog({
  open,
  title,
  description,
  actionLabel = 'OK',
  handleVisibilityChange,
  onAcknowledge,
  className
}: InfoAlertDialogProps) {
  const dismiss = () => {
    handleVisibilityChange(false);
    onAcknowledge?.();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={dismiss}
            className={cn('cursor-pointer', className?.actionButton)}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
