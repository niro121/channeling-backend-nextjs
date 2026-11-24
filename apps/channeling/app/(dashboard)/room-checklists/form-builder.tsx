'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Check,
  ChevronsUpDown,
  Copy,
  Hash,
  ListChecks,
  Loader2,
  PackageCheck,
  PenLine,
  Plus,
  Save,
  Send,
  Signature,
  SquareCheck,
  ThumbsUp,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/components/hooks/use-toast';
import { usePermissions } from '@/components/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { saveChecklistTemplateAction, setChecklistTemplateStatusAction } from '@/app/actions/room-checklist.actions';
import {
  CHECKLIST_ITEM_TYPES,
  CHECKLIST_ITEM_TYPE_LABEL,
  CHECKLIST_KIND_LABEL,
  type ChecklistItem,
  type ChecklistItemType,
  type ChecklistKind,
  type ChecklistScopeOptions,
  type ChecklistSection,
  type TemplateRow,
} from '@/types/room-checklist';
import { STATUS_BADGE } from './forms-list';

const newId = () => Math.random().toString(36).slice(2, 12);

export const ITEM_TYPE_ICON: Record<ChecklistItemType, typeof Check> = {
  tick: SquareCheck,
  pass_fail: ThumbsUp,
  number: Hash,
  text: Type,
  photo: Camera,
  signature: Signature,
  inventory: PackageCheck,
  handover: Copy,
};

const ITEM_TYPE_HINT: Record<ChecklistItemType, string> = {
  tick: 'A box the GRO ticks. If required and left unticked it counts as an issue.',
  pass_fail: 'Pass or Fail. Fail counts as an issue.',
  number: 'A number, e.g. meter reading or count.',
  text: 'Free text.',
  photo: 'One or more photos.',
  signature: 'The patient or a family member signs on the screen.',
  inventory: "Lists every unit in the room from Room Inventory. Each is marked Present, Missing or Damaged; Missing and Damaged update the inventory.",
  handover: 'Something given to the patient, with a quantity. Check-out asks for it back automatically.',
};

function item(type: ChecklistItemType, label: string, extra: Partial<ChecklistItem> = {}): ChecklistItem {
  return { id: newId(), type, label, help: null, required: true, blocking: false, evidenceOnFail: false, defaultQty: null, ...extra };
}

function starterSections(kind: ChecklistKind): ChecklistSection[] {
  if (kind === 'check_in') {
    return [
      {
        id: newId(),
        title: 'Room ready',
        items: [
          item('tick', 'Room cleaned', { blocking: true }),
          item('tick', 'Bed linen changed', { blocking: true }),
          item('pass_fail', 'Bathroom clean and working', { evidenceOnFail: true }),
        ],
      },
      {
        id: newId(),
        title: 'Room inventory',
        items: [item('inventory', 'Everything in the room', { evidenceOnFail: true })],
      },
      {
        id: newId(),
        title: 'Handed to patient',
        items: [item('handover', 'TV remote', { defaultQty: 1, required: false }), item('handover', 'Towels', { defaultQty: 2, required: false })],
      },
      { id: newId(), title: 'Confirmation', items: [item('signature', 'Patient or bystander signature', { required: false })] },
    ];
  }
  return [
    {
      id: newId(),
      title: 'Room inventory',
      items: [item('inventory', 'Everything in the room', { evidenceOnFail: true })],
    },
    {
      id: newId(),
      title: 'Leaving',
      items: [item('tick', 'Patient belongings removed'), item('photo', 'Room photo', { required: false })],
    },
  ];
}

type Draft = {
  name: string;
  appliesToAll: boolean;
  zoneIds: string[];
  departmentIds: string[];
  roomIds: string[];
  sections: ChecklistSection[];
};

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function FormBuilder({
  template,
  kind,
  scope,
}: {
  template: TemplateRow | null;
  kind: ChecklistKind;
  scope: ChecklistScopeOptions;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const canEdit = has('room-checklist-forms', 'edit');
  const canPublish = has('room-checklist-forms', 'publish');
  const readOnly = !canEdit;
  const [pending, startTransition] = useTransition();

  const initial: Draft = useMemo(
    () =>
      template
        ? {
            name: template.name,
            appliesToAll: template.appliesToAll,
            zoneIds: template.zoneIds,
            departmentIds: template.departmentIds,
            roomIds: template.roomIds,
            sections: template.sections,
          }
        : {
            name: kind === 'check_in' ? 'Ward check-in' : 'Ward check-out',
            appliesToAll: true,
            zoneIds: [],
            departmentIds: [],
            roomIds: [],
            sections: starterSections(kind),
          },
    [template, kind]
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || !template;

  useEffect(() => {
    if (!dirty || readOnly) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, readOnly]);

  const setSections = (fn: (s: ChecklistSection[]) => ChecklistSection[]) => setDraft((d) => ({ ...d, sections: fn(d.sections) }));
  const patchSection = (si: number, patch: Partial<ChecklistSection>) =>
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const patchItem = (si: number, ii: number, patch: Partial<ChecklistItem>) =>
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, items: s.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : s)));

  const save = (publish: boolean) =>
    startTransition(async () => {
      const res = await saveChecklistTemplateAction(template?.id ?? null, { ...draft, kind });
      if (!res.success || !res.data) {
        toast({ variant: 'destructive', title: res.message ?? 'Could not save' });
        return;
      }
      if (publish && res.data.status !== 'published') {
        const pub = await setChecklistTemplateStatusAction(res.data.id, 'published');
        toast({ variant: pub.success ? 'default' : 'destructive', title: pub.success ? 'Saved and published' : pub.message ?? 'Saved, but could not publish' });
      } else {
        toast({ title: res.message ?? 'Saved' });
      }
      if (!template) router.replace(`/room-checklists/${res.data.id}`);
      else router.refresh();
    });

  const status = template ? STATUS_BADGE[template.status] : STATUS_BADGE.draft;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/room-checklists">
            <ArrowLeft className="size-4" /> Forms
          </Link>
        </Button>
        <Badge variant="outline">{CHECKLIST_KIND_LABEL[kind]}</Badge>
        <Badge className={status.className}>{status.label}</Badge>
        {template && <span className="text-xs text-muted-foreground">v{template.version}</span>}
        <div className="ml-auto flex gap-2">
          {canEdit && (
            <Button variant="outline" disabled={pending || (!dirty && Boolean(template))} onClick={() => save(false)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </Button>
          )}
          {canEdit && canPublish && template?.status !== 'published' && (
            <Button disabled={pending} onClick={() => save(true)}>
              <Send className="size-4" /> Save &amp; publish
            </Button>
          )}
        </div>
      </div>
      {template?.status === 'published' && canEdit && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          This form is live. Saving changes it for the next check-in straight away; checklists already filled keep the version they used.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Form</CardTitle>
              <CardDescription>The name the GRO sees, and which rooms use this form.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-name">Name</Label>
                <Input
                  id="form-name"
                  value={draft.name}
                  disabled={readOnly}
                  maxLength={120}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="all-rooms"
                  checked={draft.appliesToAll}
                  disabled={readOnly}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, appliesToAll: v }))}
                />
                <Label htmlFor="all-rooms">All rooms</Label>
                <span className="text-xs text-muted-foreground">
                  A more specific form (zone, department or room) still wins over this one.
                </span>
              </div>
              {!draft.appliesToAll && (
                <div className="grid gap-3 md:grid-cols-3">
                  <ScopePicker
                    label="Zones"
                    options={scope.zones}
                    value={draft.zoneIds}
                    disabled={readOnly}
                    onChange={(zoneIds) => setDraft((d) => ({ ...d, zoneIds }))}
                  />
                  <ScopePicker
                    label="Departments"
                    options={scope.departments}
                    value={draft.departmentIds}
                    disabled={readOnly}
                    onChange={(departmentIds) => setDraft((d) => ({ ...d, departmentIds }))}
                  />
                  <ScopePicker
                    label="Rooms"
                    options={scope.rooms.map((r) => ({ id: r.id, name: r.name, detail: r.detail }))}
                    value={draft.roomIds}
                    disabled={readOnly}
                    onChange={(roomIds) => setDraft((d) => ({ ...d, roomIds }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {draft.sections.map((section, si) => (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                <Input
                  value={section.title}
                  disabled={readOnly}
                  maxLength={120}
                  placeholder="Section title"
                  className="h-9 max-w-md font-semibold"
                  onChange={(e) => patchSection(si, { title: e.target.value })}
                />
                {!readOnly && (
                  <div className="ml-auto flex">
                    <Button variant="ghost" size="icon" className="size-8" title="Move up" disabled={si === 0} onClick={() => setSections((ss) => move(ss, si, si - 1))}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Move down"
                      disabled={si === draft.sections.length - 1}
                      onClick={() => setSections((ss) => move(ss, si, si + 1))}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      title="Remove section"
                      onClick={() => setSections((ss) => ss.filter((_, i) => i !== si))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.length === 0 && <p className="text-sm text-muted-foreground">No items in this section.</p>}
                {section.items.map((it, ii) => (
                  <ItemEditor
                    key={it.id}
                    item={it}
                    kind={kind}
                    readOnly={readOnly}
                    first={ii === 0}
                    last={ii === section.items.length - 1}
                    onChange={(patch) => patchItem(si, ii, patch)}
                    onMove={(dir) => patchSection(si, { items: move(section.items, ii, ii + dir) })}
                    onRemove={() => patchSection(si, { items: section.items.filter((_, j) => j !== ii) })}
                  />
                ))}
                {!readOnly && (
                  <AddItemButton
                    kind={kind}
                    onAdd={(type) =>
                      patchSection(si, {
                        items: [
                          ...section.items,
                          item(type, '', {
                            required: type !== 'handover' && type !== 'photo',
                            defaultQty: type === 'handover' ? 1 : null,
                            evidenceOnFail: type === 'pass_fail' || type === 'inventory',
                          }),
                        ],
                      })
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}

          {!readOnly && (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setSections((ss) => [...ss, { id: newId(), title: 'New section', items: [] }])}
            >
              <Plus className="size-4" /> Add section
            </Button>
          )}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>Roughly how it looks on the GRO&apos;s phone.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormPreview name={draft.name} kind={kind} sections={draft.sections} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  item: it,
  kind,
  readOnly,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  item: ChecklistItem;
  kind: ChecklistKind;
  readOnly: boolean;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<ChecklistItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const Icon = ITEM_TYPE_ICON[it.type];
  const failable = it.type === 'tick' || it.type === 'pass_fail' || it.type === 'inventory';
  const evidence = it.type === 'pass_fail' || it.type === 'inventory';
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background" title={CHECKLIST_ITEM_TYPE_LABEL[it.type]}>
          <Icon className="size-4" />
        </span>
        <Input
          value={it.label}
          disabled={readOnly}
          maxLength={200}
          placeholder="What to check"
          className="h-9 min-w-48 flex-1 bg-background"
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <Select
          value={it.type}
          disabled={readOnly}
          onValueChange={(v) => {
            const type = v as ChecklistItemType;
            onChange({
              type,
              defaultQty: type === 'handover' ? it.defaultQty ?? 1 : null,
              blocking: type === 'tick' || type === 'pass_fail' || type === 'inventory' ? it.blocking : false,
              evidenceOnFail: type === 'pass_fail' || type === 'inventory' ? it.evidenceOnFail : false,
            });
          }}
        >
          <SelectTrigger className="h-9 w-44 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHECKLIST_ITEM_TYPES.filter((t) => t !== 'handover' || kind === 'check_in').map((t) => (
              <SelectItem key={t} value={t}>
                {CHECKLIST_ITEM_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!readOnly && (
          <div className="flex">
            <Button variant="ghost" size="icon" className="size-8" title="Move up" disabled={first} onClick={() => onMove(-1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" title="Move down" disabled={last} onClick={() => onMove(1)}>
              <ArrowDown className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-destructive" title="Remove item" onClick={onRemove}>
              <X className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <p className="mt-1.5 pl-10 text-xs text-muted-foreground">{ITEM_TYPE_HINT[it.type]}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 pl-10">
        <Toggle label="Required" checked={it.required} disabled={readOnly} onChange={(required) => onChange({ required })} />
        {failable && (
          <Toggle
            label="Must pass to finish"
            hint="If it fails, only someone with Override can finish the checklist."
            checked={Boolean(it.blocking)}
            disabled={readOnly}
            onChange={(blocking) => onChange({ blocking })}
          />
        )}
        {evidence && (
          <Toggle
            label="Note or photo if it fails"
            checked={Boolean(it.evidenceOnFail)}
            disabled={readOnly}
            onChange={(evidenceOnFail) => onChange({ evidenceOnFail })}
          />
        )}
        {it.type === 'handover' && (
          <label className="flex items-center gap-2 text-sm">
            Usually given
            <Input
              type="number"
              min={0}
              max={999}
              className="h-8 w-20 bg-background"
              disabled={readOnly}
              value={it.defaultQty ?? 1}
              onChange={(e) => onChange({ defaultQty: Math.max(0, Math.min(999, Number(e.target.value) || 0)) })}
            />
          </label>
        )}
        <Input
          value={it.help ?? ''}
          disabled={readOnly}
          maxLength={300}
          placeholder="Help text (optional)"
          className="h-8 min-w-48 flex-1 bg-background text-xs"
          onChange={(e) => onChange({ help: e.target.value || null })}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm" title={hint}>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function AddItemButton({ kind, onAdd }: { kind: ChecklistKind; onAdd: (type: ChecklistItemType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary">
          <Plus className="size-4" /> Add item
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        {CHECKLIST_ITEM_TYPES.filter((t) => t !== 'handover' || kind === 'check_in').map((t) => {
          const Icon = ITEM_TYPE_ICON[t];
          return (
            <button
              key={t}
              type="button"
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
              onClick={() => {
                onAdd(t);
                setOpen(false);
              }}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{CHECKLIST_ITEM_TYPE_LABEL[t]}</span>
                <span className="block text-xs text-muted-foreground">{ITEM_TYPE_HINT[t]}</span>
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function ScopePicker({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: { id: string; name: string; detail?: string | null }[];
  value: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal" disabled={disabled}>
            <span className="truncate">{selected.length ? `${selected.length} selected` : `Any ${label.toLowerCase()}`}</span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>Nothing found.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.id} value={`${o.name} ${o.detail ?? ''} ${o.id}`} onSelect={() => toggle(o.id)}>
                    <Check className={cn('size-4', value.includes(o.id) ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{o.name}</span>
                    {o.detail && <span className="truncate text-xs text-muted-foreground">{o.detail}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((o) => (
            <Badge key={o.id} variant="secondary" className="gap-1">
              {o.name}
              {!disabled && (
                <button type="button" onClick={() => toggle(o.id)} aria-label={`Remove ${o.name}`}>
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function FormPreview({ name, kind, sections }: { name: string; kind: ChecklistKind; sections: ChecklistSection[] }) {
  return (
    <div className="mx-auto max-w-sm rounded-[1.75rem] border-4 border-zinc-800 bg-background p-3 shadow-sm dark:border-zinc-600">
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <div>
          <p className="text-xs text-muted-foreground">{CHECKLIST_KIND_LABEL[kind]} · Room 101</p>
          <p className="font-semibold">{name || 'Untitled form'}</p>
        </div>
        {kind === 'check_out' && (
          <PreviewSection title="Items given at check-in">
            <p className="text-xs text-muted-foreground">Added automatically from the check-in: each thing handed over and how many came back.</p>
          </PreviewSection>
        )}
        {sections.map((s) => (
          <PreviewSection key={s.id} title={s.title || 'Untitled section'}>
            {s.items.map((it) => (
              <div key={it.id} className="rounded-xl border p-2.5">
                <p className="text-sm">
                  {it.label || <span className="text-muted-foreground">Untitled item</span>}
                  {it.required && <span className="text-destructive"> *</span>}
                </p>
                {it.help && <p className="text-xs text-muted-foreground">{it.help}</p>}
                <div className="mt-1.5">
                  <PreviewControl type={it.type} qty={it.defaultQty} />
                </div>
              </div>
            ))}
          </PreviewSection>
        ))}
        <div className="rounded-xl bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">Submit</div>
      </div>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function PreviewControl({ type, qty }: { type: ChecklistItemType; qty?: number | null }) {
  const chip = 'rounded-lg border px-2 py-1 text-xs';
  switch (type) {
    case 'tick':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-5 rounded-md border-2" /> Tap to tick
        </span>
      );
    case 'pass_fail':
      return (
        <div className="flex gap-1.5">
          <span className={chip}>Pass</span>
          <span className={chip}>Fail</span>
        </div>
      );
    case 'number':
      return <div className={cn(chip, 'w-24 text-muted-foreground')}>0</div>;
    case 'text':
      return <div className={cn(chip, 'text-muted-foreground')}>Type here…</div>;
    case 'photo':
      return (
        <span className={cn(chip, 'inline-flex items-center gap-1')}>
          <Camera className="size-3" /> Take photo
        </span>
      );
    case 'signature':
      return (
        <div className="flex h-12 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
          <PenLine className="mr-1 size-3" /> Sign here
        </div>
      );
    case 'inventory':
      return (
        <div className="space-y-1">
          {['TV · A-102', 'Kettle · K-17'].map((u) => (
            <div key={u} className="flex items-center justify-between text-xs">
              <span>{u}</span>
              <span className="flex gap-1">
                <span className={chip}>Present</span>
                <span className={chip}>Missing</span>
                <span className={chip}>Damaged</span>
              </span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Filled from the room&apos;s inventory.</p>
        </div>
      );
    case 'handover':
      return (
        <span className="inline-flex items-center gap-2 text-xs">
          <ListChecks className="size-3" /> Given: <span className={chip}>{qty ?? 1}</span>
        </span>
      );
  }
}
