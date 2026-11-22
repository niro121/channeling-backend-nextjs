'use client';

import { Info } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

export default function SectionAssignmentInstructions() {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardContent className="px-4 py-3">
        <Accordion defaultValue={['assignment-procedure']}>
          <AccordionItem value="assignment-procedure" className="border-none">
            <AccordionTrigger className="px-0 py-1 hover:no-underline">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                  <Info className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Shift Assignment Procedure
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quick guide for assigning shift types to staff and feeding
                    the Shift Roster.
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    1. Find staff:
                  </span>{' '}
                  Use Institution, Department, Unit, Designation, Category,
                  Grade, Status, or Staff Search, then click Search. Filter
                  options come from saved staff employment values.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    2. Assign one staff member:
                  </span>{' '}
                  Click Assign Shift, select the Manage Rosters group first
                  (context card shows department, institution, and shifts per
                  person per day), then choose a staff member from that group,
                  shift type, Effective From / To, weekly off day, and status.
                  Save creates a standing assignment (SA-n) linked to that
                  roster.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    3. Bulk assign:
                  </span>{' '}
                  Select one or more rows in the register, then click Bulk
                  Assign. Choose the roster group — only selected staff who
                  belong to that group receive the same shift rule.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    4. Edit or review:
                  </span>{' '}
                  Use row actions to edit an existing assignment or open Change
                  History. Delete removes the standing rule, not calendar cells
                  already allocated on the Shift Roster.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    5. Overlap rule:
                  </span>{' '}
                  The same staff member cannot have two assignments for the
                  same shift type with overlapping effective dates. Different
                  shift types on the same date range are allowed.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    6. What happens next:
                  </span>{' '}
                  Active assignments determine which staff appear when you Load
                  Roster on Shift Roster. Calendar chips are created later when
                  you allocate or copy a draft there.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
