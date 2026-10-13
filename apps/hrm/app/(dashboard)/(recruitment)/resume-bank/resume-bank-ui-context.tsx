'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ResumeBankRecord } from '@/types/recruitment';

export type ResumeBankFormMode = 'create' | 'edit';

type FormSheetState = {
  mode: ResumeBankFormMode;
  record: ResumeBankRecord | null;
};

type ResumeBankUiContextValue = {
  formSheet: FormSheetState | null;
  viewRecord: ResumeBankRecord | null;
  resumeRecord: ResumeBankRecord | null;
  addToJobRecord: ResumeBankRecord | null;
  openCreate: () => void;
  openEdit: (record: ResumeBankRecord) => void;
  openView: (record: ResumeBankRecord) => void;
  openResume: (record: ResumeBankRecord) => void;
  openAddToJob: (record: ResumeBankRecord) => void;
  closeFormSheet: () => void;
  closeView: () => void;
  closeResume: () => void;
  closeAddToJob: () => void;
};

const ResumeBankUiContext = createContext<ResumeBankUiContextValue | null>(
  null
);

export function ResumeBankUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] = useState<ResumeBankRecord | null>(null);
  const [resumeRecord, setResumeRecord] = useState<ResumeBankRecord | null>(
    null
  );
  const [addToJobRecord, setAddToJobRecord] =
    useState<ResumeBankRecord | null>(null);

  const closeOthers = useCallback(() => {
    setFormSheet(null);
    setViewRecord(null);
    setResumeRecord(null);
    setAddToJobRecord(null);
  }, []);

  const openCreate = useCallback(() => {
    closeOthers();
    setFormSheet({ mode: 'create', record: null });
  }, [closeOthers]);

  const openEdit = useCallback(
    (record: ResumeBankRecord) => {
      closeOthers();
      setFormSheet({ mode: 'edit', record });
    },
    [closeOthers]
  );

  const openView = useCallback(
    (record: ResumeBankRecord) => {
      closeOthers();
      setViewRecord(record);
    },
    [closeOthers]
  );

  const openResume = useCallback(
    (record: ResumeBankRecord) => {
      closeOthers();
      setResumeRecord(record);
    },
    [closeOthers]
  );

  const openAddToJob = useCallback(
    (record: ResumeBankRecord) => {
      closeOthers();
      setAddToJobRecord(record);
    },
    [closeOthers]
  );

  const closeFormSheet = useCallback(() => setFormSheet(null), []);
  const closeView = useCallback(() => setViewRecord(null), []);
  const closeResume = useCallback(() => setResumeRecord(null), []);
  const closeAddToJob = useCallback(() => setAddToJobRecord(null), []);

  const value = useMemo(
    () => ({
      formSheet,
      viewRecord,
      resumeRecord,
      addToJobRecord,
      openCreate,
      openEdit,
      openView,
      openResume,
      openAddToJob,
      closeFormSheet,
      closeView,
      closeResume,
      closeAddToJob
    }),
    [
      formSheet,
      viewRecord,
      resumeRecord,
      addToJobRecord,
      openCreate,
      openEdit,
      openView,
      openResume,
      openAddToJob,
      closeFormSheet,
      closeView,
      closeResume,
      closeAddToJob
    ]
  );

  return (
    <ResumeBankUiContext.Provider value={value}>
      {children}
    </ResumeBankUiContext.Provider>
  );
}

export function useResumeBankUi() {
  const ctx = useContext(ResumeBankUiContext);
  if (!ctx) {
    throw new Error('useResumeBankUi must be used within ResumeBankUiProvider');
  }
  return ctx;
}
