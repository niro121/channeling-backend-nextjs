'use client';

import { createContext, useContext } from 'react';
import type { ManagementFeatures } from '@/lib/management-access';
import { NO_TASK_PERMISSIONS } from '@/lib/tasks/constants';
import { NO_AI_PERMISSIONS } from '@/lib/ai/constants';

const FeaturesContext = createContext<ManagementFeatures | null>(null);

/** Feature flags from channeling's /api/management/me, loaded once in the dashboard layout. */
export function FeaturesProvider({ features, children }: { features: ManagementFeatures; children: React.ReactNode }) {
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): ManagementFeatures {
  return (
    useContext(FeaturesContext) ?? {
      roomInventory: { view: false, assign: false, condition: false },
      roomStays: { view: false, checkIn: false, checkOut: false, contacts: false, override: false },
      tasks: NO_TASK_PERMISSIONS,
      ai: NO_AI_PERMISSIONS
    }
  );
}
