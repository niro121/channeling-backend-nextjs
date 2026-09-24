'use client';

import { Fingerprint, Printer, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';

const EXTRA_SHIFT_NORMAL_LINKS = [
  { id: 'fingerprint', label: 'Finger Print', icon: Fingerprint },
  { id: 'print', label: 'Print', icon: Printer },
  { id: 'analysis', label: 'Analysis', icon: TrendingUp }
] as const;

type ExtraShiftNormalLinksCardProps = {
  className?: string;
  orientation?: 'responsive' | 'vertical' | 'horizontal';
};

export function ExtraShiftNormalLinksCard({
  className,
  orientation = 'responsive'
}: ExtraShiftNormalLinksCardProps) {
  const { toast } = useToast();

  const listClassName =
    orientation === 'vertical'
      ? 'flex flex-col gap-5'
      : orientation === 'horizontal'
        ? 'flex flex-wrap gap-x-6 gap-y-3'
        : 'flex flex-row flex-wrap gap-x-6 gap-y-3 2xl:flex-col 2xl:gap-5';

  return (
    <Card
      className={cn('rounded-lg border border-border shadow-sm', className)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Links</CardTitle>
      </CardHeader>
      <CardContent>
        <nav aria-label="Extra shift links" className={listClassName}>
          {EXTRA_SHIFT_NORMAL_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="inline-flex items-center gap-2 text-left text-sm font-medium text-primary hover:underline"
                onClick={() =>
                  toast({
                    title: item.label,
                    description: `${item.label} will be wired in a later phase.`
                  })
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
