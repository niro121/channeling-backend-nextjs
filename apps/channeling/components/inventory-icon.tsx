'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Accessibility, Activity, AirVent, Archive, Armchair, Bandage, Bath, Bed, BedDouble, BedSingle,
  Box, Cctv, Clock, Coffee, CookingPot, DoorOpen, Droplets, Fan, FireExtinguisher, FlaskConical,
  Heater, HeartPulse, Key, Keyboard, Lamp, LampDesk, Laptop, Lightbulb, Lock, Microwave, Monitor,
  Mouse, Package, Phone, Pill, Plug, Printer, Projector, Refrigerator, Router, Scale, Shirt,
  ShowerHead, Smartphone, Sofa, Speaker, Stethoscope, Syringe, Table2, Tablet, Thermometer,
  Toilet, Trash2, Tv, Utensils, WashingMachine, Wind, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Icons offered in the picker. Keys are stored on InventoryItem.icon / InventoryCategory.icon. */
export const INVENTORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  tv: { icon: Tv, label: 'TV' },
  monitor: { icon: Monitor, label: 'Monitor' },
  laptop: { icon: Laptop, label: 'Laptop' },
  tablet: { icon: Tablet, label: 'Tablet' },
  smartphone: { icon: Smartphone, label: 'Mobile' },
  phone: { icon: Phone, label: 'Phone' },
  keyboard: { icon: Keyboard, label: 'Keyboard' },
  mouse: { icon: Mouse, label: 'Mouse' },
  printer: { icon: Printer, label: 'Printer' },
  projector: { icon: Projector, label: 'Projector' },
  router: { icon: Router, label: 'Router' },
  speaker: { icon: Speaker, label: 'Speaker' },
  cctv: { icon: Cctv, label: 'CCTV' },
  clock: { icon: Clock, label: 'Clock' },
  'air-vent': { icon: AirVent, label: 'AC' },
  fan: { icon: Fan, label: 'Fan' },
  heater: { icon: Heater, label: 'Heater' },
  wind: { icon: Wind, label: 'Air purifier' },
  lightbulb: { icon: Lightbulb, label: 'Light' },
  lamp: { icon: Lamp, label: 'Lamp' },
  'lamp-desk': { icon: LampDesk, label: 'Desk lamp' },
  plug: { icon: Plug, label: 'Extension' },
  refrigerator: { icon: Refrigerator, label: 'Fridge' },
  microwave: { icon: Microwave, label: 'Microwave' },
  'cooking-pot': { icon: CookingPot, label: 'Kettle / pot' },
  'washing-machine': { icon: WashingMachine, label: 'Washer' },
  'flask-conical': { icon: FlaskConical, label: 'Flask' },
  coffee: { icon: Coffee, label: 'Cup' },
  utensils: { icon: Utensils, label: 'Cutlery' },
  droplets: { icon: Droplets, label: 'Water' },
  bed: { icon: Bed, label: 'Bed' },
  'bed-double': { icon: BedDouble, label: 'Double bed' },
  'bed-single': { icon: BedSingle, label: 'Single bed' },
  armchair: { icon: Armchair, label: 'Chair' },
  sofa: { icon: Sofa, label: 'Sofa' },
  table: { icon: Table2, label: 'Table' },
  archive: { icon: Archive, label: 'Cabinet' },
  shirt: { icon: Shirt, label: 'Linen' },
  bath: { icon: Bath, label: 'Bath' },
  'shower-head': { icon: ShowerHead, label: 'Shower' },
  toilet: { icon: Toilet, label: 'Toilet' },
  trash: { icon: Trash2, label: 'Bin' },
  stethoscope: { icon: Stethoscope, label: 'Stethoscope' },
  'heart-pulse': { icon: HeartPulse, label: 'Monitor (vitals)' },
  activity: { icon: Activity, label: 'ECG' },
  thermometer: { icon: Thermometer, label: 'Thermometer' },
  syringe: { icon: Syringe, label: 'Syringe' },
  pill: { icon: Pill, label: 'Medicine' },
  bandage: { icon: Bandage, label: 'First aid' },
  scale: { icon: Scale, label: 'Scale' },
  accessibility: { icon: Accessibility, label: 'Wheelchair' },
  'fire-extinguisher': { icon: FireExtinguisher, label: 'Extinguisher' },
  key: { icon: Key, label: 'Key' },
  lock: { icon: Lock, label: 'Lock' },
  'door-open': { icon: DoorOpen, label: 'Door' },
  wrench: { icon: Wrench, label: 'Tool' },
  box: { icon: Box, label: 'Box' },
  package: { icon: Package, label: 'Other' },
};

export function InventoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = (name && INVENTORY_ICONS[name]?.icon) || Package;
  return <Icon className={cn('size-4', className)} aria-hidden />;
}

/** Item image (if any) with the icon as fallback. */
export function InventoryItemVisual({
  itemId,
  icon,
  hasImage,
  imageVersion,
  className,
  iconClassName,
}: {
  itemId: string;
  icon: string | null | undefined;
  hasImage: boolean;
  imageVersion?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground',
        className ?? 'size-9'
      )}
    >
      {hasImage && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/inventory-images/${itemId}?size=thumb&v=${encodeURIComponent(imageVersion ?? '')}`}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <InventoryIcon name={icon} className={iconClassName ?? 'size-5'} />
      )}
    </span>
  );
}

export function InventoryIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = value ? INVENTORY_ICONS[value] : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="justify-start gap-2" disabled={disabled}>
          <InventoryIcon name={value} />
          <span className="truncate">{current?.label ?? 'Choose icon'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid max-h-72 grid-cols-6 gap-1 overflow-y-auto">
          {Object.entries(INVENTORY_ICONS).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md border border-transparent hover:bg-accent',
                value === key && 'border-primary bg-primary/10 text-primary'
              )}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Clear icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
