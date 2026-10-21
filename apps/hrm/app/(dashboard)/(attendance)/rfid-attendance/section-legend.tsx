const LEGEND = [
  { label: 'Present', hint: 'Checked in on time', className: 'bg-emerald-500' },
  { label: 'Late', hint: 'After grace period', className: 'bg-orange-500' },
  { label: 'Absent', hint: 'No punch recorded', className: 'bg-rose-500' },
  { label: 'Leave', hint: 'Approved leave', className: 'bg-sky-500' },
  { label: 'OT', hint: 'Overtime hours (later)', className: 'bg-slate-400' }
] as const;

export default function SectionStatusLegend() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Status Legend
      </h2>
      <ul className="space-y-2.5">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5 text-sm">
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.className}`}
            />
            <span>
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="block text-xs text-muted-foreground">
                {item.hint}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
