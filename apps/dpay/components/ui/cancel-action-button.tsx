'use client';

import { Ban } from 'lucide-react';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';

type CancelActionButtonProps = {
  /** Visible button text. Defaults to "Cancel". */
  label?: string;
  /** Tooltip; defaults to label. */
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
};

/**
 * Shared cancel control (Ban icon + label, destructive outline).
 * Use for cancel receipt / payment / bill actions only — not dialog dismiss.
 */
export function CancelActionButton({
  label = 'Cancel',
  title,
  onClick,
  disabled,
  className,
  iconClassName,
}: CancelActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive',
        className
      )}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      <Ban className={cn('h-3.5 w-3.5', iconClassName)} />
      {label}
    </Button>
  );
}
