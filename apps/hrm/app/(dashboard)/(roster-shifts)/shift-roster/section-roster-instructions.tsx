'use client';

import { Info } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

export default function SectionRosterInstructions() {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardContent className="px-4 py-3">
        <Accordion defaultValue={['roster-procedure']}>
          <AccordionItem value="roster-procedure" className="border-none">
            <AccordionTrigger className="px-0 py-1 hover:no-underline">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                  <Info className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Shift Roster Procedure
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quick guide for loading, copying, drafting, and publishing
                    roster periods.
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">1. Load Roster:</span>{' '}
                  Select `Department`, `Unit`, `Roster`, and a date range, then
                  click `Load Roster` to bring staff rows into the grid.
                </p>
                <p>
                  <span className="font-medium text-foreground">2. Start a draft:</span>{' '}
                  Use `Fill New` for an empty draft period, `Fill Old Roster`
                  to reuse the latest previous published pattern, or `Copy Previous Week / Month`
                  to shift published allocations forward.
                </p>
                <p>
                  <span className="font-medium text-foreground">3. Edit allocations:</span>{' '}
                  Click an empty day cell to allocate a shift, click an existing
                  chip to edit it, and use the `Leave` checkbox when the cell
                  should be recorded as leave-covered.
                </p>
                <p>
                  <span className="font-medium text-foreground">4. Save behavior:</span>{' '}
                  Allocations save as `draft` when you allocate or edit. `Save Draft`
                  in the header is only a reminder; the actual persistence happens
                  during allocation actions.
                </p>
                <p>
                  <span className="font-medium text-foreground">5. Publish:</span>{' '}
                  Use `Publish Roster` after review. Published dates become
                  locked for direct allocate/edit/leave-toggle changes and later
                  changes should go through amendments.
                </p>
                <p>
                  <span className="font-medium text-foreground">6. Copy safety:</span>{' '}
                  Copy actions only place shifts into empty staff/date slots and
                  will not create duplicate allocations for the same staff member
                  on the same date.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
