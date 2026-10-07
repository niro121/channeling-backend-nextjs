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

type FormDialogState = {
  mode: VacancyFormMode;
  record: VacancyRequestRecord | null;
};

type VacancyRequestsUiContextValue = {
  formDialog: FormDialogState | null;
  viewRecord: VacancyRequestRecord | null;
  openCreate: () => void;
  openEdit: (record: VacancyRequestRecord) => void;
  openView: (record: VacancyRequestRecord) => void;
  closeFormDialog: () => void;
  closeViewDialog: () => void;
};

const VacancyRequestsUiContext =
  createContext<VacancyRequestsUiContextValue | null>(null);

export function VacancyRequestsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formDialog, setFormDialog] = useState<FormDialogState | null>(null);
  const [viewRecord, setViewRecord] = useState<VacancyRequestRecord | null>(
    null
  );

  const openCreate = useCallback(() => {
    setViewRecord(null);
    setFormDialog({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: VacancyRequestRecord) => {
    setViewRecord(null);
    setFormDialog({ mode: 'edit', record });
  }, []);

  const openView = useCallback((record: VacancyRequestRecord) => {
    setFormDialog(null);
    setViewRecord(record);
  }, []);

  const closeFormDialog = useCallback(() => setFormDialog(null), []);
  const closeViewDialog = useCallback(() => setViewRecord(null), []);

  const value = useMemo(
    () => ({
      formDialog,
      viewRecord,
      openCreate,
      openEdit,
      openView,
      closeFormDialog,
      closeViewDialog
    }),
    [
      formDialog,
      viewRecord,
      openCreate,
      openEdit,
      openView,
      closeFormDialog,
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
