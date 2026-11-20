// Shapes returned by channeling /api/management/room-inventory/*.
// Kept in sync with apps/channeling/types/inventory.ts.

export const INVENTORY_CONDITION = {
  available: 0,
  underRepair: 1,
  broken: 2,
  disposed: 3,
} as const;

export const INVENTORY_CONDITION_OPTIONS = [
  { value: 0, label: 'Available', dotClass: 'bg-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 1, label: 'Under repair', dotClass: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 2, label: 'Broken', dotClass: 'bg-red-500', badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  { value: 3, label: 'Disposed', dotClass: 'bg-zinc-400', badgeClass: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
] as const;

export function conditionMeta(value: number) {
  return INVENTORY_CONDITION_OPTIONS.find((o) => o.value === value) ?? INVENTORY_CONDITION_OPTIONS[0];
}

export type OptionRow = { id: string; name: string };

export type RoomRow = {
  id: string;
  number: string;
  description: string;
  zoneId: string | null;
  zoneName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  locationId: string | null;
};

export type UnitRow = {
  id: string;
  assetTag: string;
  serialNo: string | null;
  notes: string | null;
  condition: number;
  itemId: string;
  itemName: string;
  itemSku: string;
  itemIcon: string | null;
  itemHasImage: boolean;
  itemImageVersion: string | null;
  roomId: string | null;
  roomNumber: string | null;
  zoneId: string | null;
  zoneName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  locationId: string | null;
  locationName: string | null;
  assignedAt: string | null;
  updatedAt: string;
};

export type MovementRow = {
  id: string;
  createdAt: string;
  byName: string | null;
  fromRoom: string | null;
  toRoom: string | null;
  fromCondition: number | null;
  toCondition: number | null;
  note: string | null;
};

export type RoomInventoryData = {
  locationId: string | null;
  locations: OptionRow[];
  zones: (OptionRow & { locationId: string | null })[];
  departments: OptionRow[];
  rooms: RoomRow[];
  units: UnitRow[];
  can: { assign: boolean; condition: boolean };
};

export type RoomInventoryResult<T> =
  | { success: true; data: T }
  | { success: false; errorCode: string; message: string };
