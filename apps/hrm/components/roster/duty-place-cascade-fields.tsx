'use client';

import { useEffect, useMemo, useState } from 'react';
import { Combobox, Label } from '@archmage/ui';
import type {
  DutyRosterRoomOption,
  DutyRosterZoneOption,
  RosterFilterOption
} from '@/types/roster';

type FieldStyleClasses = {
  parentDiv: string;
  labelClassName: string;
  inputClassName: string;
};

type DutyPlaceCascadeFieldsProps = {
  locations: RosterFilterOption[];
  zones: DutyRosterZoneOption[];
  rooms: DutyRosterRoomOption[];
  dutyZoneId: string;
  dutyRoomId: string;
  disabled?: boolean;
  fieldStyleClasses: FieldStyleClasses;
  onZoneChange: (zoneId: string) => void;
  onRoomChange: (roomId: string) => void;
};

/**
 * Optional Location → Zone → Unit/Room cascade for duty-place forms.
 * Location is UI-only (not persisted); Zone/Room write dutyZoneId / dutyRoomId.
 */
export function DutyPlaceCascadeFields({
  locations,
  zones,
  rooms,
  dutyZoneId,
  dutyRoomId,
  disabled = false,
  fieldStyleClasses,
  onZoneChange,
  onRoomChange
}: DutyPlaceCascadeFieldsProps) {
  const zoneLocationId = useMemo(() => {
    if (!dutyZoneId) return '';
    return zones.find((z) => z.id === dutyZoneId)?.locationId ?? '';
  }, [dutyZoneId, zones]);

  const [locationId, setLocationId] = useState(zoneLocationId);

  useEffect(() => {
    if (zoneLocationId) {
      setLocationId(zoneLocationId);
    }
  }, [zoneLocationId]);

  const zoneOptions = useMemo(() => {
    const filtered = locationId
      ? zones.filter((z) => z.locationId === locationId)
      : zones;
    const options = filtered.map((z) => ({ id: z.id, name: z.name }));
    if (
      dutyZoneId &&
      !options.some((z) => z.id === dutyZoneId)
    ) {
      const orphan = zones.find((z) => z.id === dutyZoneId);
      if (orphan) {
        options.unshift({ id: orphan.id, name: orphan.name });
      }
    }
    return options;
  }, [zones, locationId, dutyZoneId]);

  const roomOptions = useMemo(() => {
    const filtered = dutyZoneId
      ? rooms.filter((r) => r.zoneId === dutyZoneId)
      : locationId
        ? rooms.filter((r) => r.locationId === locationId)
        : rooms;
    const options = filtered.map((r) => ({ id: r.id, name: r.name }));
    if (
      dutyRoomId &&
      !options.some((r) => r.id === dutyRoomId)
    ) {
      const orphan = rooms.find((r) => r.id === dutyRoomId);
      if (orphan) {
        options.unshift({ id: orphan.id, name: orphan.name });
      }
    }
    return options;
  }, [rooms, dutyZoneId, locationId, dutyRoomId]);

  return (
    <>
      <div className={fieldStyleClasses.parentDiv}>
        <Label className={fieldStyleClasses.labelClassName}>Location</Label>
        <div className={fieldStyleClasses.inputClassName}>
          <Combobox
            label="Select location"
            options={locations}
            value={locationId}
            defaultValue=""
            clearable
            disabled={disabled}
            triggerClassName="w-full max-w-none font-normal!"
            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
            onChange={(value) => {
              setLocationId(value);
              if (!value) return;
              const currentZone = zones.find((z) => z.id === dutyZoneId);
              if (currentZone && currentZone.locationId !== value) {
                onZoneChange('');
                onRoomChange('');
              }
            }}
          />
        </div>
      </div>

      <div className={fieldStyleClasses.parentDiv}>
        <Label className={fieldStyleClasses.labelClassName}>Zone</Label>
        <div className={fieldStyleClasses.inputClassName}>
          <Combobox
            label="Select zone"
            options={zoneOptions}
            value={dutyZoneId}
            defaultValue=""
            clearable
            disabled={disabled}
            triggerClassName="w-full max-w-none font-normal!"
            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
            onChange={(value) => {
              onZoneChange(value);
              onRoomChange('');
              if (value) {
                const zone = zones.find((z) => z.id === value);
                if (zone?.locationId) {
                  setLocationId(zone.locationId);
                }
              }
            }}
          />
        </div>
      </div>

      <div className={fieldStyleClasses.parentDiv}>
        <Label className={fieldStyleClasses.labelClassName}>Unit / Room</Label>
        <div className={fieldStyleClasses.inputClassName}>
          <Combobox
            label="Select unit / room"
            options={roomOptions}
            value={dutyRoomId}
            defaultValue=""
            clearable
            disabled={disabled}
            triggerClassName="w-full max-w-none font-normal!"
            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
            onChange={(value) => onRoomChange(value)}
          />
        </div>
      </div>
    </>
  );
}
