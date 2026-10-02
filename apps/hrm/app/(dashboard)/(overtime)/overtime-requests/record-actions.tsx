'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { OvertimeRequestSample } from './sample-data';

type OvertimeDecision = 'approve' | 'reject';

type OvertimeRecordActionsProps = {
  record: OvertimeRequestSample;
};

export default function OvertimeRecordActions({
  record
}: OvertimeRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const canDecide = has('overtime-requests', 'edit');
  const isPending = record.status === 'pending';
  const [decision, setDecision] = useState<OvertimeDecision | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!decision) return;

    setLoading(true);
    toast({
      title: 'Not saved',
      description: `OT ${decision} will be wired in the workflow phase.`
    });
    setLoading(false);
    setDecision(null);
  };

  if (!canDecide) return null;

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!isPending}
          className="h-8 w-8 rounded-full bg-red-500 text-white hover:bg-red-600 hover:text-white disabled:bg-red-500/40 disabled:text-white"
          aria-label={`Reject overtime for ${record.staffName}`}
          onClick={() => setDecision('reject')}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!isPending}
          className="h-8 w-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white disabled:bg-emerald-600/40 disabled:text-white"
          aria-label={`Approve overtime for ${record.staffName}`}
          onClick={() => setDecision('approve')}
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>

      <CustomAlertDialog
        open={decision === 'reject'}
        handleVisibilityChange={(open) => {
          if (!open) setDecision(null);
        }}
        loading={loading}
        title="Reject overtime request?"
        description={`This will reject the OT request for ${record.staffName} (${record.hours}h — ${record.reason}). Saving is wired in the workflow phase.`}
        handleContinue={handleContinue}
      />

      <CustomAlertDialog
        open={decision === 'approve'}
        handleVisibilityChange={(open) => {
          if (!open) setDecision(null);
        }}
        loading={loading}
        title="Approve overtime request?"
        description={`This will approve the OT request for ${record.staffName} (${record.hours}h — ${record.reason}). Saving is wired in the workflow phase.`}
        handleContinue={handleContinue}
      />
    </>
  );
}
