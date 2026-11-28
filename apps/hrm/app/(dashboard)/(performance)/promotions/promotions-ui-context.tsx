'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { PromotionRecord } from '@/types/performance';

export type PromotionFormMode = 'create' | 'edit';

type FormSheetState = {
  mode: PromotionFormMode;
  record: PromotionRecord | null;
} | null;

type PromotionsUiContextValue = {
  formSheet: FormSheetState;
  openCreate: () => void;
  openEdit: (record: PromotionRecord) => void;
  closeForm: () => void;
};

const PromotionsUiContext = createContext<PromotionsUiContextValue | null>(
  null
);

export function PromotionsUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState>(null);

  const openCreate = useCallback(
    () => setFormSheet({ mode: 'create', record: null }),
    []
  );
  const openEdit = useCallback(
    (record: PromotionRecord) => setFormSheet({ mode: 'edit', record }),
    []
  );
  const closeForm = useCallback(() => setFormSheet(null), []);

  const value = useMemo(
    () => ({ formSheet, openCreate, openEdit, closeForm }),
    [formSheet, openCreate, openEdit, closeForm]
  );

  return (
    <PromotionsUiContext.Provider value={value}>
      {children}
    </PromotionsUiContext.Provider>
  );
}

export function usePromotionsUi() {
  const ctx = useContext(PromotionsUiContext);
  if (!ctx) {
    throw new Error('usePromotionsUi must be used within PromotionsUiProvider');
  }
  return ctx;
}
