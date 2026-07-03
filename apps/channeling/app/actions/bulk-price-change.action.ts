'use server';

import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import {
  createBulkPriceChangeService,
  getBulkPriceChangeWithRulesService,
  listBulkPriceChangesService,
  addBulkPriceChangeRuleService,
  deleteBulkPriceChangeRuleService,
  bulkDeleteBulkPriceChangesService,
  preprocessBulkPriceChangeService,
  processBulkPriceChangeService
} from '@/services/bulk-price-change.service';
import type { BulkPriceChangeRule } from '@/types/bulk-price-change';

const BULK_PATH = '/doctor-sessions/bulk-price-change';

export async function listBulkPriceChanges() {
  await requirePermission('doctor-sessions', 'view');
  const res = await listBulkPriceChangesService();
  if (!res.success) return { success: false as const, data: [], error: res.error };
  return { success: true as const, data: res.data ?? [], error: undefined };
}

export async function createBulkPriceChange(name: string, feeTypeId: string) {
  await requirePermission('doctor-sessions', 'edit');
  const session = await fetchServerSession();
  const createdBy = session?.user?.id ?? null;
  const res = await createBulkPriceChangeService(name, feeTypeId, createdBy);
  if (!res.success) return { success: false as const, data: undefined, error: res.error };
  revalidatePath(BULK_PATH);
  revalidatePath('/doctor-sessions');
  return { success: true as const, data: res.data, error: undefined };
}

export async function getBulkPriceChange(bulkPriceChangeId: string) {
  await requirePermission('doctor-sessions', 'view');
  return getBulkPriceChangeWithRulesService(bulkPriceChangeId);
}

export async function addBulkPriceChangeRule(
  bulkPriceChangeId: string,
  rule: Omit<BulkPriceChangeRule, 'id' | 'bulkPriceChangeId'>
) {
  await requirePermission('doctor-sessions', 'edit');
  const res = await addBulkPriceChangeRuleService(bulkPriceChangeId, rule);
  if (res.success) revalidatePath(BULK_PATH);
  return res;
}

export async function deleteBulkPriceChangeRule(ruleId: string) {
  await requirePermission('doctor-sessions', 'edit');
  const res = await deleteBulkPriceChangeRuleService(ruleId);
  if (res.success) revalidatePath(BULK_PATH);
  return res;
}

export async function bulkDeleteBulkPriceChanges(ids: string[]): Promise<boolean> {
  await requirePermission('doctor-sessions', 'delete');
  const res = await bulkDeleteBulkPriceChangesService(ids);
  if (res.success) revalidatePath(BULK_PATH);
  return res.success;
}

export async function preprocessBulkPriceChange(bulkPriceChangeId: string) {
  await requirePermission('doctor-sessions', 'view');
  return preprocessBulkPriceChangeService(bulkPriceChangeId);
}

export async function processBulkPriceChange(bulkPriceChangeId: string) {
  await requirePermission('doctor-sessions', 'edit');
  const res = await processBulkPriceChangeService(bulkPriceChangeId);
  if (res.success) {
    revalidatePath(BULK_PATH);
    revalidatePath('/doctor-sessions');
  }
  return res;
}
