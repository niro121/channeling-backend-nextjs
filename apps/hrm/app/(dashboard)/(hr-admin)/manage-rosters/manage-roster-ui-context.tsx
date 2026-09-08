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
import type { ManageRosterUiRecord } from '@/types/manage-roster';

type ManageRosterUiContextValue = {
  records: ManageRosterUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<ManageRosterUiRecord[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  detailFormHighlight: boolean;
  startNewManageRoster: () => void;
};

const ManageRosterUiContext = createContext<ManageRosterUiContextValue | null>(
  null
);

type ProviderProps = {
  initialRecords: ManageRosterUiRecord[];
  initialSelectedId?: string | null;
  children: ReactNode;
};

export function ManageRosterUiProvider({
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

  const startNewManageRoster = useCallback(() => {
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
      startNewManageRoster
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      detailFormHighlight,
      startNewManageRoster
    ]
  );

  return (
    <ManageRosterUiContext.Provider value={value}>
      {children}
    </ManageRosterUiContext.Provider>
  );
}

export function useManageRosterUi() {
  const ctx = useContext(ManageRosterUiContext);
  if (!ctx) {
    throw new Error('useManageRosterUi must be used within ManageRosterUiProvider');
  }
  return ctx;
}
