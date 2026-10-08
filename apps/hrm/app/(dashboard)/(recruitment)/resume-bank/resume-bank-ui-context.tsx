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

type ResumeBankUiContextValue = {
  viewRecord: ResumeBankRecord | null;
  resumeRecord: ResumeBankRecord | null;
  addToJobRecord: ResumeBankRecord | null;
  openView: (record: ResumeBankRecord) => void;
  openResume: (record: ResumeBankRecord) => void;
  openAddToJob: (record: ResumeBankRecord) => void;
  closeView: () => void;
  closeResume: () => void;
  closeAddToJob: () => void;
};

const ResumeBankUiContext = createContext<ResumeBankUiContextValue | null>(
  null
);

export function ResumeBankUiProvider({ children }: { children: ReactNode }) {
  const [viewRecord, setViewRecord] = useState<ResumeBankRecord | null>(null);
  const [resumeRecord, setResumeRecord] = useState<ResumeBankRecord | null>(
    null
  );
  const [addToJobRecord, setAddToJobRecord] =
    useState<ResumeBankRecord | null>(null);

  const closeOthers = useCallback(() => {
    setViewRecord(null);
    setResumeRecord(null);
    setAddToJobRecord(null);
  }, []);

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

  const closeView = useCallback(() => setViewRecord(null), []);
  const closeResume = useCallback(() => setResumeRecord(null), []);
  const closeAddToJob = useCallback(() => setAddToJobRecord(null), []);

  const value = useMemo(
    () => ({
      viewRecord,
      resumeRecord,
      addToJobRecord,
      openView,
      openResume,
      openAddToJob,
      closeView,
      closeResume,
      closeAddToJob
    }),
    [
      viewRecord,
      resumeRecord,
      addToJobRecord,
      openView,
      openResume,
      openAddToJob,
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
