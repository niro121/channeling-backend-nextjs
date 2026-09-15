'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@archmage/ui';

export type GatePassRequestItem = {
  id: string;
  name: string;
  reason: string;
  schedule: string;
};

type SectionGatePassRequestsProps = {
  items?: GatePassRequestItem[];
};

/** Placeholder until Phase 8 gate-pass model. */
export default function SectionGatePassRequests({
  items = []
}: SectionGatePassRequestsProps) {
  return (
    <Card className="h-full rounded-lg border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3 pb-4">
        <CardTitle className="text-lg font-semibold">
          Gate Pass Requests
        </CardTitle>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-100 px-2 text-sm font-semibold text-orange-700">
          {items.length}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
            Gate pass requests are not enabled yet. This section will go live in
            a later release.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.reason} · {item.schedule}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <Button type="button" variant="outline" size="sm" className="h-8" disabled>
                  Deny
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-emerald-800 text-white hover:bg-emerald-900"
                  disabled
                >
                  Issue
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
