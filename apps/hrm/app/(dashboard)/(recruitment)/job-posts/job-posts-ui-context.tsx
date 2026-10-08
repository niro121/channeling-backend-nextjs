'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { JobPostRecord } from '@/types/recruitment';

export type JobPostFormMode = 'create' | 'edit' | 'duplicate';

type FormSheetState = {
  mode: JobPostFormMode;
  record: JobPostRecord | null;
};

type JobPostsUiContextValue = {
  formSheet: FormSheetState | null;
  viewRecord: JobPostRecord | null;
  openCreate: () => void;
  openEdit: (record: JobPostRecord) => void;
  openDuplicate: (record: JobPostRecord) => void;
  openView: (record: JobPostRecord) => void;
  closeFormSheet: () => void;
  closeViewDialog: () => void;
};

const JobPostsUiContext = createContext<JobPostsUiContextValue | null>(null);

export function JobPostsUiProvider({ children }: { children: ReactNode }) {
  const [formSheet, setFormSheet] = useState<FormSheetState | null>(null);
  const [viewRecord, setViewRecord] = useState<JobPostRecord | null>(null);

  const openCreate = useCallback(() => {
    setViewRecord(null);
    setFormSheet({ mode: 'create', record: null });
  }, []);

  const openEdit = useCallback((record: JobPostRecord) => {
    setViewRecord(null);
    setFormSheet({ mode: 'edit', record });
  }, []);

  const openDuplicate = useCallback((record: JobPostRecord) => {
    setViewRecord(null);
    setFormSheet({ mode: 'duplicate', record });
  }, []);

  const openView = useCallback((record: JobPostRecord) => {
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
      openDuplicate,
      openView,
      closeFormSheet,
      closeViewDialog
    }),
    [
      formSheet,
      viewRecord,
      openCreate,
      openEdit,
      openDuplicate,
      openView,
      closeFormSheet,
      closeViewDialog
    ]
  );

  return (
    <JobPostsUiContext.Provider value={value}>{children}</JobPostsUiContext.Provider>
  );
}

export function useJobPostsUi() {
  const ctx = useContext(JobPostsUiContext);
  if (!ctx) {
    throw new Error('useJobPostsUi must be used within JobPostsUiProvider');
  }
  return ctx;
}
