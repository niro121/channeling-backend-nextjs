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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@archmage/ui';
import {
  assignStaffToManageRosterAction,
  getManageRosterListAction,
  getStaffRosterMembersAction,
  removeStaffFromManageRosterAction
} from '@/app/actions/hr-admin-actions/manage-roster.actions';
import type {
  ManageRosterDepartmentOption,
  ManageRosterUiRecord,
  ManageRosterWorkspaceTab,
  StaffRosterAssignCandidate,
  StaffRosterFilterValues,
  StaffRosterMemberRow
} from '@/types/manage-roster';
import { EMPTY_STAFF_ROSTER_FILTERS } from '@/types/manage-roster';

export type StaffRosterAssignSheetMode = 'add' | 'bulk';

export type StaffRosterMoveConfirmState = {
  candidates: StaffRosterAssignCandidate[];
  targetRosterId: string;
  targetRosterCode: string;
  targetRosterName: string;
};

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
  departmentOptions: ManageRosterDepartmentOption[];

  activeTab: ManageRosterWorkspaceTab;
  setActiveTab: (tab: ManageRosterWorkspaceTab) => void;

  staffRosterFilters: StaffRosterFilterValues;
  setStaffRosterFilters: React.Dispatch<
    React.SetStateAction<StaffRosterFilterValues>
  >;
  staffRosterRows: StaffRosterMemberRow[];
  setStaffRosterRows: React.Dispatch<
    React.SetStateAction<StaffRosterMemberRow[]>
  >;
  staffRosterLoading: boolean;
  staffRosterLoaded: boolean;
  setStaffRosterLoaded: (value: boolean) => void;
  selectedStaffIds: string[];
  setSelectedStaffIds: (ids: string[]) => void;
  loadStaffRoster: (overrides?: StaffRosterFilterValues) => Promise<void>;
  clearStaffRosterRegister: () => void;

  assignSheetMode: StaffRosterAssignSheetMode | null;
  openAssignSheet: (mode: StaffRosterAssignSheetMode) => void;
  closeAssignSheet: () => void;

  moveConfirm: StaffRosterMoveConfirmState | null;
  requestAssign: (args: {
    candidates: StaffRosterAssignCandidate[];
    targetRosterId: string;
    targetRosterCode: string;
    targetRosterName: string;
  }) => void;
  confirmMoveAssign: () => void;
  cancelMoveAssign: () => void;
  membershipSaving: boolean;

  removeTarget: StaffRosterMemberRow | null;
  openRemoveConfirm: (row: StaffRosterMemberRow) => void;
  closeRemoveConfirm: () => void;
  confirmRemove: () => void;
};

const ManageRosterUiContext = createContext<ManageRosterUiContextValue | null>(
  null
);

type ProviderProps = {
  initialRecords: ManageRosterUiRecord[];
  initialSelectedId?: string | null;
  initialTab?: ManageRosterWorkspaceTab;
  initialStaffFilters?: StaffRosterFilterValues;
  departmentOptions?: ManageRosterDepartmentOption[];
  children: ReactNode;
};

export function ManageRosterUiProvider({
  initialRecords,
  initialSelectedId = null,
  initialTab = 'rosters',
  initialStaffFilters = EMPTY_STAFF_ROSTER_FILTERS,
  departmentOptions = [],
  children
}: ProviderProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedIdState] = useState<string | null>(
    initialSelectedId
  );
  const [isNew, setIsNew] = useState(false);
  const [detailFormHighlight, setDetailFormHighlight] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTabState] =
    useState<ManageRosterWorkspaceTab>(initialTab);

  const [staffRosterFilters, setStaffRosterFilters] =
    useState<StaffRosterFilterValues>(() => ({
      ...EMPTY_STAFF_ROSTER_FILTERS,
      ...initialStaffFilters,
      rosterId:
        initialStaffFilters.rosterId ||
        initialSelectedId ||
        EMPTY_STAFF_ROSTER_FILTERS.rosterId
    }));
  const [staffRosterRows, setStaffRosterRows] = useState<
    StaffRosterMemberRow[]
  >([]);
  const [staffRosterLoading, setStaffRosterLoading] = useState(false);
  const [staffRosterLoaded, setStaffRosterLoaded] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [assignSheetMode, setAssignSheetMode] =
    useState<StaffRosterAssignSheetMode | null>(null);
  const [moveConfirm, setMoveConfirm] =
    useState<StaffRosterMoveConfirmState | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffRosterMemberRow | null>(
    null
  );
  const [membershipSaving, setMembershipSaving] = useState(false);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setSelectedIdState(initialSelectedId);
    setIsNew(false);
  }, [initialSelectedId]);

  useEffect(() => {
    setActiveTabState(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setStaffRosterFilters((prev) => ({
      ...EMPTY_STAFF_ROSTER_FILTERS,
      ...initialStaffFilters,
      rosterId:
        initialStaffFilters.rosterId ||
        prev.rosterId ||
        initialSelectedId ||
        ''
    }));
  }, [initialSelectedId, initialStaffFilters]);

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

  const setActiveTab = useCallback(
    (tab: ManageRosterWorkspaceTab) => {
      setActiveTabState(tab);
      setIsNew(false);
      setDetailFormHighlight(false);
      setAssignSheetMode(null);
      setMoveConfirm(null);
      setRemoveTarget(null);

      if (tab === 'staff' && selectedId) {
        setStaffRosterFilters((prev) => ({
          ...prev,
          rosterId: prev.rosterId || selectedId
        }));
      }

      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'rosters') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams, selectedId]
  );

  const clearStaffRosterRegister = useCallback(() => {
    setStaffRosterRows([]);
    setStaffRosterLoaded(false);
    setSelectedStaffIds([]);
  }, []);

  const refreshRosterCatalog = useCallback(async () => {
    const listRes = await getManageRosterListAction();
    if (!listRes.isError && listRes.data) {
      setRecords(listRes.data);
    }
  }, []);

  const loadStaffRoster = useCallback(
    async (overrides?: StaffRosterFilterValues) => {
      const filters = overrides ?? staffRosterFilters;
      const rosterId = filters.rosterId.trim();
      if (!rosterId) {
        toast({
          variant: 'destructive',
          title: 'Roster required',
          description: 'Select a roster group before loading staff.'
        });
        return;
      }

      const roster = records.find((row) => row.id === rosterId);
      if (!roster) {
        toast({
          variant: 'destructive',
          title: 'Roster not found',
          description: 'Choose a roster from the Manage Rosters catalog.'
        });
        return;
      }

      try {
        setStaffRosterLoading(true);
        setStaffRosterFilters(filters);
        const result = await getStaffRosterMembersAction({
          rosterId,
          staffId: filters.staffId || undefined,
          departmentId: filters.departmentId || undefined,
          status: filters.status || undefined
        });
        if (result.isError || !result.data) {
          toast({
            variant: 'destructive',
            title: 'Could not load staff',
            description:
              (result.errors as { message?: string })?.message ??
              'Failed to load assigned staff for this roster.'
          });
          return;
        }

        setStaffRosterRows(result.data);
        setStaffRosterLoaded(true);
        setSelectedStaffIds([]);
        setSelectedId(rosterId);
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Could not load staff',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to load assigned staff for this roster.'
        });
      } finally {
        setStaffRosterLoading(false);
      }
    },
    [records, setSelectedId, staffRosterFilters, toast]
  );

  // Deep-link / refresh: auto-load when Assigned Staff tab opens with a roster in the URL.
  useEffect(() => {
    if (initialTab !== 'staff') return;
    const rosterId =
      initialStaffFilters.rosterId || initialSelectedId || '';
    if (!rosterId) return;
    void loadStaffRoster({
      ...EMPTY_STAFF_ROSTER_FILTERS,
      ...initialStaffFilters,
      rosterId
    });
    // Intentionally once on mount for the initial URL filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAssignSheet = useCallback((mode: StaffRosterAssignSheetMode) => {
    setAssignSheetMode(mode);
  }, []);

  const closeAssignSheet = useCallback(() => {
    setAssignSheetMode(null);
  }, []);

  const persistAssign = useCallback(
    async (args: {
      candidates: StaffRosterAssignCandidate[];
      targetRosterId: string;
      targetRosterCode: string;
      targetRosterName: string;
      confirmMove?: boolean;
    }) => {
      const locked = args.candidates.filter((c) => c.hasStandingAssignments);
      if (locked.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Roster membership locked',
          description: `${locked.length} staff member${locked.length === 1 ? ' has' : 's have'} standing shift assignment(s). Change or remove assignments in Shift Assignment first.`
        });
        return;
      }

      try {
        setMembershipSaving(true);
        const result = await assignStaffToManageRosterAction({
          rosterId: args.targetRosterId,
          staffIds: args.candidates.map((row) => row.id),
          confirmMove: args.confirmMove
        });

        if (
          result.isError &&
          result.data?.requiresMoveConfirm &&
          !args.confirmMove
        ) {
          const moversById = new Map(
            (result.data.movers ?? []).map((row) => [row.staffId, row])
          );
          const enriched = args.candidates.map((candidate) => {
            const mover = moversById.get(candidate.id);
            if (!mover) return candidate;
            return {
              ...candidate,
              currentRosterCode: mover.currentRosterCode,
              currentRosterName: mover.currentRosterName
            };
          });
          setMoveConfirm({
            candidates: enriched,
            targetRosterId: args.targetRosterId,
            targetRosterCode: args.targetRosterCode,
            targetRosterName: args.targetRosterName
          });
          return;
        }

        if (result.isError) {
          toast({
            variant: 'destructive',
            title: 'Could not assign staff',
            description:
              (result.errors as { message?: string })?.message ??
              'Failed to update roster membership.'
          });
          return;
        }

        setAssignSheetMode(null);
        setMoveConfirm(null);
        toast({
          variant: 'success',
          title: 'Staff registered',
          description: `${result.data?.updatedCount ?? 0} staff member${
            (result.data?.updatedCount ?? 0) === 1 ? '' : 's'
          } assigned to ${args.targetRosterName}.`
        });
        await Promise.all([
          loadStaffRoster({
            ...staffRosterFilters,
            rosterId: args.targetRosterId
          }),
          refreshRosterCatalog()
        ]);
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Could not assign staff',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to update roster membership.'
        });
      } finally {
        setMembershipSaving(false);
      }
    },
    [loadStaffRoster, refreshRosterCatalog, staffRosterFilters, toast]
  );

  const requestAssign = useCallback(
    (args: {
      candidates: StaffRosterAssignCandidate[];
      targetRosterId: string;
      targetRosterCode: string;
      targetRosterName: string;
    }) => {
      if (!args.candidates.length) {
        toast({
          variant: 'destructive',
          title: 'No staff selected',
          description: 'Select at least one staff member to assign.'
        });
        return;
      }

      const movers = args.candidates.filter((candidate) => {
        const code = candidate.currentRosterCode.trim().toUpperCase();
        return (
          code.length > 0 && code !== args.targetRosterCode.trim().toUpperCase()
        );
      });

      if (movers.length > 0) {
        setMoveConfirm({
          candidates: args.candidates,
          targetRosterId: args.targetRosterId,
          targetRosterCode: args.targetRosterCode,
          targetRosterName: args.targetRosterName
        });
        return;
      }

      void persistAssign(args);
    },
    [persistAssign, toast]
  );

  const confirmMoveAssign = useCallback(() => {
    if (!moveConfirm) return;
    void persistAssign({ ...moveConfirm, confirmMove: true });
  }, [moveConfirm, persistAssign]);

  const cancelMoveAssign = useCallback(() => {
    setMoveConfirm(null);
  }, []);

  const openRemoveConfirm = useCallback((row: StaffRosterMemberRow) => {
    setRemoveTarget(row);
  }, []);

  const closeRemoveConfirm = useCallback(() => {
    setRemoveTarget(null);
  }, []);

  const confirmRemove = useCallback(() => {
    if (!removeTarget) return;

    if (removeTarget.hasStandingAssignments) {
      toast({
        variant: 'destructive',
        title: 'Cannot remove membership',
        description:
          'This staff member has standing shift assignment(s). Change or remove assignments in Shift Assignment first.'
      });
      setRemoveTarget(null);
      return;
    }

    void (async () => {
      try {
        setMembershipSaving(true);
        const result = await removeStaffFromManageRosterAction({
          rosterId: removeTarget.rosterId,
          staffIds: [removeTarget.id]
        });
        if (result.isError) {
          toast({
            variant: 'destructive',
            title: 'Could not remove membership',
            description:
              (result.errors as { message?: string })?.message ??
              'Failed to clear roster membership.'
          });
          return;
        }

        setRemoveTarget(null);
        toast({
          variant: 'success',
          title: 'Removed from roster',
          description: `${removeTarget.staffName} is no longer on ${removeTarget.rosterName}.`
        });
        await Promise.all([
          loadStaffRoster({
            ...staffRosterFilters,
            rosterId: removeTarget.rosterId
          }),
          refreshRosterCatalog()
        ]);
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Could not remove membership',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to clear roster membership.'
        });
      } finally {
        setMembershipSaving(false);
      }
    })();
  }, [
    loadStaffRoster,
    refreshRosterCatalog,
    removeTarget,
    staffRosterFilters,
    toast
  ]);

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
      startNewManageRoster,
      departmentOptions,
      activeTab,
      setActiveTab,
      staffRosterFilters,
      setStaffRosterFilters,
      staffRosterRows,
      setStaffRosterRows,
      staffRosterLoading,
      staffRosterLoaded,
      setStaffRosterLoaded,
      selectedStaffIds,
      setSelectedStaffIds,
      loadStaffRoster,
      clearStaffRosterRegister,
      assignSheetMode,
      openAssignSheet,
      closeAssignSheet,
      moveConfirm,
      requestAssign,
      confirmMoveAssign,
      cancelMoveAssign,
      membershipSaving,
      removeTarget,
      openRemoveConfirm,
      closeRemoveConfirm,
      confirmRemove
    }),
    [
      records,
      selectedId,
      setSelectedId,
      isNew,
      search,
      detailFormHighlight,
      startNewManageRoster,
      departmentOptions,
      activeTab,
      setActiveTab,
      staffRosterFilters,
      staffRosterRows,
      staffRosterLoading,
      staffRosterLoaded,
      selectedStaffIds,
      loadStaffRoster,
      clearStaffRosterRegister,
      assignSheetMode,
      openAssignSheet,
      closeAssignSheet,
      moveConfirm,
      requestAssign,
      confirmMoveAssign,
      cancelMoveAssign,
      membershipSaving,
      removeTarget,
      openRemoveConfirm,
      closeRemoveConfirm,
      confirmRemove
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
