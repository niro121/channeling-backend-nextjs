'use client';

import { useEffect, useState, useTransition } from 'react';
import moment from 'moment';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { InventoryItemVisual } from '@/components/inventory-icon';
import {
  getInventoryUnitHistory,
  updateInventoryUnitAction,
} from '@/app/actions/inventory.actions';
import {
  INVENTORY_CONDITION_OPTIONS,
  inventoryConditionMeta,
  type InventoryMovementRow,
  type InventoryUnitRow,
  type OptionRow,
} from '@/types/inventory';

const NONE = '__none__';

export function ConditionBadge({ value }: { value: number }) {
  const meta = inventoryConditionMeta(value);
  return <Badge className={meta.badgeClass}>{meta.label}</Badge>;
}

export function InventoryUnitDialog({
  unit,
  onOpenChange,
  locations,
  canEdit,
  onSaved,
  defaultTab = 'details',
}: {
  unit: InventoryUnitRow | null;
  onOpenChange: (open: boolean) => void;
  locations: OptionRow[];
  canEdit: boolean;
  onSaved: () => void;
  defaultTab?: 'details' | 'history';
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState(defaultTab);
  const [assetTag, setAssetTag] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState('0');
  const [conditionNote, setConditionNote] = useState('');
  const [locationId, setLocationId] = useState(NONE);
  const [history, setHistory] = useState<InventoryMovementRow[] | null>(null);

  useEffect(() => {
    if (!unit) return;
    setTab(defaultTab);
    setAssetTag(unit.assetTag);
    setSerialNo(unit.serialNo ?? '');
    setNotes(unit.notes ?? '');
    setCondition(String(unit.condition));
    setConditionNote('');
    setLocationId(unit.locationId ?? NONE);
    setHistory(null);
  }, [unit, defaultTab]);

  useEffect(() => {
    if (!unit || tab !== 'history' || history) return;
    let cancelled = false;
    getInventoryUnitHistory(unit.id).then((res) => {
      if (!cancelled) setHistory(res.success && res.data ? res.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [unit, tab, history]);

  const conditionChanged = unit ? Number(condition) !== unit.condition : false;

  const save = () => {
    if (!unit) return;
    startTransition(async () => {
      const res = await updateInventoryUnitAction(unit.id, {
        assetTag,
        serialNo,
        notes,
        condition: Number(condition),
        conditionNote,
        locationId: locationId === NONE ? null : locationId,
      });
      if (!res.success) {
        toast({ variant: 'destructive', title: res.message ?? 'Could not save unit' });
        return;
      }
      toast({ title: 'Unit updated' });
      onSaved();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={Boolean(unit)} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {unit && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <InventoryItemVisual
                  itemId={unit.itemId}
                  icon={unit.itemIcon}
                  hasImage={unit.itemHasImage}
                  imageVersion={unit.itemImageVersion}
                  className="size-12"
                />
                <div className="min-w-0 text-left">
                  <DialogTitle className="truncate">{unit.assetTag}</DialogTitle>
                  <DialogDescription className="truncate">
                    {unit.itemName} ·{' '}
                    {unit.roomNumber ? `Room ${unit.roomNumber}` : 'In store'}
                    {unit.locationName ? ` · ${unit.locationName}` : ''}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="grid gap-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Asset tag</Label>
                    <Input value={assetTag} onChange={(e) => setAssetTag(e.target.value.toUpperCase())} disabled={!canEdit} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Serial no.</Label>
                    <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} disabled={!canEdit} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Condition</Label>
                    <Select value={condition} onValueChange={setCondition} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVENTORY_CONDITION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={String(o.value)}>
                            <span className="flex items-center gap-2">
                              <span className={`size-2 rounded-full ${o.dotClass}`} />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Branch</Label>
                    <Select
                      value={locationId}
                      onValueChange={setLocationId}
                      disabled={!canEdit || Boolean(unit.roomId)}
                    >
                      <SelectTrigger title={unit.roomId ? 'Follows the room while assigned' : undefined}>
                        <SelectValue placeholder="No branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No branch</SelectItem>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {conditionChanged && (
                  <div className="grid gap-1.5">
                    <Label>Reason for condition change</Label>
                    <Input
                      value={conditionNote}
                      onChange={(e) => setConditionNote(e.target.value)}
                      placeholder="e.g. Screen cracked, sent to vendor"
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} />
                </div>
                {unit.roomNumber && (
                  <p className="text-xs text-muted-foreground">
                    In Room {unit.roomNumber}
                    {unit.zoneName ? ` · ${unit.zoneName}` : ''}
                    {unit.departmentName ? ` · ${unit.departmentName}` : ''}
                    {unit.assignedAt ? ` since ${moment(unit.assignedAt).format('DD/MM/YYYY')}` : ''}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history" className="pt-2">
                {!history ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No moves or condition changes yet.</p>
                ) : (
                  <ol className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {history.map((h) => {
                      const moved = h.fromRoom !== h.toRoom;
                      const condChanged = h.toCondition != null && h.fromCondition !== h.toCondition;
                      return (
                        <li key={h.id} className="rounded-md border p-2.5 text-sm">
                          {moved && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{h.fromRoom ? `Room ${h.fromRoom}` : 'Store'}</span>
                              <ArrowRight className="size-3.5 text-muted-foreground" />
                              <span className="font-medium">{h.toRoom ? `Room ${h.toRoom}` : 'Store'}</span>
                            </div>
                          )}
                          {condChanged && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {h.fromCondition != null && <ConditionBadge value={h.fromCondition} />}
                              <ArrowRight className="size-3.5 text-muted-foreground" />
                              <ConditionBadge value={h.toCondition!} />
                            </div>
                          )}
                          {h.note && <p className="mt-1 text-muted-foreground">{h.note}</p>}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {moment(h.createdAt).format('DD/MM/YYYY hh:mm A')}
                            {h.byName ? ` · ${h.byName}` : ''}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </TabsContent>
            </Tabs>

            {tab === 'details' && canEdit && (
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={pending || !assetTag.trim()}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
