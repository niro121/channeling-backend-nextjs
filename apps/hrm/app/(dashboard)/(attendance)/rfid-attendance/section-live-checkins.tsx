import type { RfidLiveCheckInRow, RfidLiveStatusLabel } from '@/types/attendance';
import { cn } from '@/lib/utils';

type SectionLiveCheckinsProps = {
  rows: RfidLiveCheckInRow[];
  streaming: boolean;
};

function statusBadgeClass(label: RfidLiveStatusLabel): string {
  switch (label) {
    case 'In':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Late':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Missing Out':
    case 'Missing In':
    case 'Absent':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'Leave':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'Exception':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export default function SectionLiveCheckins({
  rows,
  streaming
}: SectionLiveCheckinsProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">Live RFID Check-ins</h2>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            streaming
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-border bg-muted text-muted-foreground'
          )}
        >
          {streaming ? 'Streaming' : 'Idle'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Staff</th>
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No check-ins for this date yet. Ingest punches or run day
                  recompute for rostered absents.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {row.avatarInitials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {row.staffName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.staffCode}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.department}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.timeLabel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        statusBadgeClass(row.statusLabel)
                      )}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
