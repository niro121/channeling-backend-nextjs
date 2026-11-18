'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  AlertTriangle,
  Archive,
  Boxes,
  GripVertical,
  History,
  Loader2,
  PackageOpen,
  Plus,
  Search,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/hooks/use-toast';
import { usePermissions } from '@/components/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { InventoryIcon, InventoryItemVisual } from '@/components/inventory-icon';
import { InventoryUnitDialog } from '@/components/inventory-unit-dialog';
import {
  moveInventoryUnitsAction,
  setInventoryUnitsConditionAction,
} from '@/app/actions/inventory.actions';
import {
  INVENTORY_CONDITION,
  INVENTORY_CONDITION_OPTIONS,
  inventoryConditionMeta,
  type InventoryRoomRow,
  type InventoryUnitRow,
  type OptionRow,
} from '@/types/inventory';

type GroupBy = 'zone' | 'department';
const ALL = '__all__';
const STORE = 'store';

/** Draggable payload: a specific unit, or "one unit of this item" from a room/store stack. */
type DragData = { itemId: string; fromRoomId: string | null; unitIds: string[]; icon: string | null; label: string };

type Stack = {
  itemId: string;
  itemName: string;
  icon: string | null;
  hasImage: boolean;
  imageVersion: string | null;
  units: InventoryUnitRow[];
  broken: number;
  repair: number;
};

function stacksOf(units: InventoryUnitRow[]): Stack[] {
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
        broken: 0,
        repair: 0,
      };
      map.set(u.itemId, s);
    }
    s.units.push(u);
    if (u.condition === INVENTORY_CONDITION.broken) s.broken++;
    if (u.condition === INVENTORY_CONDITION.underRepair) s.repair++;
  }
  return [...map.values()].sort((a, b) => a.itemName.localeCompare(b.itemName));
}

/** Prefer moving a working unit first. */
function pickUnit(units: InventoryUnitRow[]) {
  return units.find((u) => u.condition === INVENTORY_CONDITION.available) ?? units[0];
}

export function RoomInventoryBoard({
  rooms,
  units: initialUnits,
  locations,
  zones,
  departments,
  locationId,
  groupBy,
  focusRoomId,
}: {
  rooms: InventoryRoomRow[];
  units: InventoryUnitRow[];
  locations: OptionRow[];
  zones: (OptionRow & { locationId: string | null })[];
  departments: OptionRow[];
  locationId: string | null;
  groupBy: GroupBy;
  focusRoomId: string | null;
}) {
  const { has, canAccess } = usePermissions();
  const canAssign = has('room-inventory', 'assign');
  const canEditUnits = has('inventory', 'edit');
  const canManage = canAccess('/inventory');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [units, setUnits] = useState(initialUnits);
  useEffect(() => setUnits(initialUnits), [initialUnits]);

  const [search, setSearch] = useState('');
  const [itemFilter, setItemFilter] = useState(ALL);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [openRoomId, setOpenRoomId] = useState<string | null>(focusRoomId);
  const [dialogUnit, setDialogUnit] = useState<{ unit: InventoryUnitRow; tab: 'details' | 'history' } | null>(null);
  const [dragging, setDragging] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const setParam = (key: string, value: string | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('roomId');
    router.push(`${pathname}?${sp.toString()}`);
  };

  // ==== DERIVED ==== //
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const unitsByRoom = useMemo(() => {
    const m = new Map<string, InventoryUnitRow[]>();
    for (const u of units) {
      const key = u.roomId && roomById.has(u.roomId) ? u.roomId : u.roomId ? null : STORE;
      if (!key) continue; // in a room of another branch
      if (key === STORE && locationId && u.locationId !== locationId) continue;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(u);
    }
    return m;
  }, [units, roomById, locationId]);

  const storeUnits = useMemo(
    () => (unitsByRoom.get(STORE) ?? []).filter((u) => u.condition !== INVENTORY_CONDITION.disposed),
    [unitsByRoom]
  );
  const disposedInStore = (unitsByRoom.get(STORE)?.length ?? 0) - storeUnits.length;
  const storeStacks = useMemo(() => stacksOf(storeUnits), [storeUnits]);

  const itemOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) m.set(u.itemId, u.itemName);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [units]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visibleRooms = rooms.filter((r) => {
      const ru = unitsByRoom.get(r.id) ?? [];
      if (issuesOnly && !ru.some((u) => u.condition === INVENTORY_CONDITION.broken || u.condition === INVENTORY_CONDITION.underRepair)) return false;
      if (itemFilter !== ALL && !ru.some((u) => u.itemId === itemFilter)) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        ru.some((u) => u.assetTag.toLowerCase().includes(q) || u.itemName.toLowerCase().includes(q))
      );
    });

    const known =
      groupBy === 'zone'
        ? zones.filter((z) => !locationId || z.locationId === locationId)
        : departments;
    const out: { id: string; name: string; rooms: InventoryRoomRow[] }[] = known.map((g) => ({
      id: g.id,
      name: g.name,
      rooms: [],
    }));
    const byId = new Map(out.map((g) => [g.id, g]));
    const none = { id: 'none', name: groupBy === 'zone' ? 'No zone' : 'No department', rooms: [] as InventoryRoomRow[] };
    for (const r of visibleRooms) {
      const gid = groupBy === 'zone' ? r.zoneId : r.departmentId;
      const g = gid ? byId.get(gid) : undefined;
      if (g) g.rooms.push(r);
      else if (gid) {
        // zone from another branch / unpublished department
        const extra = {
          id: gid,
          name: (groupBy === 'zone' ? r.zoneName : r.departmentName) ?? 'Unknown',
          rooms: [r],
        };
        out.push(extra);
        byId.set(gid, extra);
      } else none.rooms.push(r);
    }
    return [...out, none].filter((g) => g.rooms.length > 0);
  }, [rooms, unitsByRoom, zones, departments, groupBy, locationId, search, itemFilter, issuesOnly]);

  const totals = useMemo(() => {
    let inRooms = 0;
    let issues = 0;
    for (const r of rooms) {
      for (const u of unitsByRoom.get(r.id) ?? []) {
        inRooms++;
        if (u.condition === INVENTORY_CONDITION.broken || u.condition === INVENTORY_CONDITION.underRepair) issues++;
      }
    }
    return { inRooms, issues, store: storeUnits.length };
  }, [rooms, unitsByRoom, storeUnits]);

  // ==== MUTATIONS ==== //
  const move = (unitIds: string[], toRoomId: string | null) => {
    if (!canAssign || unitIds.length === 0) return;
    const before = units;
    const room = toRoomId ? roomById.get(toRoomId) : null;
    setUnits((prev) =>
      prev.map((u) =>
        unitIds.includes(u.id)
          ? {
              ...u,
              roomId: toRoomId,
              roomNumber: room?.number ?? null,
              zoneId: room?.zoneId ?? null,
              zoneName: room?.zoneName ?? null,
              departmentId: room?.departmentId ?? null,
              departmentName: room?.departmentName ?? null,
              locationId: room?.locationId ?? u.locationId,
              assignedAt: toRoomId ? new Date().toISOString() : null,
            }
          : u
      )
    );
    startTransition(async () => {
      const res = await moveInventoryUnitsAction({ unitIds, toRoomId, storeLocationId: toRoomId ? null : locationId });
      if (!res.success) {
        setUnits(before);
        toast({ variant: 'destructive', title: res.message ?? 'Could not move item' });
        return;
      }
      router.refresh();
    });
  };

  const setCondition = (unitIds: string[], condition: number) => {
    const before = units;
    setUnits((prev) => prev.map((u) => (unitIds.includes(u.id) ? { ...u, condition } : u)));
    startTransition(async () => {
      const res = await setInventoryUnitsConditionAction(unitIds, condition);
      if (!res.success) {
        setUnits(before);
        toast({ variant: 'destructive', title: res.message ?? 'Could not update condition' });
        return;
      }
      router.refresh();
    });
  };

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as DragData) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const data = e.active.data.current as DragData | undefined;
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!data || !overId) return;
    const toRoomId = overId === STORE ? null : overId.replace(/^room:/, '');
    if (toRoomId === data.fromRoomId) return;
    move(data.unitIds, toRoomId);
    const room = toRoomId ? roomById.get(toRoomId) : null;
    toast({ title: `${data.label} → ${room ? `Room ${room.number}` : 'Store'}` });
  };

  const openRoom = openRoomId ? roomById.get(openRoomId) ?? null : null;
  const otherGroupLabel = (r: InventoryRoomRow) => (groupBy === 'zone' ? r.departmentName : r.zoneName);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="space-y-4">
        {/* ==== HEADER ==== */}
        <Card className="rounded-lg border shadow-sm">
          <CardHeader className="flex flex-col gap-3 space-y-0 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-semibold">Room Inventory</CardTitle>
              <CardDescription>
                {canAssign
                  ? 'Drag items from the store onto a room, between rooms or back. Click a room to manage it.'
                  : 'What is in each room. Click a room for details.'}
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <Badge variant="secondary">{rooms.length} rooms</Badge>
                <Badge variant="secondary">{totals.inRooms} units in rooms</Badge>
                <Badge variant="secondary">{totals.store} in store</Badge>
                {totals.issues > 0 && (
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300">
                    {totals.issues} broken / under repair
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              {canManage && (
                <Button variant="outline" asChild>
                  <Link href="/inventory">
                    <Boxes className="size-4" /> Manage items
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2 border-t px-6 py-3">
            <Select value={locationId ?? ALL} onValueChange={(v) => setParam('locationId', v === ALL ? 'all' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All branches</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={groupBy} onValueChange={(v) => setParam('groupBy', v)}>
              <TabsList>
                <TabsTrigger value="zone">By zone</TabsTrigger>
                <TabsTrigger value="department">By department</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative min-w-44 flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search room, item or tag" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={itemFilter} onValueChange={setItemFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All items</SelectItem>
                {itemOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={issuesOnly ? 'default' : 'outline'} onClick={() => setIssuesOnly((v) => !v)}>
              <AlertTriangle className="size-4" /> Issues only
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ==== ROOMS ==== */}
          <div className="order-2 space-y-5 lg:order-1">
            {groups.length === 0 && (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                {rooms.length ? 'No rooms match the filters.' : 'No rooms in this branch yet.'}
              </Card>
            )}
            {groups.map((g) => {
              const count = g.rooms.reduce((n, r) => n + (unitsByRoom.get(r.id)?.length ?? 0), 0);
              return (
                <section key={g.id} className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-base font-semibold">{g.name}</h2>
                    <span className="text-xs text-muted-foreground">
                      {g.rooms.length} room{g.rooms.length === 1 ? '' : 's'} · {count} unit{count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {g.rooms.map((r) => (
                      <RoomCard
                        key={r.id}
                        room={r}
                        subLabel={otherGroupLabel(r)}
                        units={unitsByRoom.get(r.id) ?? []}
                        highlightItemId={itemFilter === ALL ? null : itemFilter}
                        canAssign={canAssign}
                        onOpen={() => setOpenRoomId(r.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* ==== STORE TRAY ==== */}
          <div className="order-1 lg:order-2">
            <StoreTray
              stacks={storeStacks}
              disposed={disposedInStore}
              canAssign={canAssign}
              branchSelected={Boolean(locationId)}
            />
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-lg">
            <InventoryIcon name={dragging.icon} />
            {dragging.label}
          </div>
        )}
      </DragOverlay>

      {/* ==== ROOM SHEET ==== */}
      <RoomSheet
        room={openRoom}
        onClose={() => setOpenRoomId(null)}
        units={openRoom ? unitsByRoom.get(openRoom.id) ?? [] : []}
        storeStacks={storeStacks}
        rooms={rooms}
        canAssign={canAssign}
        pending={pending}
        onMove={move}
        onCondition={setCondition}
        onOpenUnit={(unit, tab) => setDialogUnit({ unit, tab })}
      />

      <InventoryUnitDialog
        unit={dialogUnit?.unit ?? null}
        defaultTab={dialogUnit?.tab ?? 'details'}
        onOpenChange={(o) => !o && setDialogUnit(null)}
        locations={locations}
        canEdit={canEditUnits}
        onSaved={() => router.refresh()}
      />
    </DndContext>
  );
}

// ==== ROOM CARD ==== //

function RoomCard({
  room,
  subLabel,
  units,
  highlightItemId,
  canAssign,
  onOpen,
}: {
  room: InventoryRoomRow;
  subLabel: string | null;
  units: InventoryUnitRow[];
  highlightItemId: string | null;
  canAssign: boolean;
  onOpen: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `room:${room.id}`, disabled: !canAssign });
  const stacks = stacksOf(units);
  const issues = stacks.reduce((n, s) => n + s.broken + s.repair, 0);

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className={cn(
        'group flex min-h-32 cursor-pointer flex-col rounded-lg border bg-card p-3 text-left shadow-sm transition hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isOver && 'border-primary bg-primary/5 ring-2 ring-primary/40',
        issues > 0 && !isOver && 'border-red-300 dark:border-red-900'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">Room {room.number}</p>
          <p className="truncate text-xs text-muted-foreground">{subLabel ?? (room.description || ' ')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {issues > 0 && (
            <Badge className="gap-1 bg-red-100 px-1.5 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle className="size-3" /> {issues}
            </Badge>
          )}
          <Badge variant="secondary" className="px-1.5 tabular-nums">
            {units.length}
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
        {stacks.length === 0 && (
          <span className="text-xs text-muted-foreground">{canAssign ? 'Empty. Drop items here' : 'No items'}</span>
        )}
        {stacks.map((s) => (
          <StackChip
            key={s.itemId}
            stack={s}
            fromRoomId={room.id}
            canDrag={canAssign}
            dim={Boolean(highlightItemId && highlightItemId !== s.itemId)}
          />
        ))}
      </div>
    </div>
  );
}

function StackChip({
  stack,
  fromRoomId,
  canDrag,
  dim,
}: {
  stack: Stack;
  fromRoomId: string;
  canDrag: boolean;
  dim: boolean;
}) {
  const unit = pickUnit(stack.units);
  const data: DragData = {
    itemId: stack.itemId,
    fromRoomId,
    unitIds: unit ? [unit.id] : [],
    icon: stack.icon,
    label: `${stack.itemName} (${unit?.assetTag ?? ''})`,
  };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `chip:${fromRoomId}:${stack.itemId}`,
    data,
    disabled: !canDrag,
  });
  return (
    <span
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      title={`${stack.itemName}: ${stack.units.length}${stack.broken ? `, ${stack.broken} broken` : ''}${stack.repair ? `, ${stack.repair} under repair` : ''}${canDrag ? ' (drag to move one)' : ''}`}
      className={cn(
        'relative inline-flex touch-none select-none items-center gap-1 rounded-md border bg-background px-1.5 py-1 text-xs',
        canDrag && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        dim && 'opacity-30'
      )}
    >
      <InventoryIcon name={stack.icon} className="size-3.5" />
      <span className="max-w-24 truncate">{stack.itemName}</span>
      <span className="font-semibold tabular-nums">{stack.units.length}</span>
      {(stack.broken > 0 || stack.repair > 0) && (
        <span className="absolute -right-1 -top-1 flex gap-0.5">
          {stack.broken > 0 && <span className="size-2 rounded-full bg-red-500 ring-2 ring-background" />}
          {stack.repair > 0 && <span className="size-2 rounded-full bg-amber-500 ring-2 ring-background" />}
        </span>
      )}
    </span>
  );
}

// ==== STORE TRAY ==== //

function StoreTray({
  stacks,
  disposed,
  canAssign,
  branchSelected,
}: {
  stacks: Stack[];
  disposed: number;
  canAssign: boolean;
  branchSelected: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: STORE, disabled: !canAssign });
  const total = stacks.reduce((n, s) => n + s.units.length, 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm lg:sticky lg:top-4',
        isOver && 'border-primary bg-primary/5 ring-2 ring-primary/40'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Archive className="size-4 text-muted-foreground" />
        <h2 className="font-semibold">In store</h2>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {total}
        </Badge>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {canAssign ? 'Drag onto a room. Drop a room item here to return it.' : 'Not assigned to any room.'}
        {!branchSelected && ' Showing all branches.'}
      </p>
      <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
        {stacks.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-6 text-center text-xs text-muted-foreground">
            <PackageOpen className="size-6" />
            Nothing in store
          </div>
        )}
        {stacks.map((s) => (
          <TrayRow key={s.itemId} stack={s} canDrag={canAssign} />
        ))}
      </div>
      {disposed > 0 && <p className="mt-2 text-xs text-muted-foreground">{disposed} disposed unit(s) hidden.</p>}
    </div>
  );
}

function TrayRow({ stack, canDrag }: { stack: Stack; canDrag: boolean }) {
  const unit = pickUnit(stack.units);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `tray:${stack.itemId}`,
    data: {
      itemId: stack.itemId,
      fromRoomId: null,
      unitIds: unit ? [unit.id] : [],
      icon: stack.icon,
      label: `${stack.itemName} (${unit?.assetTag ?? ''})`,
    } satisfies DragData,
    disabled: !canDrag,
  });
  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={cn(
        'flex touch-none select-none items-center gap-2 rounded-md border bg-background p-1.5',
        canDrag && 'cursor-grab active:cursor-grabbing hover:border-primary/50',
        isDragging && 'opacity-40'
      )}
    >
      {canDrag && <GripVertical className="size-4 shrink-0 text-muted-foreground" />}
      <InventoryItemVisual
        itemId={stack.itemId}
        icon={stack.icon}
        hasImage={stack.hasImage}
        imageVersion={stack.imageVersion}
        className="size-8"
        iconClassName="size-4"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{stack.itemName}</p>
        {(stack.broken > 0 || stack.repair > 0) && (
          <p className="text-xs text-muted-foreground">
            {stack.broken > 0 && <span className="text-red-600 dark:text-red-400">{stack.broken} broken </span>}
            {stack.repair > 0 && <span className="text-amber-600 dark:text-amber-400">{stack.repair} repair</span>}
          </p>
        )}
      </div>
      <span className="text-sm font-semibold tabular-nums">{stack.units.length}</span>
    </div>
  );
}

// ==== ROOM SHEET (click fallback) ==== //

function RoomSheet({
  room,
  onClose,
  units,
  storeStacks,
  rooms,
  canAssign,
  pending,
  onMove,
  onCondition,
  onOpenUnit,
}: {
  room: InventoryRoomRow | null;
  onClose: () => void;
  units: InventoryUnitRow[];
  storeStacks: Stack[];
  rooms: InventoryRoomRow[];
  canAssign: boolean;
  pending: boolean;
  onMove: (unitIds: string[], toRoomId: string | null) => void;
  onCondition: (unitIds: string[], condition: number) => void;
  onOpenUnit: (unit: InventoryUnitRow, tab: 'details' | 'history') => void;
}) {
  const [addItem, setAddItem] = useState('');
  const [addQty, setAddQty] = useState('1');
  useEffect(() => {
    setAddItem('');
    setAddQty('1');
  }, [room?.id]);

  const sorted = [...units].sort((a, b) => a.itemName.localeCompare(b.itemName) || a.assetTag.localeCompare(b.assetTag));
  const addStack = storeStacks.find((s) => s.itemId === addItem);
  const addMax = addStack?.units.length ?? 0;

  const addFromStore = () => {
    if (!room || !addStack) return;
    const qty = Math.min(Math.max(1, Number.parseInt(addQty || '1', 10) || 1), addMax);
    const ordered = [...addStack.units].sort(
      (a, b) => Number(a.condition !== INVENTORY_CONDITION.available) - Number(b.condition !== INVENTORY_CONDITION.available)
    );
    onMove(ordered.slice(0, qty).map((u) => u.id), room.id);
    setAddItem('');
    setAddQty('1');
  };

  return (
    <Sheet open={Boolean(room)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {room && (
          <>
            <SheetHeader className="border-b p-4 text-left">
              <SheetTitle>Room {room.number}</SheetTitle>
              <SheetDescription>
                {[room.zoneName, room.departmentName].filter(Boolean).join(' · ') || 'No zone or department'}
                {room.description ? ` · ${room.description}` : ''}
              </SheetDescription>
            </SheetHeader>

            {canAssign && (
              <div className="space-y-2 border-b p-4">
                <Label>Add from store</Label>
                <div className="flex gap-2">
                  <Select value={addItem} onValueChange={setAddItem}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={storeStacks.length ? 'Choose item' : 'Store is empty'} />
                    </SelectTrigger>
                    <SelectContent>
                      {storeStacks.map((s) => (
                        <SelectItem key={s.itemId} value={s.itemId}>
                          <span className="flex items-center gap-2">
                            <InventoryIcon name={s.icon} /> {s.itemName} ({s.units.length})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={addMax || 1}
                    className="w-20"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    disabled={!addStack}
                  />
                  <Button onClick={addFromStore} disabled={!addStack || pending}>
                    <Plus className="size-4" /> Add
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <p className="text-sm font-medium">
                {units.length} unit{units.length === 1 ? '' : 's'} in this room
              </p>
              {sorted.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing assigned yet.</p>}
              {sorted.map((u) => {
                const meta = inventoryConditionMeta(u.condition);
                return (
                  <div key={u.id} className="space-y-2 rounded-md border p-2.5">
                    <div className="flex items-center gap-2">
                      <InventoryItemVisual
                        itemId={u.itemId}
                        icon={u.itemIcon}
                        hasImage={u.itemHasImage}
                        imageVersion={u.itemImageVersion}
                        className="size-9"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.itemName}</p>
                        <button
                          type="button"
                          className="font-mono text-xs text-primary hover:underline"
                          onClick={() => onOpenUnit(u, 'details')}
                        >
                          {u.assetTag}
                        </button>
                      </div>
                      <Button variant="ghost" size="icon" className="size-8" title="History" onClick={() => onOpenUnit(u, 'history')}>
                        <History className="size-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={String(u.condition)}
                        onValueChange={(v) => onCondition([u.id], Number(v))}
                        disabled={!canAssign || pending}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${meta.dotClass}`} />
                            {meta.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {INVENTORY_CONDITION_OPTIONS.filter((o) => o.value !== INVENTORY_CONDITION.disposed).map((o) => (
                            <SelectItem key={o.value} value={String(o.value)}>
                              <span className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${o.dotClass}`} /> {o.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {canAssign && (
                        <>
                          <Select value="" onValueChange={(v) => onMove([u.id], v)} disabled={pending}>
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue placeholder="Move to…" />
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
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onMove([u.id], null)} disabled={pending}>
                            <Undo2 className="size-3.5" /> To store
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
