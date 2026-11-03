'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AllowanceRecord } from '@/types/payroll';

export type AllowanceFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: AllowanceFormSheetMode;
  record: AllowanceRecord | null;
};

type AllowancesUiContextValue = {
  formSheet: FormSheetState | null;
  openCreate: () => void;
  openEdit: (record: AllowanceRecord) => void;
  closeFormSheet: () => void;
};

const AllowancesUiContext = createContext<AllowancesUiContextValue | null>(
  null
);

export function AllowancesUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: AllowanceRecord) => {
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
    <AllowancesUiContext.Provider value={value}>
      {children}
    </AllowancesUiContext.Provider>
  );
}

export function useAllowancesUi() {
  const ctx = useContext(AllowancesUiContext);
  if (!ctx) {
    throw new Error('useAllowancesUi must be used within AllowancesUiProvider');
  }
  return ctx;
}
