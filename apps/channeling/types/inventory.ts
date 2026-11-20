// ==== ROOM INVENTORY TYPES ==== //

export const INVENTORY_CONDITION = {
  available: 0,
  underRepair: 1,
  broken: 2,
  disposed: 3,
} as const;

export type InventoryCondition =
  (typeof INVENTORY_CONDITION)[keyof typeof INVENTORY_CONDITION];

export const INVENTORY_CONDITION_OPTIONS: {
  value: InventoryCondition;
  label: string;
  /** Tailwind classes for a badge. */
  badgeClass: string;
  /** Tailwind class for a small status dot. */
  dotClass: string;
}[] = [
  {
    value: 0,
    label: 'Available',
    badgeClass: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 1,
    label: 'Under repair',
    badgeClass: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  {
    value: 2,
    label: 'Broken',
    badgeClass: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  {
    value: 3,
    label: 'Disposed',
    badgeClass: 'bg-zinc-200 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
    dotClass: 'bg-zinc-400',
  },
];

export function inventoryConditionMeta(value: number | null | undefined) {
  return (
    INVENTORY_CONDITION_OPTIONS.find((o) => o.value === value) ??
    INVENTORY_CONDITION_OPTIONS[0]
  );
}

export function isInventoryCondition(value: unknown): value is InventoryCondition {
  return typeof value === 'number' && INVENTORY_CONDITION_OPTIONS.some((o) => o.value === value);
}

export const INVENTORY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const INVENTORY_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ==== ROW SHAPES SENT TO THE CLIENT ==== //

export type InventoryCategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  itemCount: number;
};

export type InventoryItemRow = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  icon: string | null;
  hasImage: boolean;
  /** Bumps when the image changes, so the browser refetches it. */
  imageVersion: string | null;
  status: number;
  categoryId: string | null;
  categoryName: string | null;
  /** Unit counts keyed by condition value, plus total and inRooms. */
  counts: { total: number; inRooms: number; byCondition: Record<number, number> };
};

export type InventoryUnitRow = {
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

export type InventoryMovementRow = {
  id: string;
  createdAt: string;
  byName: string | null;
  fromRoom: string | null;
  toRoom: string | null;
  fromCondition: number | null;
  toCondition: number | null;
  note: string | null;
};

export type InventoryRoomRow = {
  id: string;
  number: string;
  description: string;
  zoneId: string | null;
  zoneName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  locationId: string | null;
};

export type OptionRow = { id: string; name: string };

// ==== FORM PAYLOADS ==== //

export type InventoryItemInput = {
  name: string;
  sku: string;
  description?: string | null;
  icon?: string | null;
  categoryId?: string | null;
  status?: number;
  /** Create this many units straight away (create only). */
  initialUnits?: number;
  /** Branch the new units are stored at. */
  initialLocationId?: string | null;
};

export type InventoryUnitInput = {
  itemId: string;
  assetTag?: string | null;
  serialNo?: string | null;
  notes?: string | null;
  condition?: number;
  locationId?: string | null;
};

export type ActionResult<T = undefined> = {
  success: boolean;
  message?: string;
  data?: T;
};
