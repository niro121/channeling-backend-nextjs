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
import type {
  RoomLocationSummary,
  RoomUiRecord,
  RoomZoneSummary
} from '@/types/room';
import type { RoomListFilters } from './section-room-filters';

type RoomUiContextValue = {
  records: RoomUiRecord[];
  setRecords: React.Dispatch<React.SetStateAction<RoomUiRecord[]>>;
  locationOptions: RoomLocationSummary[];
  zoneOptions: RoomZoneSummary[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isNew: boolean;
  setIsNew: (value: boolean) => void;
  filters: RoomListFilters;
  detailFormHighlight: boolean;
  startNewRoom: () => void;
};

const RoomUiContext = createContext<RoomUiContextValue | null>(null);

type ProviderProps = {
  initialRecords: RoomUiRecord[];
  locationOptions: RoomLocationSummary[];
  zoneOptions: RoomZoneSummary[];
  initialSelectedId?: string | null;
  initialFilters?: RoomListFilters;
  children: ReactNode;
};

export function RoomUiProvider({
  initialRecords,
  locationOptions,
  zoneOptions,
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
  const [filters, setFilters] = useState<RoomListFilters>(initialFilters);

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

  const startNewRoom = useCallback(() => {
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
      locationOptions,
      zoneOptions,
      selectedId,
      setSelectedId,
      isNew,
      setIsNew,
      filters,
      detailFormHighlight,
      startNewRoom
    }),
    [
      records,
      locationOptions,
      zoneOptions,
      selectedId,
      setSelectedId,
      isNew,
      filters,
      detailFormHighlight,
      startNewRoom
    ]
  );

  return (
    <RoomUiContext.Provider value={value}>{children}</RoomUiContext.Provider>
  );
}

export function useRoomUi() {
  const ctx = useContext(RoomUiContext);
  if (!ctx) {
    throw new Error('useRoomUi must be used within RoomUiProvider');
  }
  return ctx;
}
