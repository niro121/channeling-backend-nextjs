'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { roomStatusLabel } from '@/types/room';
import { SyncRoomsButton } from './sync-rooms-button';
import { useRoomUi } from './room-ui-context';
import { buttonStyles } from '@/lib/utils/common-styles';

export default function SectionRoomList() {
  const { toast } = useToast();
  const { records, selectedId, setSelectedId, startNewRoom, filters } =
    useRoomUi();

  const filteredRecords = useMemo(() => {
    const query = (filters.search ?? '').trim().toLowerCase();
    const locationId =
      filters.locationId && filters.locationId !== '__all__'
        ? filters.locationId
        : '';
    const zoneId =
      filters.zoneId && filters.zoneId !== '__all__' ? filters.zoneId : '';
    const status =
      filters.status && filters.status !== '__all__' ? filters.status : '';

    return records.filter((record) => {
      if (status !== '' && String(record.status) !== status) {
        return false;
      }
      if (locationId !== '' && record.locationId !== locationId) {
        return false;
      }
      if (zoneId !== '' && record.zoneId !== zoneId) {
        return false;
      }
      if (!query) return true;
      return (
        record.number.toLowerCase().includes(query) ||
        record.code.toLowerCase().includes(query) ||
        record.description.toLowerCase().includes(query) ||
        record.locationName.toLowerCase().includes(query) ||
        record.zoneName.toLowerCase().includes(query)
      );
    });
  }, [records, filters]);

  const handleAdd = () => {
    startNewRoom();
    toast({
      title: 'Add new room',
      description: 'Enter the room details in the form on the right, then click Save.'
    });
    requestAnimationFrame(() => {
      document
        .getElementById('room-detail-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <div className="flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-3 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Room List
        </h2>
        <div className="flex items-center gap-2">
          <SyncRoomsButton />
          <Button type="button" size="sm" className={buttonStyles.save} onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No rooms match the current filters.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id;
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/15 ring-1 ring-primary/30'
                        : 'border-primary/15 bg-background hover:border-primary/25 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-snug text-foreground">
                          {record.number}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {record.code} · {record.locationName} · {record.zoneName}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {roomStatusLabel(record.status)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
