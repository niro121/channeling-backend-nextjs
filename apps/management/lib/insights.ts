import 'server-only';
import { channelingUserJson } from '@/lib/channeling-user-api';
import type { InsightData, InsightModule, InsightRange } from '@/types/insights';

/** Channel insights from channeling (/api/management/insights), as the signed-in user. */

type Failure = { success: false; errorCode?: string; message: string };

function rangeQuery(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export async function getInsightAccess(
  from?: string,
  to?: string
): Promise<{ success: true; modules: InsightModule[]; range: InsightRange } | Failure> {
  try {
    return await channelingUserJson(`/api/management/insights${rangeQuery(from, to)}`);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Channeling unavailable' };
  }
}

export async function getInsight<K extends InsightModule>(
  module: K,
  range: InsightRange
): Promise<{ success: true; data: InsightData[K] } | Failure> {
  try {
    return await channelingUserJson(`/api/management/insights/${module}${rangeQuery(range.from, range.to)}`);
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Channeling unavailable' };
  }
}
