'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  CustomDialog,
  Input,
  Label,
  useToast
} from '@archmage/ui';

/** Header action for overtime: New OT Request stub (no persist in Phase 0). */
export function OvertimeHeaderActions() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleStubSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({
      title: 'Not saved',
      description: 'OT requests will be persisted in the CRUD phase.'
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        New OT Request
      </Button>

      <CustomDialog
        open={open}
        setOpen={setOpen}
        title="New OT Request"
      >
        <form className="space-y-4 py-2" onSubmit={handleStubSubmit}>
          <p className="text-sm text-muted-foreground">
            Sample form only. Saving is wired in Phase 2.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ot-staff">Staff</Label>
              <Input id="ot-staff" name="staff" placeholder="N. Fernando" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ot-department">Department</Label>
              <Input id="ot-department" name="department" placeholder="Ward 3" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ot-date">Date</Label>
              <Input id="ot-date" name="otDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ot-hours">Hours</Label>
              <Input
                id="ot-hours"
                name="hours"
                type="number"
                min={0.5}
                step={0.5}
                placeholder="4"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ot-reason">Reason</Label>
              <Input
                id="ot-reason"
                name="reason"
                placeholder="Ward coverage"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save request
            </Button>
          </div>
        </form>
      </CustomDialog>
    </>
  );
}
