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

const sampleItems: GatePassRequestItem[] = [
  {
    id: '1',
    name: 'N. Fernando',
    reason: 'Medical appointment',
    schedule: '14:00–16:00'
  },
  {
    id: '2',
    name: 'K. Jayasuriya',
    reason: 'Personal',
    schedule: '10:30–12:00'
  },
  {
    id: '3',
    name: 'S. Wijesinghe',
    reason: 'Bank visit',
    schedule: '13:00–14:00'
  },
  {
    id: '4',
    name: 'P. Bandara',
    reason: 'Family emergency',
    schedule: 'Immediate'
  }
];

/** UI-only gate pass requests list with Deny/Issue stubs. */
export default function SectionGatePassRequests({
  items = sampleItems
}: SectionGatePassRequestsProps) {
  return (
    <Card className="rounded-lg border border-border shadow-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3 pb-4">
        <CardTitle className="text-lg font-semibold">
          Gate Pass Requests
        </CardTitle>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-100 px-2 text-sm font-semibold text-orange-700">
          {items.length}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((item) => (
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  // TODO: wire deny
                }}
              >
                Deny
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-emerald-800 text-white hover:bg-emerald-900"
                onClick={() => {
                  // TODO: wire issue
                }}
              >
                Issue
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
