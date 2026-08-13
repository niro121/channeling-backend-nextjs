'use client';

import { Save, Send, Sparkles } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';

const LATER = 'Will be wired in a later phase.';

export function ShiftRosterHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');

  const notify = (title: string) => {
    toast({ title, description: LATER });
  };

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9"
        onClick={() => notify('Fill New')}
      >
        Fill New
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9"
        onClick={() => notify('Fill Old Roster')}
      >
        Fill Old Roster
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        onClick={() => notify('Create Fixed Roster')}
      >
        <Sparkles className="h-4 w-4" />
        Create Fixed Roster
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        onClick={() => notify('Save Draft')}
      >
        <Save className="h-4 w-4" />
        Save Draft
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => notify('Publish Roster')}
      >
        <Send className="h-4 w-4" />
        Publish Roster
      </Button>
    </div>
  );
}
