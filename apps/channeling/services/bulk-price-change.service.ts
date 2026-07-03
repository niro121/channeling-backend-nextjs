'use server';

import prisma from '@/lib/prisma';
import type {
  BulkPriceChangeRule,
  BulkPriceChangePreviewRow,
  BulkPriceChangeResultRow
} from '@/types/bulk-price-change';

type FeeEntry = { id: string; name?: string; feeType?: string; localFee: number; foreignFee: number };

function parseFees(fees: unknown): FeeEntry[] {
  if (!Array.isArray(fees)) return [];
  return fees.map((f: any) => ({
    id: String(f?.id ?? ''),
    name: f?.name,
    feeType: f?.feeType,
    localFee: Number(f?.localFee) || 0,
    foreignFee: Number(f?.foreignFee) || 0
  }));
}

function matchRule(
  localFee: number,
  rule: {
    localFeeOp: string;
    localFeeValue: number;
    localFeeMin?: number | null;
    localFeeMax?: number | null;
  }
): boolean {
  const min = rule.localFeeMin;
  const max = rule.localFeeMax;
  if (min != null && max != null) {
    return localFee >= min && localFee <= max;
  }
  const v = rule.localFeeValue;
  switch (rule.localFeeOp) {
    case 'gt':
      return localFee > v;
    case 'gte':
      return localFee >= v;
    case 'lt':
      return localFee < v;
    case 'lte':
      return localFee <= v;
    case 'eq':
      return localFee === v;
    default:
      return false;
  }
}

/** Get all doctor sessions with id, name, fees, doctor name for bulk evaluation.
 * Optimized for 20+ doctors × 10+ sessions: single query, minimal fields, ordered by doctor for grouping. */
export async function getAllDoctorSessionsForBulkService(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    fees: FeeEntry[];
    doctorName?: string;
  }>;
  error?: { message: string };
}> {
  try {
    const records = await prisma.doctorSession.findMany({
      select: {
        id: true,
        name: true,
        fees: true,
        doctor: { select: { name: true } }
      },
      orderBy: [{ doctor: { name: 'asc' } }, { name: 'asc' }]
    });
    const data = records.map((r) => ({
      id: r.id,
      name: r.name,
      fees: parseFees(r.fees),
      doctorName: r.doctor?.name
    }));
    return { success: true, data };
  } catch (e: any) {
    console.error('getAllDoctorSessionsForBulkService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to fetch sessions' } };
  }
}

/** Create a bulk price change record (DRAFT) */
export async function createBulkPriceChangeService(
  name: string,
  feeTypeId: string,
  createdBy?: string | null
): Promise<{
  success: boolean;
  data?: { id: string };
  error?: { message: string };
}> {
  try {
    const record = await prisma.doctorSessionBulkPriceChange.create({
      data: {
        name: name.trim(),
        feeTypeId,
        status: 'DRAFT',
        createdBy: createdBy || undefined
      }
    });
    return { success: true, data: { id: record.id } };
  } catch (e: any) {
    console.error('createBulkPriceChangeService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to create' } };
  }
}

/** Get one bulk price change with rules (and optional results) */
export async function getBulkPriceChangeWithRulesService(
  id: string
): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    feeTypeId: string;
    status: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    rules: BulkPriceChangeRule[];
    results?: BulkPriceChangeResultRow[];
  };
  error?: { message: string };
}> {
  try {
    const record = await prisma.doctorSessionBulkPriceChange.findUnique({
      where: { id },
      include: {
        rules: { orderBy: { order: 'asc' } },
        results: { orderBy: { processedAt: 'asc' } }
      }
    });
    if (!record) return { success: false, error: { message: 'Bulk price change not found' } };
    const rules: BulkPriceChangeRule[] = record.rules.map((r) => ({
      id: r.id,
      bulkPriceChangeId: r.bulkPriceChangeId,
      localFeeOp: r.localFeeOp as BulkPriceChangeRule['localFeeOp'],
      localFeeValue: r.localFeeValue,
      localFeeMin: r.localFeeMin ?? undefined,
      localFeeMax: r.localFeeMax ?? undefined,
      newLocalFee: r.newLocalFee,
      newForeignFee: r.newForeignFee,
      order: r.order
    }));
    const results: BulkPriceChangeResultRow[] | undefined = record.results?.map((r) => ({
      id: r.id,
      doctorSessionId: r.doctorSessionId,
      sessionName: r.sessionName ?? undefined,
      doctorName: r.doctorName ?? undefined,
      oldLocalFee: r.oldLocalFee,
      oldForeignFee: r.oldForeignFee,
      newLocalFee: r.newLocalFee,
      newForeignFee: r.newForeignFee,
      processedAt: r.processedAt
    }));
    return {
      success: true,
      data: {
        id: record.id,
        name: record.name,
        feeTypeId: record.feeTypeId,
        status: record.status,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        rules,
        results
      }
    };
  } catch (e: any) {
    console.error('getBulkPriceChangeWithRulesService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to fetch' } };
  }
}

/** List all bulk price changes */
export async function listBulkPriceChangesService(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    feeTypeId: string;
    status: string;
    createdAt: Date;
  }>;
  error?: { message: string };
}> {
  try {
    const list = await prisma.doctorSessionBulkPriceChange.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, feeTypeId: true, status: true, createdAt: true }
    });
    return { success: true, data: list };
  } catch (e: any) {
    console.error('listBulkPriceChangesService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to list' } };
  }
}

/** Add a rule to a bulk price change */
export async function addBulkPriceChangeRuleService(
  bulkPriceChangeId: string,
  rule: Omit<BulkPriceChangeRule, 'id' | 'bulkPriceChangeId'>
): Promise<{ success: boolean; data?: { id: string }; error?: { message: string } }> {
  try {
    const count = await prisma.doctorSessionBulkPriceChangeRule.count({
      where: { bulkPriceChangeId }
    });
    const isRange = rule.localFeeMin != null && rule.localFeeMax != null;
    const created = await prisma.doctorSessionBulkPriceChangeRule.create({
      data: {
        bulkPriceChangeId,
        localFeeOp: isRange ? 'range' : rule.localFeeOp,
        localFeeValue: isRange ? (rule.localFeeMin ?? 0) : rule.localFeeValue,
        localFeeMin: rule.localFeeMin ?? undefined,
        localFeeMax: rule.localFeeMax ?? undefined,
        newLocalFee: rule.newLocalFee,
        newForeignFee: rule.newForeignFee,
        order: rule.order ?? count
      }
    });
    return { success: true, data: { id: created.id } };
  } catch (e: any) {
    console.error('addBulkPriceChangeRuleService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to add rule' } };
  }
}

/** Delete a rule */
export async function deleteBulkPriceChangeRuleService(
  ruleId: string
): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    await prisma.doctorSessionBulkPriceChangeRule.delete({ where: { id: ruleId } });
    return { success: true };
  } catch (e: any) {
    console.error('deleteBulkPriceChangeRuleService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to delete rule' } };
  }
}

/** Delete bulk price change record(s) by id (cascade deletes rules and results) */
export async function bulkDeleteBulkPriceChangesService(
  ids: string[]
): Promise<{ success: boolean; error?: { message: string } }> {
  if (!ids?.length) return { success: true };
  try {
    await prisma.doctorSessionBulkPriceChange.deleteMany({
      where: { id: { in: ids } }
    });
    return { success: true };
  } catch (e: any) {
    console.error('bulkDeleteBulkPriceChangesService error:', e);
    return { success: false, error: { message: e?.message || 'Failed to delete' } };
  }
}

/** Preprocess: return preview of what would change (no DB writes).
 * Single pass over sessions, O(sessions × rules). Handles 20+ doctors × 10 sessions (200+) efficiently. */
export async function preprocessBulkPriceChangeService(
  bulkPriceChangeId: string
): Promise<{
  success: boolean;
  data?: BulkPriceChangePreviewRow[];
  error?: { message: string };
}> {
  try {
    const bulk = await prisma.doctorSessionBulkPriceChange.findUnique({
      where: { id: bulkPriceChangeId },
      include: { rules: { orderBy: { order: 'asc' } } }
    });
    if (!bulk) return { success: false, error: { message: 'Bulk price change not found' } };
    if (bulk.rules.length === 0) return { success: true, data: [] };

    const sessionsRes = await getAllDoctorSessionsForBulkService();
    if (!sessionsRes.success || !sessionsRes.data) return { success: false, error: { message: 'Failed to load sessions' } };

    const { rules } = bulk;
    const preview: BulkPriceChangePreviewRow[] = [];
    for (const session of sessionsRes.data) {
      const fee = session.fees.find((f) => f.id === bulk.feeTypeId);
      if (!fee) continue;
      let matchedRule = null;
      for (let i = 0; i < rules.length; i++) {
        if (matchRule(fee.localFee, rules[i])) {
          matchedRule = rules[i];
          break;
        }
      }
      if (!matchedRule) continue;
      preview.push({
        doctorSessionId: session.id,
        sessionName: session.name,
        doctorName: session.doctorName,
        currentLocalFee: fee.localFee,
        currentForeignFee: fee.foreignFee,
        newLocalFee: matchedRule.newLocalFee,
        newForeignFee: matchedRule.newForeignFee
      });
    }
    return { success: true, data: preview };
  } catch (e: any) {
    console.error('preprocessBulkPriceChangeService error:', e);
    return { success: false, error: { message: e?.message || 'Preprocess failed' } };
  }
}

/** Process: apply changes to doctor sessions and save result report */
export async function processBulkPriceChangeService(
  bulkPriceChangeId: string
): Promise<{
  success: boolean;
  data?: { updated: number; results: BulkPriceChangeResultRow[] };
  error?: { message: string };
}> {
  try {
    const bulk = await prisma.doctorSessionBulkPriceChange.findUnique({
      where: { id: bulkPriceChangeId },
      include: { rules: { orderBy: { order: 'asc' } } }
    });
    if (!bulk) return { success: false, error: { message: 'Bulk price change not found' } };
    if (bulk.status === 'PROCESSED') return { success: false, error: { message: 'Already processed' } };
    if (bulk.rules.length === 0) return { success: false, error: { message: 'No rules defined' } };

    const sessionsRes = await getAllDoctorSessionsForBulkService();
    if (!sessionsRes.success || !sessionsRes.data) return { success: false, error: { message: 'Failed to load sessions' } };

    const { rules } = bulk;
    const toUpdate: BulkPriceChangePreviewRow[] = [];
    for (const session of sessionsRes.data) {
      const fee = session.fees.find((f) => f.id === bulk.feeTypeId);
      if (!fee) continue;
      let matchedRule = null;
      for (let i = 0; i < rules.length; i++) {
        if (matchRule(fee.localFee, rules[i])) {
          matchedRule = rules[i];
          break;
        }
      }
      if (!matchedRule) continue;
      toUpdate.push({
        doctorSessionId: session.id,
        sessionName: session.name,
        doctorName: session.doctorName,
        currentLocalFee: fee.localFee,
        currentForeignFee: fee.foreignFee,
        newLocalFee: matchedRule.newLocalFee,
        newForeignFee: matchedRule.newForeignFee
      });
    }

    const results: BulkPriceChangeResultRow[] = [];
    const BATCH_SIZE = 25; // run 25 session updates + result creates in parallel (handles 20+ doctors × 10 sessions)
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (row) => {
          const session = await prisma.doctorSession.findUnique({
            where: { id: row.doctorSessionId },
            select: { fees: true }
          });
          if (!session) return null;
          const fees = parseFees(session.fees);
          const updatedFees = fees.map((f) =>
            f.id === bulk.feeTypeId
              ? { ...f, localFee: row.newLocalFee, foreignFee: row.newForeignFee }
              : f
          );
          await prisma.doctorSession.update({
            where: { id: row.doctorSessionId },
            data: { fees: updatedFees as any }
          });
          const resultRow = await prisma.doctorSessionBulkPriceChangeResult.create({
            data: {
              bulkPriceChangeId,
              doctorSessionId: row.doctorSessionId,
              sessionName: row.sessionName ?? null,
              doctorName: row.doctorName ?? null,
              oldLocalFee: row.currentLocalFee,
              oldForeignFee: row.currentForeignFee,
              newLocalFee: row.newLocalFee,
              newForeignFee: row.newForeignFee
            }
          });
          return {
            id: resultRow.id,
            doctorSessionId: resultRow.doctorSessionId,
            sessionName: resultRow.sessionName ?? undefined,
            doctorName: resultRow.doctorName ?? undefined,
            oldLocalFee: resultRow.oldLocalFee,
            oldForeignFee: resultRow.oldForeignFee,
            newLocalFee: resultRow.newLocalFee,
            newForeignFee: resultRow.newForeignFee,
            processedAt: resultRow.processedAt
          } as BulkPriceChangeResultRow;
        })
      );
      results.push(...chunkResults.filter((r): r is BulkPriceChangeResultRow => r != null));
    }

    await prisma.doctorSessionBulkPriceChange.update({
      where: { id: bulkPriceChangeId },
      data: { status: 'PROCESSED', updatedAt: new Date() }
    });

    return { success: true, data: { updated: results.length, results } };
  } catch (e: any) {
    console.error('processBulkPriceChangeService error:', e);
    return { success: false, error: { message: e?.message || 'Process failed' } };
  }
}
