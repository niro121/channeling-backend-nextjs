'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ImageUp, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { InventoryIconPicker, InventoryItemVisual } from '@/components/inventory-icon';
import {
  removeInventoryItemImageAction,
  saveInventoryItemAction,
  uploadInventoryItemImageAction,
} from '@/app/actions/inventory.actions';
import {
  INVENTORY_IMAGE_CONTENT_TYPES,
  INVENTORY_IMAGE_MAX_BYTES,
  type InventoryCategoryRow,
  type InventoryItemRow,
  type OptionRow,
} from '@/types/inventory';

const NONE = '__none__';

export function ItemDialog({
  open,
  onOpenChange,
  item,
  categories,
  locations,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create */
  item: InventoryItemRow | null;
  categories: InventoryCategoryRow[];
  locations: OptionRow[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [published, setPublished] = useState(true);
  const [initialUnits, setInitialUnits] = useState('0');
  const [initialLocationId, setInitialLocationId] = useState<string>(NONE);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? '');
    setSku(item?.sku ?? '');
    setDescription(item?.description ?? '');
    setIcon(item?.icon ?? null);
    setCategoryId(item?.categoryId ?? NONE);
    setPublished(item ? item.status === 1 : true);
    setInitialUnits('0');
    setInitialLocationId(locations[0]?.id ?? NONE);
    setFile(null);
    setPreview(null);
    setRemoveImage(false);
  }, [open, item, locations]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!INVENTORY_IMAGE_CONTENT_TYPES.includes(f.type)) {
      toast({ variant: 'destructive', title: 'Image must be JPG, PNG or WebP' });
      return;
    }
    if (f.size > INVENTORY_IMAGE_MAX_BYTES) {
      toast({ variant: 'destructive', title: 'Image must be 8 MB or smaller' });
      return;
    }
    setFile(f);
    setRemoveImage(false);
  };

  const submit = () => {
    startTransition(async () => {
      const units = Number.parseInt(initialUnits || '0', 10);
      const res = await saveInventoryItemAction(item?.id ?? null, {
        name,
        sku,
        description,
        icon,
        categoryId: categoryId === NONE ? null : categoryId,
        status: published ? 1 : 0,
        initialUnits: item ? 0 : Number.isFinite(units) ? units : 0,
        initialLocationId: initialLocationId === NONE ? null : initialLocationId,
      });
      if (!res.success || !res.data) {
        toast({ variant: 'destructive', title: res.message ?? 'Could not save item' });
        return;
      }
      const itemId = res.data.id;
      if (file) {
        const fd = new FormData();
        fd.set('itemId', itemId);
        fd.set('file', file);
        const up = await uploadInventoryItemImageAction(fd);
        if (!up.success) {
          toast({ variant: 'destructive', title: 'Item saved, but the image failed', description: up.message });
        }
      } else if (removeImage && item?.hasImage) {
        await removeInventoryItemImageAction(itemId);
      }
      toast({ title: res.message ?? 'Saved' });
      onSaved();
      onOpenChange(false);
    });
  };

  const showStoredImage = item?.hasImage && !removeImage && !preview;

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : 'Add inventory item'}</DialogTitle>
          <DialogDescription>
            An item is a type of thing (e.g. Flask, TV 55&quot;). Each physical one is a unit with its own asset tag.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-24 rounded-lg object-cover" />
              ) : showStoredImage && item ? (
                <InventoryItemVisual
                  itemId={item.id}
                  icon={icon}
                  hasImage
                  imageVersion={item.imageVersion}
                  className="size-24 rounded-lg"
                />
              ) : (
                <InventoryItemVisual
                  itemId={item?.id ?? 'new'}
                  icon={icon}
                  hasImage={false}
                  className="size-24 rounded-lg"
                  iconClassName="size-10"
                />
              )}
              <input
                ref={fileRef}
                type="file"
                accept={INVENTORY_IMAGE_CONTENT_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={pending}>
                  <ImageUp className="size-4" /> Image
                </Button>
                {(preview || showStoredImage) && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    title="Remove image"
                    disabled={pending}
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                      setRemoveImage(true);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid flex-1 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-name">Name *</Label>
                <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Thermos flask" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-sku">SKU *</Label>
                  <Input
                    id="inv-sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="FLK-01"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Icon</Label>
                  <InventoryIconPicker value={icon} onChange={setIcon} disabled={pending} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between gap-2 rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="inv-published">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive items are hidden from the board tray.</p>
              </div>
              <Switch id="inv-published" checked={published} onCheckedChange={setPublished} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="inv-desc">Description</Label>
            <Textarea id="inv-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {!item && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-dashed p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-units">Units to create now</Label>
                <Input
                  id="inv-units"
                  type="number"
                  min={0}
                  max={500}
                  value={initialUnits}
                  onChange={(e) => setInitialUnits(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tagged {sku ? `${sku}-0001` : 'SKU-0001'}, {sku ? `${sku}-0002` : 'SKU-0002'}…
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label>Stored at</Label>
                <Select value={initialLocationId} onValueChange={setInitialLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose branch" />
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim() || !sku.trim()}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {item ? 'Save changes' : 'Add item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
