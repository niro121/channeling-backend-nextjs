'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/hooks/use-toast';
import { usePermissions } from '@/components/hooks/use-permissions';
import { InventoryIcon, InventoryIconPicker, InventoryItemVisual } from '@/components/inventory-icon';
import { ConditionBadge, InventoryUnitDialog } from '@/components/inventory-unit-dialog';
import {
  addInventoryUnitsAction,
  deleteInventoryCategoryAction,
  deleteInventoryItemAction,
  deleteInventoryUnitsAction,
  saveInventoryCategoryAction,
  setInventoryUnitsConditionAction,
} from '@/app/actions/inventory.actions';
import {
  INVENTORY_CONDITION_OPTIONS,
  type InventoryCategoryRow,
  type InventoryItemRow,
  type InventoryUnitRow,
  type OptionRow,
} from '@/types/inventory';
import { ItemDialog } from './item-dialog';

const ALL = '__all__';
const PAGE = 200;

type Confirm = { title: string; description: string; run: () => Promise<{ success: boolean; message?: string }> };

export function InventoryManager({
  items,
  units,
  categories,
  locations,
}: {
  items: InventoryItemRow[];
  units: InventoryUnitRow[];
  categories: InventoryCategoryRow[];
  locations: OptionRow[];
}) {
  const { has, canAccess } = usePermissions();
  const perms = {
    canAdd: has('inventory', 'add'),
    canEdit: has('inventory', 'edit'),
    canDelete: has('inventory', 'delete'),
    canViewBoard: canAccess('/room-inventory'),
  };
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState('items');

  // dialogs
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: InventoryItemRow | null }>({ open: false, item: null });
  const [unitDialog, setUnitDialog] = useState<{ unit: InventoryUnitRow | null; tab: 'details' | 'history' }>({ unit: null, tab: 'details' });
  const [addUnits, setAddUnits] = useState<{ item: InventoryItemRow; count: string; locationId: string } | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{ id: string | null; name: string; icon: string | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  // item filters
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState(ALL);

  // unit filters
  const [unitSearch, setUnitSearch] = useState('');
  const [unitItem, setUnitItem] = useState(ALL);
  const [unitCondition, setUnitCondition] = useState(ALL);
  const [unitLocation, setUnitLocation] = useState(ALL);
  const [unitPlace, setUnitPlace] = useState(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);

  const refresh = () => router.refresh();

  const run = (fn: () => Promise<{ success: boolean; message?: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      toast({ variant: res.success ? 'default' : 'destructive', title: res.message ?? (res.success ? 'Done' : 'Failed') });
      if (res.success) {
        after?.();
        refresh();
      }
    });

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return items.filter(
      (i) =>
        (itemCategory === ALL || (itemCategory === 'none' ? !i.categoryId : i.categoryId === itemCategory)) &&
        (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }, [items, itemSearch, itemCategory]);

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    return units.filter(
      (u) =>
        (unitItem === ALL || u.itemId === unitItem) &&
        (unitCondition === ALL || String(u.condition) === unitCondition) &&
        (unitLocation === ALL || u.locationId === unitLocation) &&
        (unitPlace === ALL || (unitPlace === 'store' ? !u.roomId : Boolean(u.roomId))) &&
        (!q ||
          u.assetTag.toLowerCase().includes(q) ||
          u.itemName.toLowerCase().includes(q) ||
          (u.serialNo ?? '').toLowerCase().includes(q) ||
          (u.roomNumber ?? '').toLowerCase().includes(q))
    );
  }, [units, unitSearch, unitItem, unitCondition, unitLocation, unitPlace]);

  const visibleUnits = filteredUnits.slice(0, limit);
  const selectedIds = [...selected].filter((id) => filteredUnits.some((u) => u.id === id));
  const allVisibleSelected = visibleUnits.length > 0 && visibleUnits.every((u) => selected.has(u.id));

  const totals = useMemo(() => {
    const byCondition: Record<number, number> = {};
    let inRooms = 0;
    for (const u of units) {
      byCondition[u.condition] = (byCondition[u.condition] ?? 0) + 1;
      if (u.roomId) inRooms++;
    }
    return { total: units.length, inRooms, byCondition };
  }, [units]);

  const showUnitsFor = (itemId: string) => {
    setUnitItem(itemId);
    setUnitSearch('');
    setUnitCondition(ALL);
    setUnitPlace(ALL);
    setLimit(PAGE);
    setTab('units');
  };

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* ==== HEADER + SUMMARY ==== */}
      <Card className="rounded-lg border shadow-sm">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold">Inventory</CardTitle>
            <CardDescription>Item types, their SKUs and every physical unit with its condition.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {perms.canViewBoard && (
              <Button variant="outline" asChild>
                <Link href="/room-inventory">
                  <LayoutGrid className="size-4" /> Room board
                </Link>
              </Button>
            )}
            {perms.canAdd && (
              <Button onClick={() => setItemDialog({ open: true, item: null })}>
                <Plus className="size-4" /> Add item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Item types" value={items.length} />
          <Stat label="Units" value={totals.total} />
          <Stat label="In rooms" value={totals.inRooms} />
          {INVENTORY_CONDITION_OPTIONS.filter((o) => o.value !== 0).map((o) => (
            <Stat key={o.value} label={o.label} value={totals.byCondition[o.value] ?? 0} dot={o.dotClass} />
          ))}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="units">Units ({units.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        {/* ==== ITEMS ==== */}
        <TabsContent value="items">
          <Card className="rounded-lg border shadow-sm">
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search name or SKU" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                </div>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All categories</SelectItem>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {items.length ? 'No items match the filters.' : 'No items yet. Add your first item, e.g. a TV or a flask.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredItems.map((i) => (
                      <TableRow key={i.id} className={i.status === 0 ? 'opacity-60' : undefined}>
                        <TableCell>
                          <button type="button" className="flex items-center gap-3 text-left" onClick={() => showUnitsFor(i.id)}>
                            <InventoryItemVisual itemId={i.id} icon={i.icon} hasImage={i.hasImage} imageVersion={i.imageVersion} />
                            <span>
                              <span className="block font-medium text-primary hover:underline">{i.name}</span>
                              {i.status === 0 && <span className="text-xs text-muted-foreground">Inactive</span>}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                        <TableCell>{i.categoryName ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium">{i.counts.total}</span>
                          <span className="block text-xs text-muted-foreground">{i.counts.inRooms} in rooms</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {INVENTORY_CONDITION_OPTIONS.filter((o) => i.counts.byCondition[o.value]).map((o) => (
                              <Badge key={o.value} className={o.badgeClass}>
                                {i.counts.byCondition[o.value]} {o.label}
                              </Badge>
                            ))}
                            {i.counts.total === 0 && <span className="text-xs text-muted-foreground">No units</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => showUnitsFor(i.id)}>
                                <Tag className="size-4" /> View units
                              </DropdownMenuItem>
                              {perms.canAdd && (
                                <DropdownMenuItem
                                  onClick={() => setAddUnits({ item: i, count: '1', locationId: locations[0]?.id ?? 'none' })}
                                >
                                  <Plus className="size-4" /> Add units
                                </DropdownMenuItem>
                              )}
                              {perms.canEdit && (
                                <DropdownMenuItem onClick={() => setItemDialog({ open: true, item: i })}>
                                  <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                              )}
                              {perms.canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      setConfirm({
                                        title: `Delete ${i.name}?`,
                                        description:
                                          i.counts.total > 0
                                            ? `This also deletes its ${i.counts.total} unit(s) and their history, including any placed in rooms. This cannot be undone.`
                                            : 'This cannot be undone.',
                                        run: () => deleteInventoryItemAction(i.id),
                                      })
                                    }
                                  >
                                    <Trash2 className="size-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==== UNITS ==== */}
        <TabsContent value="units">
          <Card className="rounded-lg border shadow-sm">
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search tag, serial, item or room"
                    value={unitSearch}
                    onChange={(e) => {
                      setUnitSearch(e.target.value);
                      setLimit(PAGE);
                    }}
                  />
                </div>
                <FilterSelect value={unitItem} onChange={setUnitItem} all="All items" options={items.map((i) => ({ id: i.id, name: `${i.name} (${i.sku})` }))} />
                <FilterSelect
                  value={unitCondition}
                  onChange={setUnitCondition}
                  all="Any condition"
                  options={INVENTORY_CONDITION_OPTIONS.map((o) => ({ id: String(o.value), name: o.label }))}
                />
                <FilterSelect value={unitLocation} onChange={setUnitLocation} all="All branches" options={locations} />
                <FilterSelect
                  value={unitPlace}
                  onChange={setUnitPlace}
                  all="Store + rooms"
                  options={[
                    { id: 'store', name: 'In store only' },
                    { id: 'room', name: 'In rooms only' },
                  ]}
                />
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">{selectedIds.length} selected</span>
                  {perms.canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" disabled={pending}>
                          Set condition
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Mark selected as</DropdownMenuLabel>
                        {INVENTORY_CONDITION_OPTIONS.map((o) => (
                          <DropdownMenuItem
                            key={o.value}
                            onClick={() => run(() => setInventoryUnitsConditionAction(selectedIds, o.value), () => setSelected(new Set()))}
                          >
                            <span className={`size-2 rounded-full ${o.dotClass}`} /> {o.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {perms.canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={pending}
                      onClick={() =>
                        setConfirm({
                          title: `Delete ${selectedIds.length} unit(s)?`,
                          description: 'Their move history is deleted too. Use the Disposed condition instead if you want to keep a record.',
                          run: async () => {
                            const res = await deleteInventoryUnitsAction(selectedIds);
                            if (res.success) setSelected(new Set());
                            return res;
                          },
                        })
                      }
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                </div>
              )}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(v) => visibleUnits.forEach((u) => toggle(u.id, Boolean(v)))}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Asset tag</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Where</TableHead>
                      <TableHead>Zone / Department</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleUnits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          {units.length ? 'No units match the filters.' : 'No units yet. Add units from the Items tab.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleUnits.map((u) => (
                      <TableRow key={u.id} data-state={selected.has(u.id) ? 'selected' : undefined}>
                        <TableCell>
                          <Checkbox checked={selected.has(u.id)} onCheckedChange={(v) => toggle(u.id, Boolean(v))} aria-label={`Select ${u.assetTag}`} />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="font-mono text-xs text-primary hover:underline"
                            onClick={() => setUnitDialog({ unit: u, tab: 'details' })}
                          >
                            {u.assetTag}
                          </button>
                          {u.serialNo && <span className="block text-xs text-muted-foreground">S/N {u.serialNo}</span>}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <InventoryIcon name={u.itemIcon} className="text-muted-foreground" />
                            {u.itemName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ConditionBadge value={u.condition} />
                        </TableCell>
                        <TableCell>{u.roomNumber ? `Room ${u.roomNumber}` : <span className="text-muted-foreground">In store</span>}</TableCell>
                        <TableCell className="text-xs">
                          {u.roomId ? (
                            <>
                              <span className="block">{u.zoneName ?? '—'}</span>
                              <span className="text-muted-foreground">{u.departmentName ?? '—'}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{u.locationName ?? '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="History"
                            onClick={() => setUnitDialog({ unit: u, tab: 'history' })}
                          >
                            <History className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredUnits.length > limit && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                    Show more ({filteredUnits.length - limit} left)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==== CATEGORIES ==== */}
        <TabsContent value="categories">
          <Card className="rounded-lg border shadow-sm">
            <CardContent className="space-y-3 pt-4">
              {perms.canAdd && (
                <Button size="sm" onClick={() => setCategoryDialog({ id: null, name: '', icon: null })}>
                  <Plus className="size-4" /> Add category
                </Button>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">No categories yet, e.g. Electronics, Furniture, Medical.</p>
                )}
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-md border p-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-muted">
                      <InventoryIcon name={c.icon} className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.itemCount} item type(s)</p>
                    </div>
                    {perms.canEdit && (
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setCategoryDialog({ id: c.id, name: c.name, icon: c.icon })}>
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {perms.canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        onClick={() =>
                          setConfirm({
                            title: `Delete category ${c.name}?`,
                            description: 'Items in it are kept and become uncategorised.',
                            run: () => deleteInventoryCategoryAction(c.id),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==== DIALOGS ==== */}
      <ItemDialog
        open={itemDialog.open}
        onOpenChange={(open) => setItemDialog((d) => ({ ...d, open }))}
        item={itemDialog.item}
        categories={categories}
        locations={locations}
        onSaved={refresh}
      />

      <InventoryUnitDialog
        unit={unitDialog.unit}
        defaultTab={unitDialog.tab}
        onOpenChange={(open) => !open && setUnitDialog((d) => ({ ...d, unit: null }))}
        locations={locations}
        canEdit={perms.canEdit}
        onSaved={refresh}
      />

      <Dialog open={Boolean(addUnits)} onOpenChange={(o) => !o && !pending && setAddUnits(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add units · {addUnits?.item.name}</DialogTitle>
          </DialogHeader>
          {addUnits && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>How many</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={addUnits.count}
                  onChange={(e) => setAddUnits({ ...addUnits, count: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Asset tags continue from the last {addUnits.item.sku}-#### number.</p>
              </div>
              <div className="grid gap-1.5">
                <Label>Stored at</Label>
                <Select value={addUnits.locationId} onValueChange={(v) => setAddUnits({ ...addUnits, locationId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUnits(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending || !addUnits || !(Number(addUnits.count) >= 1)}
              onClick={() =>
                addUnits &&
                run(
                  () =>
                    addInventoryUnitsAction({
                      itemId: addUnits.item.id,
                      count: Number(addUnits.count),
                      locationId: addUnits.locationId === 'none' ? null : addUnits.locationId,
                    }),
                  () => setAddUnits(null)
                )
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(categoryDialog)} onOpenChange={(o) => !o && !pending && setCategoryDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{categoryDialog?.id ? 'Edit category' : 'Add category'}</DialogTitle>
          </DialogHeader>
          {categoryDialog && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input value={categoryDialog.name} onChange={(e) => setCategoryDialog({ ...categoryDialog, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Icon</Label>
                <InventoryIconPicker value={categoryDialog.icon} onChange={(icon) => setCategoryDialog({ ...categoryDialog, icon })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending || !categoryDialog?.name.trim()}
              onClick={() => categoryDialog && run(() => saveInventoryCategoryAction(categoryDialog), () => setCategoryDialog(null))}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && !pending && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                if (confirm) run(confirm.run, () => setConfirm(null));
              }}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dot && <span className={`size-2 rounded-full ${dot}`} />}
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: OptionRow[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
