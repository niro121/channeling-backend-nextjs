'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import type {
  ChangeStaffFormOptions,
  ChangeStaffHistoryRow,
  ChangeStaffMemberOption
} from '@/types/change-staff';

type ChangeStaffUiContextValue = {
  members: ChangeStaffMemberOption[];
  setMembers: React.Dispatch<React.SetStateAction<ChangeStaffMemberOption[]>>;
  history: ChangeStaffHistoryRow[];
  setHistory: React.Dispatch<React.SetStateAction<ChangeStaffHistoryRow[]>>;
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  selectedMember: ChangeStaffMemberOption | null;
  updateMemberSnapshot: (member: ChangeStaffMemberOption) => void;
  formOptions: ChangeStaffFormOptions;
};

const ChangeStaffUiContext = createContext<ChangeStaffUiContextValue | null>(
  null
);

type ProviderProps = {
  initialMembers: ChangeStaffMemberOption[];
  initialHistory: ChangeStaffHistoryRow[];
  formOptions: ChangeStaffFormOptions;
  initialStaffId?: string;
  children: ReactNode;
};

export function ChangeStaffUiProvider({
  initialMembers,
  initialHistory,
  formOptions,
  initialStaffId,
  children
}: ProviderProps) {
  const [members, setMembers] = useState(initialMembers);
  const [history, setHistory] = useState(initialHistory);
  const [selectedStaffId, setSelectedStaffId] = useState(
    initialStaffId ?? initialMembers[0]?.id ?? ''
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedStaffId) ?? null,
    [members, selectedStaffId]
  );

  const updateMemberSnapshot = useCallback((member: ChangeStaffMemberOption) => {
    setMembers((prev) =>
      prev.map((row) => (row.id === member.id ? member : row))
    );
  }, []);

  const value = useMemo(
    () => ({
      members,
      setMembers,
      history,
      setHistory,
      selectedStaffId,
      setSelectedStaffId,
      selectedMember,
      updateMemberSnapshot,
      formOptions
    }),
    [
      members,
      history,
      selectedStaffId,
      selectedMember,
      updateMemberSnapshot,
      formOptions
    ]
  );

  return (
    <ChangeStaffUiContext.Provider value={value}>
      {children}
    </ChangeStaffUiContext.Provider>
  );
}

export function useChangeStaffUi() {
  const ctx = useContext(ChangeStaffUiContext);
  if (!ctx) {
    throw new Error('useChangeStaffUi must be used within ChangeStaffUiProvider');
  }
  return ctx;
}
