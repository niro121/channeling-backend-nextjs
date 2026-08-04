'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@archmage/ui';

export type PendingApprovalItem = {
  id: string;
  name: string;
  initials: string;
  department: string;
  leaveType: string;
  dateRange: string;
  duration: string;
};

type SectionPendingApprovalsProps = {
  items?: PendingApprovalItem[];
};

const sampleItems: PendingApprovalItem[] = [
  {
    id: '1',
    name: 'N. Fernando',
    initials: 'NF',
    department: 'Ward 3',
    leaveType: 'Casual',
    dateRange: '18–19 Aug',
    duration: '2 days'
  },
  {
    id: '2',
    name: 'S. Perera',
    initials: 'SP',
    department: 'ICU',
    leaveType: 'Medical',
    dateRange: '20 Aug',
    duration: '1 day'
  },
  {
    id: '3',
    name: 'K. Jayasuriya',
    initials: 'KJ',
    department: 'OPD',
    leaveType: 'Annual',
    dateRange: '22–26 Aug',
    duration: '5 days'
  },
  {
    id: '4',
    name: 'R. Silva',
    initials: 'RS',
    department: 'Lab',
    leaveType: 'Half-day',
    dateRange: '21 Aug',
    duration: '0.5 day'
  }
];

const workflowSteps = [
  'Staff applies',
  'Supervisor',
  'HR Officer',
  'Approved'
];

/** UI-only pending approvals list with approve/reject stubs. */
export default function SectionPendingApprovals({
  items = sampleItems
}: SectionPendingApprovalsProps) {
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
          {items.map((item) => (
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
                <div>
                  <p className="text-sm font-semibold">{item.dateRange}</p>
                  <p className="text-xs text-muted-foreground">{item.duration}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    // TODO: wire reject
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 bg-emerald-700 text-white hover:bg-emerald-800"
                  onClick={() => {
                    // TODO: wire approve
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Card className="rounded-lg border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approval Workflow</CardTitle>
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
    </Card>
  );
}
