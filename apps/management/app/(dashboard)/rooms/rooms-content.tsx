'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Undo2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeaderActions } from '../header-actions';
import { InventoryIcon, InventoryItemVisual } from '@/components/inventory-icon';
import {
  getRoomInventoryAction,
  moveUnitsAction,
  setConditionAction,
  unitHistoryAction
} from '@/app/actions/room-inventory.actions';
import {
  INVENTORY_CONDITION,
  INVENTORY_CONDITION_OPTIONS,
  conditionMeta,
  type MovementRow,
  type RoomInventoryData,
  type RoomRow,
  type UnitRow
} from '@/types/room-inventory';

type GroupBy = 'zone' | 'department';

type Stack = {
  itemId: string;
  itemName: string;
  icon: string | null;
  hasImage: boolean;
  imageVersion: string | null;
  units: UnitRow[];
  issues: number;
};

const isIssue = (u: UnitRow) =>
  u.condition === INVENTORY_CONDITION.broken || u.condition === INVENTORY_CONDITION.underRepair;

function stacksOf(units: UnitRow[]): Stack[] {
  const map = new Map<string, Stack>();
  for (const u of units) {
    let s = map.get(u.itemId);
    if (!s) {
      s = {
        itemId: u.itemId,
        itemName: u.itemName,
        icon: u.itemIcon,
        hasImage: u.itemHasImage,
        imageVersion: u.itemImageVersion,
        units: [],
        issues: 0
      };
      map.set(u.itemId, s);
    }
    s.units.push(u);
    if (isIssue(u)) s.issues++;
  }
  return [...map.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
}

/** Working units first, so "add 2 flasks" never picks a broken one when a good one exists. */
function workingFirst(units: UnitRow[]) {
  return [...units].sort(
    (a, b) =>
      Number(a.condition !== INVENTORY_CONDITION.available) - Number(b.condition !== INVENTORY_CONDITION.available) ||
      a.assetTag.localeCompare(b.assetTag)
  );
}

export function RoomsContent({ initialLocationId }: { initialLocationId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [data, setData] = useState<RoomInventoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [locationId, setLocationId] = useState<string | null>(initialLocationId);
  const [groupBy, setGroupBy] = useState<GroupBy>('zone');
  const [search, setSearch] = useState('');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);

  const load = useCallback(
    async (loc: string | null, quiet = false) => {
      if (!quiet) setLoading(true);
      const res = await getRoomInventoryAction(loc);
      if (res.success) {
        setData(res.data);
        setError(null);
        if (res.data.locationId !== loc) setLocationId(res.data.locationId);
      } else {
        setError(res.message);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    void load(locationId);
  }, [load, locationId]);

  const changeLocation = (id: string) => {
    setLocationId(id);
    setOpenRoomId(null);
    router.replace(`${pathname}?locationId=${id}`, { scroll: false });
  };

  // ==== DERIVED ==== //
  const rooms = useMemo(() => data?.rooms ?? [], [data]);
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const { unitsByRoom, storeUnits } = useMemo(() => {
    const byRoom = new Map<string, UnitRow[]>();
    const store: UnitRow[] = [];
    for (const u of data?.units ?? []) {
      if (u.roomId) {
        if (!roomById.has(u.roomId)) continue;
        if (!byRoom.has(u.roomId)) byRoom.set(u.roomId, []);
        byRoom.get(u.roomId)!.push(u);
      } else if (u.condition !== INVENTORY_CONDITION.disposed) {
        store.push(u);
      }
    }
    return { unitsByRoom: byRoom, storeUnits: store };
  }, [data, roomById]);
  const storeStacks = useMemo(() => stacksOf(storeUnits), [storeUnits]);

  const groups = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const visible = rooms.filter((r) => {
      const ru = unitsByRoom.get(r.id) ?? [];
      if (issuesOnly && !ru.some(isIssue)) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        ru.some((u) => u.itemName.toLowerCase().includes(q) || u.assetTag.toLowerCase().includes(q))
      );
    });
    const known = groupBy === 'zone' ? data.zones : data.departments;
    const out = known.map((g) => ({ id: g.id, name: g.name, rooms: [] as RoomRow[] }));
    const byId = new Map(out.map((g) => [g.id, g]));
    const none = { id: 'none', name: groupBy === 'zone' ? 'No zone' : 'No department', rooms: [] as RoomRow[] };
    for (const r of visible) {
      const gid = groupBy === 'zone' ? r.zoneId : r.departmentId;
      const g = gid ? byId.get(gid) : undefined;
      if (g) g.rooms.push(r);
      else if (gid) {
        const extra = { id: gid, name: (groupBy === 'zone' ? r.zoneName : r.departmentName) ?? 'Other', rooms: [r] };
        out.push(extra);
        byId.set(gid, extra);
      } else none.rooms.push(r);
    }
    return [...out, none].filter((g) => g.rooms.length > 0);
  }, [data, rooms, unitsByRoom, groupBy, search, issuesOnly]);

  const issueCount = useMemo(
    () => [...unitsByRoom.values()].reduce((n, us) => n + us.filter(isIssue).length, 0),
    [unitsByRoom]
  );

  // ==== MUTATIONS ==== //
  const can = data?.can ?? { assign: false, condition: false };

  const mutate = (fn: () => Promise<{ success: boolean; message?: string }>, done: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast({ variant: 'destructive', title: res.message ?? 'Could not save' });
        return;
      }
      toast({ title: done });
      await load(locationId, true);
    });

  const move = (unitIds: string[], toRoomId: string | null, label: string) =>
    mutate(() => moveUnitsAction({ unitIds, toRoomId, storeLocationId: toRoomId ? null : locationId }), label);

  const setCondition = (unitIds: string[], condition: number) =>
    mutate(() => setConditionAction({ unitIds, condition }), `Marked ${conditionMeta(condition).label}`);

  const openRoom = openRoomId ? roomById.get(openRoomId) ?? null : null;

  // ==== RENDER ==== //
  if (loading && !data) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => load(locationId)}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <HeaderActions>
        <Button variant="ghost" size="icon" onClick={() => load(locationId, true)} aria-label="Refresh" disabled={pending}>
          {pending || loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </Button>
      </HeaderActions>

      {/* ==== FILTERS ==== */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {data.locations.length > 1 && (
            <Select value={locationId ?? undefined} onValueChange={changeLocation}>
              <SelectTrigger className="h-10 flex-1 rounded-xl">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {data.locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex shrink-0 rounded-xl bg-muted p-1 text-sm">
            {(['zone', 'department'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-medium transition-colors',
                  groupBy === g ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                {g === 'zone' ? 'Zones' : 'Departments'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9"
              placeholder="Room, item or tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIssuesOnly((v) => !v)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors',
              issuesOnly ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300' : 'text-muted-foreground'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            {issueCount > 0 ? issueCount : 'Issues'}
          </button>
        </div>
      </div>

      {/* ==== STORE ==== */}
      <button
        type="button"
        onClick={() => setStoreOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-sm active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
          <Archive className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">In store</span>
          <span className="block text-xs text-muted-foreground">
            {storeUnits.length} unit{storeUnits.length === 1 ? '' : 's'} · {storeStacks.length} item type
            {storeStacks.length === 1 ? '' : 's'} not in any room
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* ==== ROOMS ==== */}
      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {rooms.length ? 'No rooms match.' : 'No rooms in this branch.'}
        </p>
      )}
      {groups.map((g) => {
        const isCollapsed = collapsed.has(g.id);
        const count = g.rooms.reduce((n, r) => n + (unitsByRoom.get(r.id)?.length ?? 0), 0);
        return (
          <section key={g.id} className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-1 text-left"
              onClick={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(g.id)) next.delete(g.id);
                  else next.add(g.id);
                  return next;
                })
              }
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="flex-1 font-semibold">{g.name}</span>
              <span className="text-xs text-muted-foreground">
                {g.rooms.length} room{g.rooms.length === 1 ? '' : 's'} · {count}
              </span>
            </button>
            {!isCollapsed && (
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                {g.rooms.map((r, i) => (
                  <RoomRowButton
                    key={r.id}
                    room={r}
                    units={unitsByRoom.get(r.id) ?? []}
                    subLabel={groupBy === 'zone' ? r.departmentName : r.zoneName}
                    divider={i > 0}
                    onOpen={() => setOpenRoomId(r.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <RoomSheet
        room={openRoom}
        units={openRoom ? unitsByRoom.get(openRoom.id) ?? [] : []}
        rooms={rooms}
        storeStacks={storeStacks}
        can={can}
        pending={pending}
        onClose={() => setOpenRoomId(null)}
        onMove={move}
        onCondition={setCondition}
      />

      <StoreSheet
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        stacks={storeStacks}
        rooms={rooms}
        canAssign={can.assign}
        pending={pending}
        onPlace={(unitIds, roomId) => {
          const room = roomById.get(roomId);
          move(unitIds, roomId, `Added to Room ${room?.number ?? ''}`);
        }}
      />
    </div>
  );
}

// ==== ROOM ROW ==== //

function RoomRowButton({
  room,
  units,
  subLabel,
  divider,
  onOpen
}: {
  room: RoomRow;
  units: UnitRow[];
  subLabel: string | null;
  divider: boolean;
  onOpen: () => void;
}) {
  const stacks = stacksOf(units);
  const issues = stacks.reduce((n, s) => n + s.issues, 0);
  const shown = stacks.slice(0, 4);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('flex w-full items-center gap-3 p-3 text-left active:bg-muted/60', divider && 'border-t')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
        {room.number.length <= 4 ? room.number : room.number.slice(0, 3) + '…'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">Room {room.number}</span>
          {issues > 0 && (
            <Badge className="h-5 gap-1 bg-red-100 px-1.5 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> {issues}
            </Badge>
          )}
        </span>
        {subLabel && <span className="block truncate text-xs text-muted-foreground">{subLabel}</span>}
        <span className="mt-1.5 flex flex-wrap gap-1">
          {shown.length === 0 && <span className="text-xs text-muted-foreground">No items</span>}
          {shown.map((s) => (
            <span key={s.itemId} className="relative inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs">
              <InventoryIcon name={s.icon} className="h-3.5 w-3.5" />
              <span className="font-semibold tabular-nums">{s.units.length}</span>
              {s.issues > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />}
            </span>
          ))}
          {stacks.length > shown.length && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">+{stacks.length - shown.length}</span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-semibold tabular-nums">{units.length}</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </span>
    </button>
  );
}

// ==== QUANTITY STEPPER ==== //

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-xl border">
      <button type="button" className="p-2.5 disabled:opacity-40" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Less">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className="p-2.5 disabled:opacity-40" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="More">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==== ROOM SHEET ==== //

function RoomSheet({
  room,
  units,
  rooms,
  storeStacks,
  can,
  pending,
  onClose,
  onMove,
  onCondition
}: {
  room: RoomRow | null;
  units: UnitRow[];
  rooms: RoomRow[];
  storeStacks: Stack[];
  can: { assign: boolean; condition: boolean };
  pending: boolean;
  onClose: () => void;
  onMove: (unitIds: string[], toRoomId: string | null, label: string) => void;
  onCondition: (unitIds: string[], condition: number) => void;
}) {
  const [addItemId, setAddItemId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<{ unitId: string; rows: MovementRow[] | null } | null>(null);

  useEffect(() => {
    setAddItemId('');
    setAddQty(1);
    setExpanded(null);
    setHistory(null);
  }, [room?.id]);

  const addStack = storeStacks.find((s) => s.itemId === addItemId);
  const stacks = stacksOf(units);

  const showHistory = async (unitId: string) => {
    if (history?.unitId === unitId) {
      setHistory(null);
      return;
    }
    setHistory({ unitId, rows: null });
    const res = await unitHistoryAction(unitId);
    setHistory({ unitId, rows: res.success ? res.data : [] });
  };

  return (
    <Sheet open={Boolean(room)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="flex max-h-[88dvh] flex-col gap-0 rounded-t-3xl p-0 pb-safe">
        {room && (
          <>
            <SheetHeader className="border-b px-4 pb-3 pt-5 text-left">
              <SheetTitle>Room {room.number}</SheetTitle>
              <SheetDescription>
                {[room.zoneName, room.departmentName].filter(Boolean).join(' · ') || 'No zone or department'}
                {room.description ? ` · ${room.description}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {can.assign && (
                <div className="space-y-2 rounded-2xl bg-muted/50 p-3">
                  <p className="text-sm font-medium">Add from store</p>
                  {storeStacks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nothing in store for this branch.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={addItemId}
                        onValueChange={(v) => {
                          setAddItemId(v);
                          setAddQty(1);
                        }}
                      >
                        <SelectTrigger className="h-11 min-w-0 flex-1 rounded-xl bg-background">
                          <SelectValue placeholder="Choose item" />
                        </SelectTrigger>
                        <SelectContent>
                          {storeStacks.map((s) => (
                            <SelectItem key={s.itemId} value={s.itemId}>
                              {s.itemName} ({s.units.length})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addStack && <Stepper value={addQty} max={addStack.units.length} onChange={setAddQty} />}
                      <Button
                        className="h-11 rounded-xl"
                        disabled={!addStack || pending}
                        onClick={() => {
                          if (!addStack) return;
                          const ids = workingFirst(addStack.units).slice(0, addQty).map((u) => u.id);
                          onMove(ids, room.id, `Added ${ids.length} ${addStack.itemName}`);
                          setAddItemId('');
                          setAddQty(1);
                        }}
                      >
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {stacks.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <PackageOpen className="h-8 w-8" />
                  Nothing in this room yet.
                </div>
              )}

              {stacks.map((s) => (
                <div key={s.itemId} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <InventoryItemVisual
                      itemId={s.itemId}
                      icon={s.icon}
                      hasImage={s.hasImage}
                      imageVersion={s.imageVersion}
                      className="h-9 w-9"
                    />
                    <span className="flex-1 font-medium">{s.itemName}</span>
                    <Badge variant="secondary">{s.units.length}</Badge>
                  </div>
                  <div className="overflow-hidden rounded-2xl border">
                    {s.units.map((u, i) => {
                      const meta = conditionMeta(u.condition);
                      const open = expanded === u.id;
                      return (
                        <div key={u.id} className={cn(i > 0 && 'border-t')}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-muted/60"
                            onClick={() => setExpanded(open ? null : u.id)}
                          >
                            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', meta.dotClass)} />
                            <span className="flex-1 font-mono text-sm">{u.assetTag}</span>
                            <span className="text-xs text-muted-foreground">{meta.label}</span>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
                          </button>
                          {open && (
                            <div className="space-y-3 bg-muted/40 px-3 pb-3 pt-1">
                              {can.condition && (
                                <div className="grid grid-cols-3 gap-1.5">
                                  {INVENTORY_CONDITION_OPTIONS.filter((o) => o.value !== INVENTORY_CONDITION.disposed).map((o) => (
                                    <button
                                      key={o.value}
                                      type="button"
                                      disabled={pending || o.value === u.condition}
                                      onClick={() => onCondition([u.id], o.value)}
                                      className={cn(
                                        'flex items-center justify-center gap-1.5 rounded-xl border bg-background px-2 py-2 text-xs font-medium disabled:opacity-100',
                                        o.value === u.condition && 'border-primary ring-1 ring-primary'
                                      )}
                                    >
                                      <span className={cn('h-2 w-2 rounded-full', o.dotClass)} /> {o.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {can.assign && (
                                <div className="flex gap-2">
                                  <Select
                                    value=""
                                    onValueChange={(v) => {
                                      const to = rooms.find((r) => r.id === v);
                                      onMove([u.id], v, `Moved to Room ${to?.number ?? ''}`);
                                    }}
                                  >
                                    <SelectTrigger className="h-10 flex-1 rounded-xl bg-background" disabled={pending}>
                                      <SelectValue placeholder="Move to room…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {rooms
                                        .filter((r) => r.id !== room.id)
                                        .map((r) => (
                                          <SelectItem key={r.id} value={r.id}>
                                            Room {r.number}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    className="h-10 rounded-xl bg-background"
                                    disabled={pending}
                                    onClick={() => onMove([u.id], null, 'Returned to store')}
                                  >
                                    <Undo2 className="h-4 w-4" /> Store
                                  </Button>
                                </div>
                              )}
                              <button
                                type="button"
                                className="flex items-center gap-1.5 text-xs font-medium text-primary"
                                onClick={() => showHistory(u.id)}
                              >
                                <History className="h-3.5 w-3.5" /> {history?.unitId === u.id ? 'Hide history' : 'History'}
                              </button>
                              {history?.unitId === u.id && <HistoryList rows={history.rows} />}
                              {u.serialNo && <p className="text-xs text-muted-foreground">S/N {u.serialNo}</p>}
                              {u.notes && <p className="text-xs text-muted-foreground">{u.notes}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function HistoryList({ rows }: { rows: MovementRow[] | null }) {
  if (!rows) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No moves or changes yet.</p>;
  return (
    <ol className="space-y-2">
      {rows.slice(0, 20).map((h) => {
        const moved = h.fromRoom !== h.toRoom;
        const changed = h.toCondition != null && h.fromCondition !== h.toCondition;
        return (
          <li key={h.id} className="rounded-xl bg-background p-2 text-xs">
            {moved && (
              <span className="flex items-center gap-1">
                {h.fromRoom ? `Room ${h.fromRoom}` : 'Store'} <ArrowRight className="h-3 w-3" />
                <b>{h.toRoom ? `Room ${h.toRoom}` : 'Store'}</b>
              </span>
            )}
            {changed && (
              <span className="flex items-center gap-1">
                {h.fromCondition != null ? conditionMeta(h.fromCondition).label : '—'} <ArrowRight className="h-3 w-3" />
                <b>{conditionMeta(h.toCondition!).label}</b>
              </span>
            )}
            {h.note && <span className="block text-muted-foreground">{h.note}</span>}
            <span className="block text-muted-foreground">
              {new Date(h.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {h.byName ? ` · ${h.byName}` : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ==== STORE SHEET ==== //

function StoreSheet({
  open,
  onClose,
  stacks,
  rooms,
  canAssign,
  pending,
  onPlace
}: {
  open: boolean;
  onClose: () => void;
  stacks: Stack[];
  rooms: RoomRow[];
  canAssign: boolean;
  pending: boolean;
  onPlace: (unitIds: string[], roomId: string) => void;
}) {
  const [placing, setPlacing] = useState<{ itemId: string; roomId: string; qty: number } | null>(null);
  useEffect(() => {
    if (!open) setPlacing(null);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="flex max-h-[88dvh] flex-col gap-0 rounded-t-3xl p-0 pb-safe">
        <SheetHeader className="border-b px-4 pb-3 pt-5 text-left">
          <SheetTitle>In store</SheetTitle>
          <SheetDescription>Items not placed in any room{canAssign ? '. Tap one to place it.' : '.'}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {stacks.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <PackageOpen className="h-8 w-8" />
              Nothing in store.
            </div>
          )}
          {stacks.map((s) => {
            const isPlacing = placing?.itemId === s.itemId;
            return (
              <div key={s.itemId} className="rounded-2xl border">
                <button
                  type="button"
                  disabled={!canAssign}
                  onClick={() => setPlacing(isPlacing ? null : { itemId: s.itemId, roomId: '', qty: 1 })}
                  className="flex w-full items-center gap-3 p-3 text-left disabled:cursor-default"
                >
                  <InventoryItemVisual itemId={s.itemId} icon={s.icon} hasImage={s.hasImage} imageVersion={s.imageVersion} className="h-10 w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.itemName}</span>
                    {s.issues > 0 && <span className="text-xs text-red-600 dark:text-red-400">{s.issues} broken / under repair</span>}
                  </span>
                  <span className="text-lg font-semibold tabular-nums">{s.units.length}</span>
                </button>
                {isPlacing && placing && (
                  <div className="flex flex-wrap gap-2 border-t bg-muted/40 p-3">
                    <Select value={placing.roomId} onValueChange={(v) => setPlacing({ ...placing, roomId: v })}>
                      <SelectTrigger className="h-11 min-w-0 flex-1 rounded-xl bg-background">
                        <SelectValue placeholder="Choose room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            Room {r.number}
                            {r.zoneName ? ` · ${r.zoneName}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Stepper value={placing.qty} max={s.units.length} onChange={(qty) => setPlacing({ ...placing, qty })} />
                    <Button
                      className="h-11 rounded-xl"
                      disabled={!placing.roomId || pending}
                      onClick={() => {
                        onPlace(workingFirst(s.units).slice(0, placing.qty).map((u) => u.id), placing.roomId);
                        setPlacing(null);
                      }}
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Place
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
