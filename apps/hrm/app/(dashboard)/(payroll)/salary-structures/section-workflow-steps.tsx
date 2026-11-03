'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, cn, useToast } from '@archmage/ui';
import type { SalaryStructureWorkflowStep } from '@/types/payroll';

type SectionWorkflowStepsProps = {
  steps: SalaryStructureWorkflowStep[];
};

const COMING_SOON = 'This step page is not available yet.';

export default function SectionWorkflowSteps({
  steps
}: SectionWorkflowStepsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleStepClick = (step: SalaryStructureWorkflowStep) => {
    if (step.ready) {
      if (pathname === step.href) return;
      router.push(step.href);
      return;
    }

    toast({
      title: step.label,
      description: COMING_SOON
    });
  };

  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Payroll Workflow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-wrap items-start gap-2 lg:flex-nowrap lg:justify-between">
          {steps.map((step, index) => {
            const isCurrent =
              pathname === step.href || step.status === 'current';
            const isCompleted = !isCurrent && step.status === 'completed';
            const isPending = !isCurrent && !isCompleted;

            return (
              <li
                key={step.id}
                className="flex min-w-[5.5rem] flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <div
                      className={cn(
                        'h-0.5 flex-1',
                        steps[index - 1]?.status === 'pending' &&
                          pathname !== steps[index - 1]?.href
                          ? 'bg-border'
                          : 'bg-primary'
                      )}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleStepClick(step)}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      isCompleted &&
                        'border-primary bg-primary text-primary-foreground',
                      isCurrent &&
                        'border-primary bg-background text-primary',
                      isPending &&
                        'border-border bg-muted text-muted-foreground'
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Step ${step.id}: ${step.label}`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                  </button>
                  {index < steps.length - 1 ? (
                    <div
                      className={cn(
                        'h-0.5 flex-1',
                        isPending || isCurrent ? 'bg-border' : 'bg-primary'
                      )}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <p
                  className={cn(
                    'max-w-[7.5rem] text-center text-xs font-medium leading-snug',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
