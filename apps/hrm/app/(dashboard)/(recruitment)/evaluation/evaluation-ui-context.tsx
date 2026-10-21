'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { EvaluationRecord } from '@/types/recruitment';

type EvaluationUiContextValue = {
  activeRecord: EvaluationRecord;
  setActiveRecord: (record: EvaluationRecord) => void;
  /** Load a draft into the top form, then scroll to the top of the page. */
  editRecord: (record: EvaluationRecord) => void;
  viewRecord: EvaluationRecord | null;
  previewOpen: boolean;
  openView: (record: EvaluationRecord) => void;
  openPreview: () => void;
  closeView: () => void;
  closePreview: () => void;
};

const EvaluationUiContext = createContext<EvaluationUiContextValue | null>(
  null
);

type ProviderProps = {
  children: ReactNode;
  initialRecord: EvaluationRecord;
};

export function EvaluationUiProvider({
  children,
  initialRecord
}: ProviderProps) {
  const [activeRecord, setActiveRecord] =
    useState<EvaluationRecord>(initialRecord);
  const [viewRecord, setViewRecord] = useState<EvaluationRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const editRecord = useCallback((record: EvaluationRecord) => {
    setActiveRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openView = useCallback((record: EvaluationRecord) => {
    setPreviewOpen(false);
    setViewRecord(record);
  }, []);

  const openPreview = useCallback(() => {
    setViewRecord(null);
    setPreviewOpen(true);
  }, []);

  const closeView = useCallback(() => setViewRecord(null), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const value = useMemo(
    () => ({
      activeRecord,
      setActiveRecord,
      editRecord,
      viewRecord,
      previewOpen,
      openView,
      openPreview,
      closeView,
      closePreview
    }),
    [
      activeRecord,
      editRecord,
      viewRecord,
      previewOpen,
      openView,
      openPreview,
      closeView,
      closePreview
    ]
  );

  return (
    <EvaluationUiContext.Provider value={value}>
      {children}
    </EvaluationUiContext.Provider>
  );
}

export function useEvaluationUi() {
  const ctx = useContext(EvaluationUiContext);
  if (!ctx) {
    throw new Error('useEvaluationUi must be used within EvaluationUiProvider');
  }
  return ctx;
}
