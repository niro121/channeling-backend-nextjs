'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type { DepartmentUiRecord } from '@/types/department';
import type { DepartmentListFilters } from './section-department-filters';

type DepartmentUiContextValue = {
  records: DepartmentUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DepartmentUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  filters: DepartmentListFilters;
  detailFormHighlight: boolean;
  startNewDepartment: () => void;
};

const DepartmentUiContext = createContext<DepartmentUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: DepartmentUiRecord[];
  initialSelectedId?: string | null;
  initialFilters?: DepartmentListFilters;
  children: ReactNode;
};

export function DepartmentUiProvider({
  initialRecords,
  initialSelectedId = null,
  initialFilters = {},
  children
}: ProviderProps) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [filters, setFilters] = useState<DepartmentListFilters>(initialFilters);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    setSelectedIdState(initialSelectedId);
    setIsNew(false);
  }, [initialSelectedId]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    setIsNew(false);
    setDetailFormHighlight(false);
  }, []);

  const startNewDepartment = useCallback(() => {
    setSelectedIdState(null);
    setIsNew(true);
    setDetailFormHighlight(true);
  }, []);

  useEffect(() => {
    if (!detailFormHighlight) return;
    const timer = window.setTimeout(() => setDetailFormHighlight(false), 2800);
    return () => window.clearTimeout(timer);
  }, [detailFormHighlight]);

  const value = useMemo(
    () => ({
      records,
      setRecords,
      selectedId,
      setSelectedId,
      isNew,
      setIsNew,
      filters,
      detailFormHighlight,
      startNewDepartment
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      filters,
      detailFormHighlight,
      startNewDepartment
    ]
  );

  return (
    <DepartmentUiContext.Provider value={value}>
      {children}
    </DepartmentUiContext.Provider>
  );
}

export function useDepartmentUi() {
  const ctx = useContext(DepartmentUiContext);
  if (!ctx) {
    throw new Error('useDepartmentUi must be used within DepartmentUiProvider');
  }
  return ctx;
}
