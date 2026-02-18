'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BackButtonProps = {
  href?: string;
  onClick?: () => void;
  className?: string;
  label?: string;
};

export function BackButton({
  href,
  onClick,
  className,
  label = 'Back'
}: BackButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    
    setLoading(true);
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'gap-2 cursor-pointer',
        'bg-[#EFF5F2] hover:bg-[#EFF5F2]/80 border-[#EFF5F2] hover:border-[#EFF5F2]',
        'text-foreground',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
