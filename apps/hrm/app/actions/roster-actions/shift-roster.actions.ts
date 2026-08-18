'use server';

import { requirePermission } from '@/lib/server-permissions';
import { loadRoster } from '@/services/roster-services/shift-roster.service';
import type { LoadRosterParams, LoadRosterResult } from '@/types/roster';

export async function loadRosterAction(params: LoadRosterParams): Promise<{
  isError: boolean;
  data: LoadRosterResult | null;
  errors: Record<string, string | undefined>;
}> {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await loadRoster(params);

    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to load roster. Please try again.'
        }
      };
    }

    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('loadRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load roster. Please try again.'
      }
    };
  }
}
