'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import moment from 'moment';
import { History, Loader2 } from 'lucide-react';
import { formatTimeSriLanka, normalizeSessionTime } from '@/lib/utils';
import { getSessionActivity, type SessionActivityEntry } from '@/app/actions/sessions.action';
import { formatLKR } from '@/lib/format-money';
import type { SessionListItem } from './columns';

function formatFee(value: number | null | undefined): string {
  if (value == null) return '—';
  return formatLKR(value);
}

/** Format session start/end for display in Sri Lanka (DB stores UTC). */
function formatSessionTimeForDisplay(
  value: Date | number | string,
  sessionDate: Date | string
): string {
  const d = sessionDate instanceof Date ? sessionDate : new Date(sessionDate);
  const normalized =
    typeof value === 'string' ? new Date(value) : normalizeSessionTime(value as Date | number, d);
  return formatTimeSriLanka(normalized);
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-xs text-foreground font-medium text-right">{value ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-1.5 mb-2">
        {title}
      </h3>
      <dl className="space-y-0">{children}</dl>
    </section>
  );
}

type SessionViewDialogProps = {
  session: SessionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function actionLabel(action: string): string {
  if (action === 'session.deleted') return 'Deleted';
  if (action === 'session.updated') return 'Updated';
  if (action === 'session.created.bulk') return 'Created (bulk)';
  return action;
}

export function SessionViewDialog({ session, open, onOpenChange }: SessionViewDialogProps) {
  const [activityLog, setActivityLog] = useState<SessionActivityEntry[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!open || !session) setActivityLog(null);
  }, [open, session?.id]);

  if (!session) return null;

  const doctor = session.doctor;
  const department = session.department;
  const room = session.room;
  const isActive = Number(session.status) === 1;
  const isScan = Boolean((session as unknown as { isScan?: boolean }).isScan);
  const timeRange = `${formatSessionTimeForDisplay(session.startTime, session.date)} – ${formatSessionTimeForDisplay(session.endTime, session.date)}`;

  const handleLoadActivity = async () => {
    if (activityLog !== null || activityLoading) return;
    setActivityLoading(true);
    try {
      const res = await getSessionActivity(session.id);
      setActivityLog(res.success && res.data ? res.data : []);
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60">
          <DialogTitle className="text-sm font-semibold tracking-tight">Session Details</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* Summary */}
          <div className="rounded-md border border-border/60 bg-muted/30 px-5 py-3 mb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
              <InfoItem
                label="Date"
                value={moment(session.date).format('DD MMM YYYY')}
              />
              <InfoItem label="Time" value={timeRange} />
              <InfoItem label="Doctor" value={doctor?.name} />
              <InfoItem label="Location" value={session.location?.name} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={isActive ? 'default' : 'secondary'}
                    className="w-fit text-[11px] font-medium px-1.5 py-0"
                  >
                    {isActive ? 'Active' : 'Leave'}
                  </Badge>
                  {isScan ? (
                    <Badge variant="secondary" className="w-fit text-[11px] font-semibold px-1.5 py-0">
                      SCAN
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-5">
              <Section title="Schedule">
                <DetailItem
                  label="Duration"
                  value={session.durationMinutes != null ? `${session.durationMinutes} minutes` : '—'}
                />
                <DetailItem label="Original session" value={session.originalSessionName} />
              </Section>

              <Section title="Capacity">
                <DetailItem label="Maximum patients" value={session.maxPatientNumber} />
                <DetailItem label="Appointments" value={session.appointmentNo ?? 0} />
                <DetailItem label="Starting number" value={session.startingPatientNumber} />
              </Section>

              <Section title="Fees">
                <DetailItem label="Local fee" value={formatFee(session.amountLocal)} />
                <DetailItem label="Foreign fee" value={formatFee(session.amountForeign)} />
                <DetailItem label="Refundable" value={session.refundable === 1 ? 'Yes' : 'No'} />
              </Section>
            </div>

            <div className="space-y-5">
              <Section title="Location">
                <DetailItem label="Branch" value={session.location?.name} />
                <DetailItem label="Room" value={room?.number} />
              </Section>

              <Section title="Doctor & department">
                <DetailItem label="Doctor" value={doctor?.name} />
                <DetailItem label="Department" value={department?.name} />
              </Section>

              {session.remarks && (
                <Section title="Remarks">
                  <div className="py-1.5">
                    <p className="text-xs text-foreground leading-relaxed">{session.remarks}</p>
                  </div>
                </Section>
              )}

              <Section title="Record">
                <DetailItem
                  label="Created"
                  value={
                    session.createdAt
                      ? `${session.createdUser?.name ?? '—'}, ${moment(session.createdAt).format('DD MMM YYYY [at] h:mm A')}`
                      : '—'
                  }
                />
                <DetailItem
                  label="Last updated"
                  value={
                    session.updatedAt
                      ? `${session.updatedUser?.name ?? '—'}, ${moment(session.updatedAt).format('DD MMM YYYY [at] h:mm A')}`
                      : '—'
                  }
                />
              </Section>

              <Section title="Activity log">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleLoadActivity}
                    disabled={activityLoading}
                  >
                    {activityLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <History className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">
                      {activityLog === null ? 'Retrieve Activity' : 'Refresh activity'}
                    </span>
                  </Button>
                  {activityLog && (
                    <div className="rounded border border-border/50 bg-muted/20 max-h-40 overflow-y-auto mt-2">
                      {activityLog.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">No activity recorded.</p>
                      ) : (
                        <ul className="divide-y divide-border/40 text-xs">
                          {activityLog.map((entry) => (
                            <li key={entry.id} className="px-2 py-1.5">
                              <span className="font-medium text-foreground">{actionLabel(entry.action)}</span>
                              {' · '}
                              <span className="text-muted-foreground">{entry.userName ?? '—'}</span>
                              {' · '}
                              <span className="text-muted-foreground">
                                {moment(entry.createdAt).format('DD MMM YYYY h:mm A')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>

        <footer className="px-6 py-2.5 border-t border-border/50 bg-muted/20 rounded-b-lg">
          <p className="font-mono text-[10px] text-muted-foreground/90 tracking-tight">
            Session reference: <span className="text-foreground/70">{session.id}</span>
          </p>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
