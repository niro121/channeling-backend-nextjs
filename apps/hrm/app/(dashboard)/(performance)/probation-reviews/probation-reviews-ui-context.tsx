'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { ProbationReviewRecord } from '@/types/performance';

export type ProbationReviewFormMode = 'create' | 'edit';

type FormSheetState = {
  mode: ProbationReviewFormMode;
  record: ProbationReviewRecord | null;
} | null;

type ProbationReviewsUiContextValue = {
  formSheet: FormSheetState;
  openCreate: () => void;
  openEdit: (record: ProbationReviewRecord) => void;
  closeForm: () => void;
};

const ProbationReviewsUiContext =
  createContext<ProbationReviewsUiContextValue | null>(null);

export function ProbationReviewsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [formSheet, setFormSheet] = useState<FormSheetState>(null);

  const openCreate = useCallback(
    () => setFormSheet({ mode: 'create', record: null }),
    []
  );
  const openEdit = useCallback(
    (record: ProbationReviewRecord) => setFormSheet({ mode: 'edit', record }),
    []
  );
  const closeForm = useCallback(() => setFormSheet(null), []);

  const value = useMemo(
    () => ({ formSheet, openCreate, openEdit, closeForm }),
    [formSheet, openCreate, openEdit, closeForm]
  );

  return (
    <ProbationReviewsUiContext.Provider value={value}>
      {children}
    </ProbationReviewsUiContext.Provider>
  );
}

export function useProbationReviewsUi() {
  const ctx = useContext(ProbationReviewsUiContext);
  if (!ctx) {
    throw new Error(
      'useProbationReviewsUi must be used within ProbationReviewsUiProvider'
    );
  }
  return ctx;
}
