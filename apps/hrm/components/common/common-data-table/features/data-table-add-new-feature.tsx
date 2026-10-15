'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';

type DataTableAddNewFeatureProps = {
  label?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** Optional custom icon; defaults to Plus. */
  icon?: ReactNode;
};

/**
 * Toolbar feature: Add New action as a link and/or button.
 * Pass `href` for navigation, or `onClick` for custom handlers.
 */
export function DataTableAddNewFeature({
  label = 'Add New',
  href,
  onClick,
  className,
  icon
}: DataTableAddNewFeatureProps) {
  const content = (
    <>
      {icon ?? <Plus className="h-4 w-4" />}
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{label}</span>
    </>
  );

  if (href) {
    return (
      <Button
        asChild
        size="sm"
        className={cn('gap-1.5 h-9 cursor-pointer', className)}
      >
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      className={cn('gap-1.5 h-9 cursor-pointer', className)}
      onClick={onClick}
    >
      {content}
    </Button>
  );
}
