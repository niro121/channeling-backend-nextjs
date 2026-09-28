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
  type HrmVariableUiRecord
} from '@/types/hrm-variable';

type HrmVariableUiContextValue = {
  record: HrmVariableUiRecord;
  setRecord: (record: HrmVariableUiRecord) => void;
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
  const [record, setRecordState] = useState<HrmVariableUiRecord>(
    () => initialRecord ?? emptyHrmVariableRecord()
  );

  const setRecord = useCallback((next: HrmVariableUiRecord) => {
    setRecordState(next);
  }, []);

  const value = useMemo(
    () => ({
      record,
      setRecord
    }),
    [record, setRecord]
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
