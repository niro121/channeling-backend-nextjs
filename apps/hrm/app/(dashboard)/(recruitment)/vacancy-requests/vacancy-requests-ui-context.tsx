'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { VacancyRequestRecord } from '@/types/recruitment';

export type VacancyFormMode = 'create' | 'edit';

type FormSheetState = {
  mode: VacancyFormMode;
  record: VacancyRequestRecord | null;
};

type VacancyRequestsUiContextValue = {
  formSheet: FormSheetState | null;
  viewRecord: VacancyRequestRecord | null;
  openCreate: () => void;
  openEdit: (record: VacancyRequestRecord) => void;
  openView: (record: VacancyRequestRecord) => void;
  closeFormSheet: () => void;
  closeViewDialog: () => void;
};

const VacancyRequestsUiContext =
  createContext<VacancyRequestsUiContextValue | null>(null);

export function VacancyRequestsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] = useState<VacancyRequestRecord | null>(
    null
  );

  const openCreate = useCallback(() => {
    setViewRecord(null);
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: VacancyRequestRecord) => {
    setViewRecord(null);
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openView = useCallback((record: VacancyRequestRecord) => {
    setFormSheet(null);
    setViewRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeViewDialog = useCallback(() => setViewRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      viewRecord,
      openCreate,
      openEdit,
      openView,
      closeFormSheet,
      closeViewDialog
    }),
    [
      formSheet,
      viewRecord,
      openCreate,
      openEdit,
      openView,
      closeFormSheet,
      closeViewDialog
    ]
  );

  return (
    <VacancyRequestsUiContext.Provider value={value}>
      {children}
    </VacancyRequestsUiContext.Provider>
  );
}

export function useVacancyRequestsUi() {
  const ctx = useContext(VacancyRequestsUiContext);
  if (!ctx) {
    throw new Error(
      'useVacancyRequestsUi must be used within VacancyRequestsUiProvider'
    );
  }
  return ctx;
}
