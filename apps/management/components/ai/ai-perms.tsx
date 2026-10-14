'use client';

import { createContext, useContext } from 'react';
import { NO_AI_PERMISSIONS, type AiPermissions } from '@/lib/ai/constants';

/** AI assistant privileges for the signed-in user (from channeling, loaded by the dashboard layout). */
const AiPermsContext = createContext<AiPermissions>(NO_AI_PERMISSIONS);

export function AiPermsProvider({ value, children }: { value: AiPermissions; children: React.ReactNode }) {
  return <AiPermsContext.Provider value={value}>{children}</AiPermsContext.Provider>;
}

export function useAiPerms(): AiPermissions {
  return useContext(AiPermsContext);
}
