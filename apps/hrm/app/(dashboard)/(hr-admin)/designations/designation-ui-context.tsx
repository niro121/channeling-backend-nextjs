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
import type { DesignationUiRecord } from '@/types/designation';

type DesignationUiContextValue = {
  records: DesignationUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<DesignationUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  detailFormHighlight: boolean;
  startNewDesignation: () => void;
};

const DesignationUiContext = createContext<DesignationUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: DesignationUiRecord[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function DesignationUiProvider({
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

  const startNewDesignation = useCallback(() => {
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
      detailFormHighlight,
      startNewDesignation
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      detailFormHighlight,
      startNewDesignation
    ]
  );

  return (
    <DesignationUiContext.Provider value={value}>
      {children}
    </DesignationUiContext.Provider>
  );
}

export function useDesignationUi() {
  const ctx = useContext(DesignationUiContext);
  if (!ctx) {
    throw new Error('useDesignationUi must be used within DesignationUiProvider');
  }
  return ctx;
}
