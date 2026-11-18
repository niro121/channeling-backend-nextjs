'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { buildDutyRosterEditHref } from '@/lib/utils/duty-roster-view';

type DutyPlaceEditNoteProps = {
  allocationId: string;
  dutyDate: string;
  staffId: string;
};

/**
 * Edit-only callout: Night / Overnight do not own duty place.
 * Links to the same RosterAllocation on Duty Roster.
 */
export function DutyPlaceEditNote({
  allocationId,
  dutyDate,
  staffId
}: DutyPlaceEditNoteProps) {
  if (!allocationId || !dutyDate) return null;

  const href = buildDutyRosterEditHref({
    allocationId,
    dutyDate,
    staffId
  });

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
      <p className="font-semibold text-foreground">Duty place / department</p>
      <p className="text-muted-foreground">
        Duty department and location for this shift are managed on Duty Roster.
        Open that duty if the person is covering another department or unit.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        Open this duty on Duty Roster
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
