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

type DepartmentUiContextValue = {
  records: DepartmentUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DepartmentUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  institutionFilter: string;
  setInstitutionFilter: (value: string) => void;
  detailFormHighlight: boolean;
  startNewDepartment: () => void;
};

const DepartmentUiContext = createContext<DepartmentUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: DepartmentUiRecord[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function DepartmentUiProvider({
  initialRecords,
  initialSelectedId = null,
  children
}: ProviderProps) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

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
      search,
      setSearch,
      statusFilter,
      setStatusFilter,
      institutionFilter,
      setInstitutionFilter,
      detailFormHighlight,
      startNewDepartment
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      statusFilter,
      institutionFilter,
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
