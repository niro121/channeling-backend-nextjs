'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavLoadingButtonProps = ButtonProps & {
  href: string;
  /** Optional icon shown before children when not loading */
  icon?: React.ReactNode;
};

export function NavLoadingButton({
  href,
  icon,
  className,
  disabled,
  onClick,
  children,
  ...props
}: NavLoadingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn('cursor-pointer', className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        setLoading(true);
        router.push(href);
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}

type NavLoadingIconButtonProps = ButtonProps & {
  href: string;
  icon: React.ReactNode;
  srLabel: string;
};

export function NavLoadingIconButton({
  href,
  icon,
  srLabel,
  className,
  disabled,
  onClick,
  ...props
}: NavLoadingIconButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn('cursor-pointer', className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        setLoading(true);
        router.push(href);
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span className="sr-only">{srLabel}</span>
    </Button>
  );
}

