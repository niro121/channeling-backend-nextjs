'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { DepartmentReportRow } from '@/types/reports';

type DepartmentReportsUiContextValue = {
  detailRecord: DepartmentReportRow | null;
  openDetail: (row: DepartmentReportRow) => void;
  closeDetail: () => void;
};

const DepartmentReportsUiContext =
  createContext<DepartmentReportsUiContextValue | null>(null);

export function DepartmentReportsUiProvider({
  children
}: {
  children: ReactNode;
}) {
  const [detailRecord, setDetailRecord] = useState<DepartmentReportRow | null>(
    null
  );

  const openDetail = useCallback((row: DepartmentReportRow) => {
    setDetailRecord(row);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailRecord(null);
  }, []);

  const value = useMemo(
    () => ({ detailRecord, openDetail, closeDetail }),
    [detailRecord, openDetail, closeDetail]
  );

  return (
    <DepartmentReportsUiContext.Provider value={value}>
      {children}
    </DepartmentReportsUiContext.Provider>
  );
}

export function useDepartmentReportsUi() {
  const ctx = useContext(DepartmentReportsUiContext);
  if (!ctx) {
    throw new Error(
      'useDepartmentReportsUi must be used within DepartmentReportsUiProvider'
    );
  }
  return ctx;
}
