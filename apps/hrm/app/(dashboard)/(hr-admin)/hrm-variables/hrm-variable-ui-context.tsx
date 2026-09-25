'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  emptyHrmVariableRecord,
  type HrmPayeSlab,
  type HrmStatutoryRates,
  type HrmVariableUiRecord
} from '@/types/hrm-variable';

type HrmVariableUiContextValue = {
  record: HrmVariableUiRecord;
  setRates: (rates: HrmStatutoryRates) => void;
  setSlabs: (slabs: HrmPayeSlab[]) => void;
  addSlab: (slab: Omit<HrmPayeSlab, 'id'>) => void;
  removeSlab: (id: string) => void;
};

const HrmVariableUiContext = createContext<HrmVariableUiContextValue | null>(
  null
);

type ProviderProps = {
  children: ReactNode;
  initialRecord?: HrmVariableUiRecord;
};

export function HrmVariableUiProvider({
  children,
  initialRecord
}: ProviderProps) {
  const [record, setRecord] = useState<HrmVariableUiRecord>(
    () => initialRecord ?? emptyHrmVariableRecord()
  );

  const setRates = useCallback((rates: HrmStatutoryRates) => {
    setRecord((prev) => ({ ...prev, rates }));
  }, []);

  const setSlabs = useCallback((slabs: HrmPayeSlab[]) => {
    setRecord((prev) => ({ ...prev, slabs }));
  }, []);

  const addSlab = useCallback((slab: Omit<HrmPayeSlab, 'id'>) => {
    setRecord((prev) => ({
      ...prev,
      slabs: [
        ...prev.slabs,
        { ...slab, id: `local-${Date.now()}-${prev.slabs.length}` }
      ].sort((a, b) => a.fromSalary - b.fromSalary)
    }));
  }, []);

  const removeSlab = useCallback((id: string) => {
    setRecord((prev) => ({
      ...prev,
      slabs: prev.slabs.filter((s) => s.id !== id)
    }));
  }, []);

  const value = useMemo(
    () => ({
      record,
      setRates,
      setSlabs,
      addSlab,
      removeSlab
    }),
    [record, setRates, setSlabs, addSlab, removeSlab]
  );

  return (
    <HrmVariableUiContext.Provider value={value}>
      {children}
    </HrmVariableUiContext.Provider>
  );
}

export function useHrmVariableUi() {
  const ctx = useContext(HrmVariableUiContext);
  if (!ctx) {
    throw new Error('useHrmVariableUi must be used within HrmVariableUiProvider');
  }
  return ctx;
}
