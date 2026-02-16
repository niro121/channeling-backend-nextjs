'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FilterWrapper } from '../filter-wrapper';
import { Combobox } from '@/components/common/combobox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSessionStore } from '@/store/store-session';
import { useToast } from '@/components/hooks/use-toast';
import { PlusCircle, SaveIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { createSessions, updateSessions } from '@/app/actions/sessions.action';
import { cn } from '@/lib/utils';

type Option = { id: string; name: string };

function getDoctorCount(doctorId: string | undefined, doctorOptions: Option[]): number {
  if (!doctorId || doctorId === '-1') {
    const allDoctors = doctorOptions.filter((o) => o.id !== '-1');
    return allDoctors.length;
  }
  return 1;
}

function getEstimatedSessions(fromDate: string, toDate: string, doctorCount: number): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  return Math.round(days * 10 * doctorCount);
}

interface SessionFiltersProps {
  doctorOptions: Option[];
  doctorId?: string;
  fromDate?: string;
  toDate?: string;
  /** Called when the create/update success dialog is closed so the list can refetch. */
  onSessionsCreatedOrUpdated?: () => void;
}

export default function FilterSection({
  doctorOptions,
  doctorId,
  fromDate,
  toDate,
  onSessionsCreatedOrUpdated
}: SessionFiltersProps) {
  const { setDoctor } = useSessionStore();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [progressOpen, setProgressOpen] = React.useState(false);
  const [progressStatus, setProgressStatus] = React.useState<'running' | 'done' | 'error'>('running');
  const [progressMode, setProgressMode] = React.useState<'create' | 'update'>('create');
  const [progressDoctorCount, setProgressDoctorCount] = React.useState(0);
  const [progressEstimatedSessions, setProgressEstimatedSessions] = React.useState(0);
  const [progressResult, setProgressResult] = React.useState<{
    message: string;
    totalDoctors?: number;
    successCount?: number;
    totalSessionsProcessed?: number;
  } | null>(null);

  const pushFilterToUrl = (vals: { doctorId?: string; fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (vals.doctorId && vals.doctorId !== '-1') params.set('doctorId', vals.doctorId);
    if (vals.fromDate) params.set('fromDate', vals.fromDate);
    if (vals.toDate) params.set('toDate', vals.toDate);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const initialValues = {
    doctorId: doctorId ?? '-1',
    fromDate,
    toDate
  };

  const isDoctorSelected = (v: string | undefined) => v === '-1' || (v != null && v.length > 0);

  return (
    <FilterWrapper
      key={[initialValues.doctorId, initialValues.fromDate, initialValues.toDate].join('|')}
      showApplyButton={false}
      initialValues={initialValues}
    >
      {({ values, setValue }) => {
        const canSubmit = Boolean(
          values.fromDate && values.toDate && isDoctorSelected(values.doctorId)
        );
        return (
        <>
          <div className="flex h-10 shrink-0 items-center">
            <Combobox
              label="Select Doctor"
              options={doctorOptions}
              value={values.doctorId ?? '-1'}
              onChange={(v) => {
                setDoctor(doctorOptions.find((o) => o.id === v)!);
                setValue('doctorId', v);
              }}
            />
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">From date</span>
            <input
              type="date"
              aria-label="From date"
              value={values.fromDate ?? ''}
              onChange={(e) => setValue('fromDate', e.target.value || undefined)}
              className={cn(
                'h-10 w-[10.5rem] shrink-0 rounded-md border border-primary/30 bg-background px-3 py-2 text-sm text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'placeholder:text-muted-foreground'
              )}
            />
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">To date</span>
            <input
              type="date"
              aria-label="To date"
              value={values.toDate ?? ''}
              onChange={(e) => setValue('toDate', e.target.value || undefined)}
              className={cn(
                'h-10 w-[10.5rem] shrink-0 rounded-md border border-primary/30 bg-background px-3 py-2 text-sm text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'placeholder:text-muted-foreground'
              )}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={creating || updating || !canSubmit}
            onClick={() => {
              pushFilterToUrl({
                doctorId: values.doctorId,
                fromDate: values.fromDate,
                toDate: values.toDate
              });
              onSessionsCreatedOrUpdated?.();
            }}
            className="h-10 shrink-0"
          >
            View sessions
          </Button>
          <Button
            size="sm"
            disabled={creating || updating || !canSubmit}
            onClick={async () => {
              const doctorCount = getDoctorCount(values.doctorId, doctorOptions);
              const estimated = getEstimatedSessions(
                values.fromDate ?? '',
                values.toDate ?? '',
                doctorCount
              );
              setProgressMode('create');
              setProgressStatus('running');
              setProgressDoctorCount(doctorCount);
              setProgressEstimatedSessions(estimated);
              setProgressResult(null);
              setProgressOpen(true);
              setCreating(true);
              try {
                const result = await createSessions({
                  doctorId: values.doctorId ?? undefined,
                  fromDate: values.fromDate ?? '',
                  toDate: values.toDate ?? ''
                });
                setProgressStatus(result.success ? 'done' : 'error');
                setProgressResult({
                  message: result.message,
                  totalDoctors: result.totalDoctors,
                  successCount: result.successCount,
                  totalSessionsProcessed: result.totalSessionsProcessed
                });
                if (result.success) {
                  toast({ variant: 'success', title: 'Success', description: result.message });
                  pushFilterToUrl({
                    doctorId: values.doctorId,
                    fromDate: values.fromDate,
                    toDate: values.toDate
                  });
                  onSessionsCreatedOrUpdated?.();
                } else {
                  toast({ variant: 'destructive', title: 'Error', description: result.message });
                }
              } catch (e: any) {
                setProgressStatus('error');
                setProgressResult({ message: e?.message ?? 'Failed to create sessions.' });
                toast({ variant: 'destructive', title: 'Error', description: e?.message ?? 'Failed to create sessions.' });
              } finally {
                setCreating(false);
              }
            }}
            className="h-10 shrink-0 gap-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            <PlusCircle />
            {creating ? 'Creating…' : 'Analyse & Create'}
          </Button>
          <Button
            size="sm"
            disabled={creating || updating || !canSubmit}
            onClick={async () => {
              const doctorCount = getDoctorCount(values.doctorId, doctorOptions);
              const estimated = getEstimatedSessions(
                values.fromDate ?? '',
                values.toDate ?? '',
                doctorCount
              );
              setProgressMode('update');
              setProgressStatus('running');
              setProgressDoctorCount(doctorCount);
              setProgressEstimatedSessions(estimated);
              setProgressResult(null);
              setProgressOpen(true);
              setUpdating(true);
              try {
                const result = await updateSessions({
                  doctorId: values.doctorId ?? undefined,
                  fromDate: values.fromDate ?? '',
                  toDate: values.toDate ?? ''
                });
                setProgressStatus(result.success ? 'done' : 'error');
                setProgressResult({
                  message: result.message,
                  totalDoctors: result.totalDoctors,
                  successCount: result.successCount,
                  totalSessionsProcessed: result.totalSessionsProcessed
                });
                if (result.success) {
                  toast({ variant: 'success', title: 'Success', description: result.message });
                  pushFilterToUrl({
                    doctorId: values.doctorId,
                    fromDate: values.fromDate,
                    toDate: values.toDate
                  });
                  onSessionsCreatedOrUpdated?.();
                } else {
                  toast({ variant: 'destructive', title: 'Error', description: result.message });
                }
              } catch (e: any) {
                setProgressStatus('error');
                setProgressResult({ message: e?.message ?? 'Failed to update sessions.' });
                toast({ variant: 'destructive', title: 'Error', description: e?.message ?? 'Failed to update sessions.' });
              } finally {
                setUpdating(false);
              }
            }}
            className="h-10 shrink-0 gap-1 bg-red-600 text-white hover:bg-red-700"
          >
            <SaveIcon />
            {updating ? 'Updating…' : 'Update Only'}
          </Button>

          <Dialog
            open={progressOpen}
            onOpenChange={(open) => {
              if (!open && progressStatus === 'done') {
                // Refetch again on close so list is fresh when dialog dismisses
                setTimeout(() => onSessionsCreatedOrUpdated?.(), 0);
              }
              setProgressOpen(open);
            }}
          >
            <DialogContent
              className="sm:max-w-md"
              onPointerDownOutside={(e) => { if (progressStatus === 'running') e.preventDefault(); }}
            >
              <DialogHeader>
                <DialogTitle>
                  {progressMode === 'create' ? 'Creating sessions' : 'Updating sessions'}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 pt-1">
                    {progressStatus === 'running' && (
                      <>
                        <p>
                          Processing <strong>{progressDoctorCount}</strong> doctor{progressDoctorCount !== 1 ? 's' : ''}, estimated up to <strong>{progressEstimatedSessions.toLocaleString()}</strong> sessions.
                        </p>
                        <p className="text-muted-foreground text-xs">
                          This may take up to 30 seconds. Please wait…
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Running…</span>
                        </div>
                      </>
                    )}
                    {(progressStatus === 'done' || progressStatus === 'error') && progressResult && (
                      <>
                        <p className={progressStatus === 'error' ? 'text-destructive' : ''}>
                          {progressResult.message}
                        </p>
                        {progressStatus === 'done' && progressResult.totalDoctors != null && (
                          <p className="text-muted-foreground text-sm">
                            <strong>{progressResult.totalDoctors}</strong> doctor{progressResult.totalDoctors !== 1 ? 's' : ''} processed.
                            {progressResult.totalSessionsProcessed != null && (
                              <> <strong>{progressResult.totalSessionsProcessed.toLocaleString()}</strong> sessions in range.</>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              {progressStatus !== 'running' && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setProgressOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </>
        );
      }}
    </FilterWrapper>
  );
}
