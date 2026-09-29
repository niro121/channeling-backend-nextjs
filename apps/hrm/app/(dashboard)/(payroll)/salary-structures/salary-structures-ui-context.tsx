'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { SalaryStructureRecord } from '@/types/payroll';

export type SalaryStructureFormSheetMode = 'create' | 'edit';

type FormSheetState = {
  mode: SalaryStructureFormSheetMode;
  record: SalaryStructureRecord | null;
};

type SalaryStructuresUiContextValue = {
  formSheet: FormSheetState | null;
  openCreate: () => void;
  openEdit: (record: SalaryStructureRecord) => void;
  closeFormSheet: () => void;
};

const SalaryStructuresUiContext =
  createContext<SalaryStructuresUiContextValue | null>(null);

export function SalaryStructuresUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);

  const openCreate = useCallback(() => {
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: SalaryStructureRecord) => {
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
    <SalaryStructuresUiContext.Provider value={value}>
      {children}
    </SalaryStructuresUiContext.Provider>
  );
}

export function useSalaryStructuresUi() {
  const ctx = useContext(SalaryStructuresUiContext);
  if (!ctx) {
    throw new Error(
      'useSalaryStructuresUi must be used within SalaryStructuresUiProvider'
    );
  }
  return ctx;
}
