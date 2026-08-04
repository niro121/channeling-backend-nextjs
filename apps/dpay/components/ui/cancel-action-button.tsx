'use client';

import { Ban } from 'lucide-react';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';

type CancelActionButtonProps = {
  /** Tooltip and accessible name (e.g. "Cancel receipt"). Defaults to "Cancel". */
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Shared icon-only cancel control (Ban).
 * Use for cancel receipt / payment / bill actions only — not dialog dismiss.
 */
export function CancelActionButton({
  label = 'Cancel',
  onClick,
  disabled,
  className,
}: CancelActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive',
        className
      )}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Ban className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
