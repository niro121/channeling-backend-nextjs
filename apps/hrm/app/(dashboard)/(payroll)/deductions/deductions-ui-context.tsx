'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { DeductionRecord } from '@/types/payroll';

export type DeductionFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: DeductionFormSheetMode;
  record: DeductionRecord | null;
};

type DeductionsUiContextValue = {
  formSheet: FormSheetState | null;
  openCreate: () => void;
  openEdit: (record: DeductionRecord) => void;
  closeFormSheet: () => void;
};

const DeductionsUiContext = createContext<DeductionsUiContextValue | null>(
  null
);

export function DeductionsUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: DeductionRecord) => {
    setFormSheet({ mode: 'edit', record });
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      openCreate,
      openEdit,
      closeFormSheet
    }),
    [formSheet, openCreate, openEdit, closeFormSheet]
  );

  return (
    <DeductionsUiContext.Provider value={value}>
      {children}
    </DeductionsUiContext.Provider>
  );
}

export function useDeductionsUi() {
  const ctx = useContext(DeductionsUiContext);
  if (!ctx) {
    throw new Error('useDeductionsUi must be used within DeductionsUiProvider');
  }
  return ctx;
}
