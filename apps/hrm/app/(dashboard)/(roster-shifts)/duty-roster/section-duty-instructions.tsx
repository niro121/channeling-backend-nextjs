'use client';

import { Info } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

export default function SectionDutyInstructions() {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardContent className="px-4 py-3">
        <Accordion defaultValue={['duty-procedure']}>
          <AccordionItem value="duty-procedure" className="border-none">
            <AccordionTrigger className="px-0 py-1 hover:no-underline">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                  <Info className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Duty Roster Procedure
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Daily list of the same allocations shown on the Shift
                    Roster week grid.
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">1. Load:</span>{' '}
                  Choose Department, Unit, Date, Shift, or Roster, then click
                  Load Duty Roster. The list is the Shift Roster cells for that
                  calendar date.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    2. Assign or edit:
                  </span>{' '}
                  Assign Staff creates a draft allocation for the selected
                  date. Edit updates shift, location, supervisor, comments, and
                  attendance (Present / Late / Absent).
                </p>
                <p>
                  <span className="font-medium text-foreground">3. Swap:</span>{' '}
                  Both staff members must already have a duty that day. The
                  confirm step exchanges their shift types. The week grid shows
                  the same change.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    4. Replace:
                  </span>{' '}
                  Move a duty cell to another staff member who does not already
                  have an allocation on that date.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    5. Published dates:
                  </span>{' '}
                  After a roster is published, assign / swap / replace / edit
                  are rejected. Use Roster Amendments instead.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    6. Weekly / Monthly:
                  </span>{' '}
                  Those buttons load a date-range list for the week (Sun–Sat)
                  or month of the selected date. Use Shift Roster for the
                  staff × day grid.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
