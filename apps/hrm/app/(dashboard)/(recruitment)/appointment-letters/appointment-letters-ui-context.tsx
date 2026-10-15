'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { AppointmentLetterRecord } from '@/types/recruitment';

export type AppointmentLetterFormMode = 'create' | 'edit';

type FormSheetState = {
  mode: AppointmentLetterFormMode;
  record: AppointmentLetterRecord | null;
};

type AppointmentLettersUiContextValue = {
  formSheet: FormSheetState | null;
  viewRecord: AppointmentLetterRecord | null;
  letterPreviewRecord: AppointmentLetterRecord | null;
  openCreate: (prefill?: Partial<AppointmentLetterRecord>) => void;
  openEdit: (record: AppointmentLetterRecord) => void;
  openView: (record: AppointmentLetterRecord) => void;
  openLetterPreview: (record: AppointmentLetterRecord) => void;
  closeFormSheet: () => void;
  closeView: () => void;
  closeLetterPreview: () => void;
  markGenerated: (id: string) => void;
  generatedIds: Set<string>;
};

const AppointmentLettersUiContext =
  createContext<AppointmentLettersUiContextValue | null>(null);

export function AppointmentLettersUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] =
    useState<AppointmentLetterRecord | null>(null);
  const [letterPreviewRecord, setLetterPreviewRecord] =
    useState<AppointmentLetterRecord | null>(null);
  const [generatedIds, setGeneratedIds] = useState<Set<string>>(
    () => new Set()
  );

  const openCreate = useCallback(
    (_prefill?: Partial<AppointmentLetterRecord>) => {
      setViewRecord(null);
      setLetterPreviewRecord(null);
      setFormSheet({ mode: 'create', record: null });
    },
    []
  );

  const openEdit = useCallback((record: AppointmentLetterRecord) => {
    setViewRecord(null);
    setLetterPreviewRecord(null);
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openView = useCallback((record: AppointmentLetterRecord) => {
    setFormSheet(null);
    setLetterPreviewRecord(null);
    setViewRecord(record);
  }, []);

  const openLetterPreview = useCallback((record: AppointmentLetterRecord) => {
    setFormSheet(null);
    setViewRecord(null);
    setLetterPreviewRecord(record);
  }, []);

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);
  const closeLetterPreview = useCallback(
    () => setLetterPreviewRecord(null),
    []
  );

  const markGenerated = useCallback((id: string) => {
    setGeneratedIds((prev) => new Set(prev).add(id));
  }, []);

  const value = useMemo(
    () => ({
      formSheet,
      viewRecord,
      letterPreviewRecord,
      openCreate,
      openEdit,
      openView,
      openLetterPreview,
      closeFormSheet,
      closeView,
      closeLetterPreview,
      markGenerated,
      generatedIds
    }),
    [
      formSheet,
      viewRecord,
      letterPreviewRecord,
      openCreate,
      openEdit,
      openView,
      openLetterPreview,
      closeFormSheet,
      closeView,
      closeLetterPreview,
      markGenerated,
      generatedIds
    ]
  );

  return (
    <AppointmentLettersUiContext.Provider value={value}>
      {children}
    </AppointmentLettersUiContext.Provider>
  );
}

export function useAppointmentLettersUi() {
  const ctx = useContext(AppointmentLettersUiContext);
  if (!ctx) {
    throw new Error(
      'useAppointmentLettersUi must be used within AppointmentLettersUiProvider'
    );
  }
  return ctx;
}

export function withGeneratedFlag(
  record: AppointmentLetterRecord,
  generatedIds: Set<string>
): AppointmentLetterRecord {
  if (record.letterGenerated || generatedIds.has(record.id)) {
    return { ...record, letterGenerated: true };
  }
  return record;
}
