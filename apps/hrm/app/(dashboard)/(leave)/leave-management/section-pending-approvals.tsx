'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomAlertDialog,
  useToast
} from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  approveLeaveApplicationAction,
  rejectLeaveApplicationAction
} from '@/app/actions/leave-actions/leave-application.actions';

export type PendingApprovalItem = {
  id: string;
  name: string;
  initials: string;
  department: string;
  leaveType: string;
  dateRange: string;
  duration: string;
  days?: number;
  halfDaySession?: string | null;
};

type SectionPendingApprovalsProps = {
  items?: PendingApprovalItem[];
};

const workflowSteps = [
  'Staff applies',
  'Supervisor',
  'HR Officer',
  'Approved'
];

export default function SectionPendingApprovals({
  items = []
}: SectionPendingApprovalsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const canDecide =
    has('leave-management', 'edit') || has('leave-application', 'edit');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [softWarnOpen, setSoftWarnOpen] = useState(false);
  const [softWarnMessage, setSoftWarnMessage] = useState('');
  const softWarnIdRef = useRef<string | null>(null);

  const runApprove = async (id: string, acknowledgedWarnings = false) => {
    setBusyId(id);
    try {
      const result = await approveLeaveApplicationAction(id, {
        acknowledgedWarnings
      });

      if (result.isError) {
        const errors = result.errors as Record<string, unknown> | undefined;
        if (errors?.requiresAck) {
          const warnings = Array.isArray(errors.softWarnings)
            ? (errors.softWarnings as string[])
            : [];
          softWarnIdRef.current = id;
          setSoftWarnMessage(
            warnings[0] ||
              (typeof errors.message === 'string'
                ? errors.message
                : 'Published duties overlap this leave. Continue anyway?')
          );
          setSoftWarnOpen(true);
          return;
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (typeof errors?.message === 'string'
              ? errors.message
              : null) ?? 'Failed to approve leave application.'
        });
        return;
      }

      softWarnIdRef.current = null;
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave application approved.'
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to approve leave application.'
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDecide = async (
    id: string,
    action: 'approve' | 'reject'
  ) => {
    if (action === 'approve') {
      await runApprove(id, false);
      return;
    }

    try {
      setBusyId(id);
      const result = await rejectLeaveApplicationAction(id);

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Failed to reject leave application.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave application rejected.'
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to reject leave application.'
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSoftWarnContinue = async () => {
    const id = softWarnIdRef.current;
    setSoftWarnOpen(false);
    if (!id) return;
    await runApprove(id, true);
  };

  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3 pb-4">
        <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
        <Badge className="border-0 bg-orange-100 text-orange-700 hover:bg-orange-100">
          {items.length} awaiting
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
              No pending leave applications.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-teal-100 text-sm font-semibold text-teal-800">
                      {item.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.department}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:justify-center">
                  <Badge
                    variant="secondary"
                    className="border-0 bg-slate-200/80 text-slate-700 hover:bg-slate-200/80"
                  >
                    {item.leaveType}
                  </Badge>
                  {item.halfDaySession === 'AM' ||
                  item.halfDaySession === 'PM' ||
                  item.days === 0.5 ? (
                    <Badge className="border-0 bg-sky-50 text-sky-800 hover:bg-sky-50">
                      Half day
                    </Badge>
                  ) : null}
                  <div>
                    <p className="text-sm font-semibold">{item.dateRange}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.duration}
                    </p>
                  </div>
                </div>

                {canDecide ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      disabled={busyId === item.id}
                      onClick={() => void handleDecide(item.id, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
                      disabled={busyId === item.id}
                      onClick={() => void handleDecide(item.id, 'approve')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <Card className="rounded-lg border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Approval Workflow
            </CardTitle>
          </CardHeader>
          <div className="border-t border-border" />
          <CardContent className="pt-4">
            <div className="grid grid-cols-4 gap-x-4 gap-y-2">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardContent>

      <CustomAlertDialog
        open={softWarnOpen}
        handleVisibilityChange={(open) => {
          setSoftWarnOpen(open);
          if (!open) softWarnIdRef.current = null;
        }}
        loading={Boolean(busyId)}
        title="Published duties overlap leave"
        description={softWarnMessage}
        handleContinue={handleSoftWarnContinue}
        className={{
          cancelButton: 'h-9',
          actionButton: 'h-9'
        }}
      />
    </Card>
  );
}
