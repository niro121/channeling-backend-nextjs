import 'server-only';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  INVENTORY_CONDITION,
  isInventoryCondition,
  type InventoryCategoryRow,
  type InventoryItemInput,
  type InventoryItemRow,
  type InventoryMovementRow,
  type InventoryRoomRow,
  type InventoryUnitInput,
  type InventoryUnitRow,
  type OptionRow,
} from '@/types/inventory';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const optionalId = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || /^[a-f0-9]{24}$/i.test(v), 'Invalid id');
const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));

export class InventoryError extends Error {}

function normalizeSku(sku: string) {
  return sku.trim().toUpperCase().replace(/\s+/g, '-');
}

// ==== OPTIONS ==== //

export async function listInventoryOptions(): Promise<{
  locations: OptionRow[];
  zones: (OptionRow & { locationId: string | null })[];
  departments: OptionRow[];
}> {
  const [locations, zones, departments] = await Promise.all([
    prisma.location.findMany({
      where: { status: 1 },
      select: { id: true, name: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    }),
    prisma.zone.findMany({
      select: { id: true, name: true, locationId: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where: { status: 1 },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  return { locations, zones, departments };
}

// ==== CATEGORIES ==== //

export async function listInventoryCategories(): Promise<InventoryCategoryRow[]> {
  const rows = await prisma.inventoryCategory.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, icon: true, _count: { select: { items: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, itemCount: r._count.items }));
}

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  icon: optionalText(40),
});

export async function saveInventoryCategory(
  input: { id?: string | null; name: string; icon?: string | null },
  userId: string
) {
  const data = categorySchema.parse(input);
  if (input.id) {
    objectId.parse(input.id);
    return prisma.inventoryCategory.update({
      where: { id: input.id },
      data: { ...data, updatedBy: userId },
    });
  }
  return prisma.inventoryCategory.create({
    data: { ...data, status: 1, createdBy: userId, updatedBy: userId },
  });
}

export async function deleteInventoryCategory(id: string) {
  objectId.parse(id);
  // Items keep existing; their categoryId is cleared.
  await prisma.inventoryItem.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.inventoryCategory.delete({ where: { id } });
}

// ==== ITEMS ==== //

export async function listInventoryItems(): Promise<InventoryItemRow[]> {
  const [items, grouped, inRooms] = await Promise.all([
    prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    }),
    prisma.inventoryUnit.groupBy({
      by: ['itemId', 'condition'],
      _count: { _all: true },
    }),
    prisma.inventoryUnit.groupBy({
      by: ['itemId'],
      where: { roomId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countsByItem = new Map<string, InventoryItemRow['counts']>();
  for (const g of grouped) {
    const c = countsByItem.get(g.itemId) ?? { total: 0, inRooms: 0, byCondition: {} };
    c.total += g._count._all;
    c.byCondition[g.condition] = (c.byCondition[g.condition] ?? 0) + g._count._all;
    countsByItem.set(g.itemId, c);
  }
  for (const g of inRooms) {
    const c = countsByItem.get(g.itemId);
    if (c) c.inRooms = g._count._all;
  }

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    description: i.description,
    icon: i.icon,
    hasImage: Boolean(i.imageS3Key),
    imageVersion: i.imageS3Key ? i.updatedAt.toISOString() : null,
    status: i.status,
    categoryId: i.categoryId,
    categoryName: i.category?.name ?? null,
    counts: countsByItem.get(i.id) ?? { total: 0, inRooms: 0, byCondition: {} },
  }));
}

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(40)
    .transform(normalizeSku)
    .refine((v) => /^[A-Z0-9._-]+$/.test(v), 'SKU may only use letters, numbers, - _ .'),
  description: optionalText(500),
  icon: optionalText(40),
  categoryId: optionalId,
  status: z.number().int().min(0).max(1).default(1),
  initialUnits: z.number().int().min(0).max(500).default(0),
  initialLocationId: optionalId,
});

async function assertSkuFree(sku: string, exceptId?: string) {
  const clash = await prisma.inventoryItem.findFirst({
    where: { sku, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new InventoryError(`SKU ${sku} is already used by another item.`);
}

export async function createInventoryItem(input: InventoryItemInput, userId: string) {
  const data = itemSchema.parse(input);
  await assertSkuFree(data.sku);
  const item = await prisma.inventoryItem.create({
    data: {
      name: data.name,
      sku: data.sku,
      description: data.description,
      icon: data.icon,
      categoryId: data.categoryId,
      status: data.status,
      createdBy: userId,
      updatedBy: userId,
    },
  });
  if (data.initialUnits > 0) {
    await createInventoryUnits(
      { itemId: item.id, count: data.initialUnits, locationId: data.initialLocationId },
      userId
    );
  }
  return item;
}

export async function updateInventoryItem(id: string, input: InventoryItemInput, userId: string) {
  objectId.parse(id);
  const data = itemSchema.parse(input);
  const existing = await prisma.inventoryItem.findUnique({ where: { id }, select: { sku: true } });
  if (!existing) throw new InventoryError('Item not found.');
  if (existing.sku !== data.sku) await assertSkuFree(data.sku, id);
  return prisma.inventoryItem.update({
    where: { id },
    data: {
      name: data.name,
      sku: data.sku,
      description: data.description,
      icon: data.icon,
      categoryId: data.categoryId,
      status: data.status,
      updatedBy: userId,
    },
  });
}

/** Deletes the item and all its units. Returns S3 keys the caller should clean up. */
export async function deleteInventoryItem(id: string): Promise<string[]> {
  objectId.parse(id);
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    select: { imageS3Key: true, imageThumbS3Key: true },
  });
  if (!item) throw new InventoryError('Item not found.');
  const unitIds = (
    await prisma.inventoryUnit.findMany({ where: { itemId: id }, select: { id: true } })
  ).map((u) => u.id);
  await prisma.$transaction([
    prisma.inventoryMovement.deleteMany({ where: { unitId: { in: unitIds } } }),
    prisma.inventoryUnit.deleteMany({ where: { itemId: id } }),
    prisma.inventoryItem.delete({ where: { id } }),
  ]);
  return [item.imageS3Key, item.imageThumbS3Key].filter((k): k is string => Boolean(k));
}

export async function getInventoryItemImageKeys(id: string) {
  objectId.parse(id);
  return prisma.inventoryItem.findUnique({
    where: { id },
    select: { imageS3Key: true, imageThumbS3Key: true },
  });
}

export async function setInventoryItemImage(
  id: string,
  keys: { imageS3Key: string | null; imageThumbS3Key: string | null },
  userId: string
) {
  objectId.parse(id);
  return prisma.inventoryItem.update({ where: { id }, data: { ...keys, updatedBy: userId } });
}

// ==== UNITS ==== //

const unitInclude = {
  item: { select: { name: true, sku: true, icon: true, imageS3Key: true, updatedAt: true } },
  location: { select: { name: true } },
  room: {
    select: {
      number: true,
      zoneId: true,
      departmentId: true,
      locationId: true,
      zone: { select: { name: true } },
      department: { select: { name: true } },
      location: { select: { name: true } },
    },
  },
} satisfies Prisma.InventoryUnitInclude;

type UnitWithRefs = Prisma.InventoryUnitGetPayload<{ include: typeof unitInclude }>;

function toUnitRow(u: UnitWithRefs): InventoryUnitRow {
  const locationId = u.room?.locationId ?? u.locationId;
  return {
    id: u.id,
    assetTag: u.assetTag,
    serialNo: u.serialNo,
    notes: u.notes,
    condition: u.condition,
    itemId: u.itemId,
    itemName: u.item.name,
    itemSku: u.item.sku,
    itemIcon: u.item.icon,
    itemHasImage: Boolean(u.item.imageS3Key),
    itemImageVersion: u.item.imageS3Key ? u.item.updatedAt.toISOString() : null,
    roomId: u.roomId,
    roomNumber: u.room?.number ?? null,
    zoneId: u.room?.zoneId ?? null,
    zoneName: u.room?.zone?.name ?? null,
    departmentId: u.room?.departmentId ?? null,
    departmentName: u.room?.department?.name ?? null,
    locationId: locationId ?? null,
    locationName: u.room?.location?.name ?? u.location?.name ?? null,
    assignedAt: u.assignedAt ? u.assignedAt.toISOString() : null,
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function listInventoryUnits(filter?: {
  itemId?: string;
  locationId?: string;
}): Promise<InventoryUnitRow[]> {
  const where: Prisma.InventoryUnitWhereInput = {};
  if (filter?.itemId) where.itemId = objectId.parse(filter.itemId);
  if (filter?.locationId) {
    const loc = objectId.parse(filter.locationId);
    where.OR = [{ locationId: loc }, { room: { is: { locationId: loc } } }];
  }
  const units = await prisma.inventoryUnit.findMany({
    where,
    include: unitInclude,
    orderBy: { assetTag: 'asc' },
  });
  return units.map(toUnitRow);
}

/** Next free asset tags for an item: SKU-0001, SKU-0002, ... */
async function nextAssetTags(sku: string, count: number): Promise<string[]> {
  const prefix = `${sku}-`;
  const existing = await prisma.inventoryUnit.findMany({
    where: { assetTag: { startsWith: prefix } },
    select: { assetTag: true },
  });
  let max = 0;
  for (const { assetTag } of existing) {
    const n = Number.parseInt(assetTag.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return Array.from({ length: count }, (_, i) => `${prefix}${String(max + i + 1).padStart(4, '0')}`);
}

export async function createInventoryUnits(
  input: { itemId: string; count: number; locationId?: string | null },
  userId: string
) {
  const itemId = objectId.parse(input.itemId);
  const count = z.number().int().min(1).max(500).parse(input.count);
  const locationId = optionalId.parse(input.locationId);
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId }, select: { sku: true } });
  if (!item) throw new InventoryError('Item not found.');
  const tags = await nextAssetTags(item.sku, count);
  await prisma.inventoryUnit.createMany({
    data: tags.map((assetTag) => ({
      itemId,
      assetTag,
      condition: INVENTORY_CONDITION.available,
      locationId,
      createdBy: userId,
      updatedBy: userId,
    })),
  });
  return tags;
}

const unitUpdateSchema = z.object({
  assetTag: z.string().trim().min(1, 'Asset tag is required').max(60).transform((v) => v.toUpperCase()),
  serialNo: optionalText(80),
  notes: optionalText(500),
  condition: z.number().refine(isInventoryCondition, 'Invalid condition'),
  locationId: optionalId,
});

export async function updateInventoryUnit(
  id: string,
  input: Omit<InventoryUnitInput, 'itemId'> & { conditionNote?: string | null },
  userId: string
) {
  objectId.parse(id);
  const data = unitUpdateSchema.parse(input);
  const existing = await prisma.inventoryUnit.findUnique({
    where: { id },
    select: { assetTag: true, condition: true, roomId: true, locationId: true },
  });
  if (!existing) throw new InventoryError('Unit not found.');
  if (existing.assetTag !== data.assetTag) {
    const clash = await prisma.inventoryUnit.findFirst({
      where: { assetTag: data.assetTag, id: { not: id } },
      select: { id: true },
    });
    if (clash) throw new InventoryError(`Asset tag ${data.assetTag} is already used.`);
  }
  const conditionChanged = existing.condition !== data.condition;
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.inventoryUnit.update({
      where: { id },
      data: {
        assetTag: data.assetTag,
        serialNo: data.serialNo,
        notes: data.notes,
        condition: data.condition,
        // Branch is only editable while in store; in a room it follows the room.
        ...(existing.roomId ? {} : { locationId: data.locationId }),
        updatedBy: userId,
      },
    }),
  ];
  if (conditionChanged) {
    ops.push(
      prisma.inventoryMovement.create({
        data: {
          unitId: id,
          fromRoomId: existing.roomId,
          toRoomId: existing.roomId,
          fromCondition: existing.condition,
          toCondition: data.condition,
          note: optionalText(300).parse(input.conditionNote),
          createdBy: userId,
        },
      })
    );
  }
  await prisma.$transaction(ops);
  return { conditionChanged, from: existing.condition, to: data.condition };
}

export async function setInventoryUnitsCondition(
  unitIds: string[],
  condition: number,
  note: string | null | undefined,
  userId: string
) {
  const ids = z.array(objectId).min(1).max(500).parse(unitIds);
  if (!isInventoryCondition(condition)) throw new InventoryError('Invalid condition');
  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: ids }, condition: { not: condition } },
    select: { id: true, condition: true, roomId: true },
  });
  if (!units.length) return 0;
  const cleanNote = optionalText(300).parse(note);
  await prisma.$transaction([
    prisma.inventoryUnit.updateMany({
      where: { id: { in: units.map((u) => u.id) } },
      data: { condition, updatedBy: userId },
    }),
    prisma.inventoryMovement.createMany({
      data: units.map((u) => ({
        unitId: u.id,
        fromRoomId: u.roomId,
        toRoomId: u.roomId,
        fromCondition: u.condition,
        toCondition: condition,
        note: cleanNote,
        createdBy: userId,
      })),
    }),
  ]);
  return units.length;
}

export async function deleteInventoryUnits(unitIds: string[]) {
  const ids = z.array(objectId).min(1).max(500).parse(unitIds);
  await prisma.$transaction([
    prisma.inventoryMovement.deleteMany({ where: { unitId: { in: ids } } }),
    prisma.inventoryUnit.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
}

/**
 * Move units into a room, or back to store (toRoomId null).
 * Returning to store keeps the branch of the room the unit came from, unless storeLocationId is given.
 */
export async function moveInventoryUnits(
  input: { unitIds: string[]; toRoomId: string | null; storeLocationId?: string | null; note?: string | null },
  userId: string
) {
  const ids = z.array(objectId).min(1).max(500).parse(input.unitIds);
  const toRoomId = optionalId.parse(input.toRoomId);
  const storeLocationId = optionalId.parse(input.storeLocationId);
  const note = optionalText(300).parse(input.note);

  const room = toRoomId
    ? await prisma.room.findUnique({ where: { id: toRoomId }, select: { id: true, locationId: true } })
    : null;
  if (toRoomId && !room) throw new InventoryError('Room not found.');

  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      roomId: true,
      locationId: true,
      condition: true,
      room: { select: { locationId: true } },
    },
  });
  const moving = units.filter((u) => u.roomId !== toRoomId);
  if (!moving.length) return 0;
  if (room && moving.some((u) => u.condition === INVENTORY_CONDITION.disposed)) {
    throw new InventoryError('Disposed units cannot be placed in a room.');
  }

  const now = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (room) {
    ops.push(
      prisma.inventoryUnit.updateMany({
        where: { id: { in: moving.map((u) => u.id) } },
        data: { roomId: room.id, locationId: room.locationId, assignedAt: now, updatedBy: userId },
      })
    );
  } else {
    // Per unit, because each keeps its own branch when returning to store.
    for (const u of moving) {
      ops.push(
        prisma.inventoryUnit.update({
          where: { id: u.id },
          data: {
            roomId: null,
            locationId: storeLocationId ?? u.room?.locationId ?? u.locationId,
            assignedAt: null,
            updatedBy: userId,
          },
        })
      );
    }
  }
  ops.push(
    prisma.inventoryMovement.createMany({
      data: moving.map((u) => ({
        unitId: u.id,
        fromRoomId: u.roomId,
        toRoomId,
        note,
        createdBy: userId,
      })),
    })
  );
  await prisma.$transaction(ops);
  return moving.length;
}

export async function listInventoryUnitHistory(unitId: string): Promise<InventoryMovementRow[]> {
  objectId.parse(unitId);
  const rows = await prisma.inventoryMovement.findMany({
    where: { unitId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const roomIds = [
    ...new Set(rows.flatMap((r) => [r.fromRoomId, r.toRoomId]).filter((v): v is string => Boolean(v))),
  ];
  const userIds = [...new Set(rows.map((r) => r.createdBy).filter((v): v is string => Boolean(v)))];
  const [rooms, users] = await Promise.all([
    roomIds.length
      ? prisma.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, number: true } })
      : [],
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [],
  ]);
  const roomName = new Map(rooms.map((r) => [r.id, r.number]));
  const userName = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    byName: r.createdBy ? userName.get(r.createdBy) ?? null : null,
    fromRoom: r.fromRoomId ? roomName.get(r.fromRoomId) ?? 'Deleted room' : null,
    toRoom: r.toRoomId ? roomName.get(r.toRoomId) ?? 'Deleted room' : null,
    fromCondition: r.fromCondition,
    toCondition: r.toCondition,
    note: r.note,
  }));
}

// ==== ROOMS FOR THE BOARD ==== //

export async function listInventoryRooms(locationId?: string | null): Promise<InventoryRoomRow[]> {
  const loc = optionalId.parse(locationId);
  const rooms = await prisma.room.findMany({
    where: loc ? { locationId: loc } : {},
    select: {
      id: true,
      number: true,
      description: true,
      zoneId: true,
      departmentId: true,
      locationId: true,
      zone: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
  return rooms
    .map((r) => ({
      id: r.id,
      number: r.number,
      description: r.description,
      zoneId: r.zoneId,
      zoneName: r.zone?.name ?? null,
      departmentId: r.departmentId,
      departmentName: r.department?.name ?? null,
      locationId: r.locationId,
    }))
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}
