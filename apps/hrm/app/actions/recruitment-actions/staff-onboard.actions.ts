'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getAppointmentLetterOnboardContext } from '@/services/recruitment-services/staff-onboard.service';

export async function getAppointmentLetterOnboardContextAction(letterId: string) {
  try {
    await requirePermission('staff', 'view');
    const result = await getAppointmentLetterOnboardContext(letterId);
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Unable to load onboarding context'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAppointmentLetterOnboardContextAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to load onboarding context.'
      }
    };
  }
}
