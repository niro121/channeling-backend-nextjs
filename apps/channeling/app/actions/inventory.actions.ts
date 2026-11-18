'use server';

import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { ZodError } from 'zod';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  deleteBillAttachmentObject,
  getBillAttachmentThumbKey,
  getInventoryImageObjectKey,
  putBillAttachmentObject,
} from '@/lib/s3';
import {
  InventoryError,
  createInventoryItem,
  createInventoryUnits,
  deleteInventoryCategory,
  deleteInventoryItem,
  deleteInventoryUnits,
  getInventoryItemImageKeys,
  listInventoryUnitHistory,
  moveInventoryUnits,
  saveInventoryCategory,
  setInventoryItemImage,
  setInventoryUnitsCondition,
  updateInventoryItem,
  updateInventoryUnit,
} from '@/services/inventory.service';
import {
  INVENTORY_IMAGE_CONTENT_TYPES,
  INVENTORY_IMAGE_MAX_BYTES,
  inventoryConditionMeta,
  type ActionResult,
  type InventoryItemInput,
  type InventoryMovementRow,
  type InventoryUnitInput,
} from '@/types/inventory';

type Resource = 'inventory' | 'room-inventory';

/** Signed-in user id, after checking the privilege. Throws InventoryError when denied. */
async function requireUser(resource: Resource, action: string): Promise<string> {
  const session = await fetchServerSession();
  const userId = session?.user?.id;
  if (!userId) throw new InventoryError('Please sign in again.');
  if (!(await checkPermission(resource, action))) {
    throw new InventoryError(`You don't have permission to ${action} ${resource.replace('-', ' ')}.`);
  }
  return userId;
}

/** Either privilege lets you view; the board reads the same data. */
async function requireViewer(): Promise<string> {
  const session = await fetchServerSession();
  const userId = session?.user?.id;
  if (!userId) throw new InventoryError('Please sign in again.');
  const ok =
    (await checkPermission('inventory', 'view')) || (await checkPermission('room-inventory', 'view'));
  if (!ok) throw new InventoryError("You don't have permission to view inventory.");
  return userId;
}

function failure(error: unknown): ActionResult<never> {
  if (error instanceof InventoryError) return { success: false, message: error.message };
  if (error instanceof ZodError) {
    return { success: false, message: error.issues[0]?.message ?? 'Invalid input' };
  }
  console.error('[inventory] action failed', error);
  return { success: false, message: 'Something went wrong. Please try again.' };
}

function revalidateInventory() {
  revalidatePath('/inventory');
  revalidatePath('/room-inventory');
}

// ==== READS ==== //

export async function getInventoryUnitHistory(
  unitId: string
): Promise<ActionResult<InventoryMovementRow[]>> {
  try {
    await requireViewer();
    return { success: true, data: await listInventoryUnitHistory(unitId) };
  } catch (e) {
    return failure(e);
  }
}

// ==== CATEGORIES ==== //

export async function saveInventoryCategoryAction(input: {
  id?: string | null;
  name: string;
  icon?: string | null;
}): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', input.id ? 'edit' : 'add');
    const row = await saveInventoryCategory(input, userId);
    logActivityNonBlocking({
      userId,
      action: input.id ? 'inventory.category.updated' : 'inventory.category.created',
      entityType: 'InventoryCategory',
      entityId: row.id,
      importance: 'medium',
      metadata: { name: row.name },
    });
    revalidateInventory();
    return { success: true, message: input.id ? 'Category updated' : 'Category added' };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteInventoryCategoryAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', 'delete');
    await deleteInventoryCategory(id);
    logActivityNonBlocking({
      userId,
      action: 'inventory.category.deleted',
      entityType: 'InventoryCategory',
      entityId: id,
      importance: 'medium',
    });
    revalidateInventory();
    return { success: true, message: 'Category deleted' };
  } catch (e) {
    return failure(e);
  }
}

// ==== ITEMS ==== //

export async function saveInventoryItemAction(
  id: string | null,
  input: InventoryItemInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUser('inventory', id ? 'edit' : 'add');
    const item = id
      ? await updateInventoryItem(id, input, userId)
      : await createInventoryItem(input, userId);
    logActivityNonBlocking({
      userId,
      action: id ? 'inventory.item.updated' : 'inventory.item.created',
      entityType: 'InventoryItem',
      entityId: item.id,
      importance: 'high',
      metadata: { name: item.name, sku: item.sku, initialUnits: id ? undefined : input.initialUnits },
    });
    revalidateInventory();
    return { success: true, data: { id: item.id }, message: id ? 'Item updated' : 'Item added' };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', 'delete');
    const keys = await deleteInventoryItem(id);
    await Promise.allSettled(keys.map((k) => deleteBillAttachmentObject(k)));
    logActivityNonBlocking({
      userId,
      action: 'inventory.item.deleted',
      entityType: 'InventoryItem',
      entityId: id,
      importance: 'high',
    });
    revalidateInventory();
    return { success: true, message: 'Item and its units deleted' };
  } catch (e) {
    return failure(e);
  }
}

/** FormData: itemId, file (jpeg/png/webp). Stores a 1200px webp plus a 240px thumbnail. */
export async function uploadInventoryItemImageAction(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', 'edit');
    const itemId = String(formData.get('itemId') ?? '');
    const file = formData.get('file');
    if (!(file instanceof File)) throw new InventoryError('Choose an image to upload.');
    if (!INVENTORY_IMAGE_CONTENT_TYPES.includes(file.type)) {
      throw new InventoryError('Image must be JPG, PNG or WebP.');
    }
    if (file.size > INVENTORY_IMAGE_MAX_BYTES) throw new InventoryError('Image must be 8 MB or smaller.');

    const previous = await getInventoryItemImageKeys(itemId);
    if (!previous) throw new InventoryError('Item not found.');

    const input = Buffer.from(await file.arrayBuffer());
    const [full, thumb] = await Promise.all([
      sharp(input).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
      sharp(input).rotate().resize({ width: 240, height: 240, fit: 'cover' }).webp({ quality: 75 }).toBuffer(),
    ]);
    const key = getInventoryImageObjectKey(itemId, crypto.randomUUID(), 'webp');
    const thumbKey = getBillAttachmentThumbKey(key);
    await Promise.all([
      putBillAttachmentObject(key, full, 'image/webp'),
      putBillAttachmentObject(thumbKey, thumb, 'image/webp'),
    ]);
    await setInventoryItemImage(itemId, { imageS3Key: key, imageThumbS3Key: thumbKey }, userId);
    await Promise.allSettled(
      [previous.imageS3Key, previous.imageThumbS3Key]
        .filter((k): k is string => Boolean(k))
        .map((k) => deleteBillAttachmentObject(k))
    );
    logActivityNonBlocking({
      userId,
      action: 'inventory.item.updated',
      entityType: 'InventoryItem',
      entityId: itemId,
      importance: 'low',
      metadata: { image: 'uploaded' },
    });
    revalidateInventory();
    return { success: true, message: 'Image uploaded' };
  } catch (e) {
    return failure(e);
  }
}

export async function removeInventoryItemImageAction(itemId: string): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', 'edit');
    const previous = await getInventoryItemImageKeys(itemId);
    if (!previous) throw new InventoryError('Item not found.');
    await setInventoryItemImage(itemId, { imageS3Key: null, imageThumbS3Key: null }, userId);
    await Promise.allSettled(
      [previous.imageS3Key, previous.imageThumbS3Key]
        .filter((k): k is string => Boolean(k))
        .map((k) => deleteBillAttachmentObject(k))
    );
    revalidateInventory();
    return { success: true, message: 'Image removed' };
  } catch (e) {
    return failure(e);
  }
}

// ==== UNITS ==== //

export async function addInventoryUnitsAction(input: {
  itemId: string;
  count: number;
  locationId?: string | null;
}): Promise<ActionResult<string[]>> {
  try {
    const userId = await requireUser('inventory', 'add');
    const tags = await createInventoryUnits(input, userId);
    logActivityNonBlocking({
      userId,
      action: 'inventory.unit.created',
      entityType: 'InventoryItem',
      entityId: input.itemId,
      importance: 'medium',
      metadata: { count: tags.length, from: tags[0], to: tags[tags.length - 1] },
    });
    revalidateInventory();
    return { success: true, data: tags, message: `Added ${tags.length} unit${tags.length === 1 ? '' : 's'}` };
  } catch (e) {
    return failure(e);
  }
}

export async function updateInventoryUnitAction(
  id: string,
  input: Omit<InventoryUnitInput, 'itemId'> & { conditionNote?: string | null }
): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', 'edit');
    const result = await updateInventoryUnit(id, input, userId);
    logActivityNonBlocking({
      userId,
      action: result.conditionChanged ? 'inventory.unit.conditionChanged' : 'inventory.unit.updated',
      entityType: 'InventoryUnit',
      entityId: id,
      importance: result.conditionChanged ? 'medium' : 'low',
      metadata: result.conditionChanged
        ? {
            from: inventoryConditionMeta(result.from).label,
            to: inventoryConditionMeta(result.to).label,
          }
        : undefined,
    });
    revalidateInventory();
    return { success: true, message: 'Unit updated' };
  } catch (e) {
    return failure(e);
  }
}

/** Condition changes are allowed from either page (staff on the board report broken items). */
export async function setInventoryUnitsConditionAction(
  unitIds: string[],
  condition: number,
  note?: string | null
): Promise<ActionResult> {
  try {
    const session = await fetchServerSession();
    const userId = session?.user?.id;
    if (!userId) throw new InventoryError('Please sign in again.');
    const ok =
      (await checkPermission('inventory', 'edit')) || (await checkPermission('room-inventory', 'assign'));
    if (!ok) throw new InventoryError("You don't have permission to change item condition.");
    const changed = await setInventoryUnitsCondition(unitIds, condition, note, userId);
    logActivityNonBlocking({
      userId,
      action: 'inventory.unit.conditionChanged',
      entityType: 'InventoryUnit',
      entityId: unitIds.length === 1 ? unitIds[0] : undefined,
      importance: 'medium',
      metadata: { count: changed, to: inventoryConditionMeta(condition).label },
    });
    revalidateInventory();
    return { success: true, message: changed ? `Marked ${changed} as ${inventoryConditionMeta(condition).label}` : 'No change' };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteInventoryUnitsAction(unitIds: string[]): Promise<ActionResult> {
  try {
    const userId = await requireUser('inventory', 'delete');
    const count = await deleteInventoryUnits(unitIds);
    logActivityNonBlocking({
      userId,
      action: 'inventory.unit.deleted',
      entityType: 'InventoryUnit',
      importance: 'high',
      metadata: { count },
    });
    revalidateInventory();
    return { success: true, message: `Deleted ${count} unit${count === 1 ? '' : 's'}` };
  } catch (e) {
    return failure(e);
  }
}

export async function moveInventoryUnitsAction(input: {
  unitIds: string[];
  toRoomId: string | null;
  storeLocationId?: string | null;
  note?: string | null;
}): Promise<ActionResult<{ moved: number }>> {
  try {
    const userId = await requireUser('room-inventory', 'assign');
    const moved = await moveInventoryUnits(input, userId);
    logActivityNonBlocking({
      userId,
      action: 'inventory.unit.moved',
      entityType: 'InventoryUnit',
      entityId: input.unitIds.length === 1 ? input.unitIds[0] : undefined,
      importance: 'medium',
      metadata: { count: moved, toRoomId: input.toRoomId ?? 'store' },
    });
    revalidateInventory();
    return { success: true, data: { moved } };
  } catch (e) {
    return failure(e);
  }
}
