'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimePickerSelect } from '@/components/common/time-picker-select';
import { useToast } from '@/components/hooks/use-toast';
import { updateSession } from '@/app/actions/sessions.action';
import { calculateDurationMinutes, sessionTimeToUnixSeconds, unixToTimeDisplay } from '@/lib/utils';
import type { SessionListItem } from './columns';

type EditSessionDialogProps = {
  session: SessionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function EditSessionDialog({
  session,
  open,
  onOpenChange,
  onSuccess,
}: EditSessionDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [startTimeValue, setStartTimeValue] = useState('4:00');
  const [startMeridiem, setStartMeridiem] = useState<'AM' | 'PM'>('PM');
  const [endTimeValue, setEndTimeValue] = useState('6:00');
  const [endMeridiem, setEndMeridiem] = useState<'AM' | 'PM'>('PM');
  const [maxPatientNumber, setMaxPatientNumber] = useState<number>(50);

  const durationMinutes = calculateDurationMinutes(
    startTimeValue,
    startMeridiem,
    endTimeValue,
    endMeridiem
  );

  useEffect(() => {
    if (!session || !open) return;
    const startUnix = sessionTimeToUnixSeconds(session.startTime as number | string | Date);
    const endUnix = sessionTimeToUnixSeconds(session.endTime as number | string | Date);
    const start = unixToTimeDisplay(startUnix);
    const end = unixToTimeDisplay(endUnix);
    setStartTimeValue(start.timeStr);
    setStartMeridiem(start.meridiem);
    setEndTimeValue(end.timeStr);
    setEndMeridiem(end.meridiem);
    setMaxPatientNumber(session.maxPatientNumber ?? 50);
  }, [session, open]);

  const handleSave = async () => {
    if (!session?.id) return;
    const max = Number(maxPatientNumber);
    if (Number.isNaN(max) || max < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description: 'Maximum Patient No. must be a non-negative number.',
      });
      return;
    }
    if (durationMinutes <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation',
        description: 'End time must be after start time.',
      });
      return;
    }
    setSaving(true);
    try {
      const result = await updateSession({
        sessionId: session.id,
        startTimeValue,
        startMeridiem,
        endTimeValue,
        endMeridiem,
        maxPatientNumber: max,
      });
      if (result.success) {
        toast({
          variant: 'success',
          title: 'Success',
          description: result.message ?? 'Session updated successfully.',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message ?? 'Failed to update session.',
        });
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update session.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <TimePickerSelect
            id="startTime"
            label="Start Time"
            timeValue={startTimeValue}
            meridiemValue={startMeridiem}
            onTimeChange={(e) => setStartTimeValue(e.target.value)}
            onMeridiemChange={setStartMeridiem}
            required
            hideErrorMessage
          />
          <TimePickerSelect
            id="endTime"
            label="End Time"
            timeValue={endTimeValue}
            meridiemValue={endMeridiem}
            onTimeChange={(e) => setEndTimeValue(e.target.value)}
            onMeridiemChange={setEndMeridiem}
            required
            hideErrorMessage
          />
          <div className="grid gap-2">
            <Label>Duration in Minutes</Label>
            <Input
              value={durationMinutes}
              readOnly
              className={durationMinutes <= 0 ? 'bg-destructive/10 border-destructive' : 'bg-muted'}
            />
            {durationMinutes <= 0 && (
              <p className="text-sm text-destructive">End time must be after start time.</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxPatientNumber">
              Maximum Patient No. <span className="text-red-600">*</span>
            </Label>
            <Input
              id="maxPatientNumber"
              type="number"
              min={0}
              value={maxPatientNumber}
              onChange={(e) => setMaxPatientNumber(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || durationMinutes <= 0}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
