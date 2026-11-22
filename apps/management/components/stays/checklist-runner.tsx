'use client';

import { Check, CheckCheck, Minus, PackageOpen, Plus, X } from 'lucide-react';
import { Input, Textarea } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { InventoryIcon } from '@/components/inventory-icon';
import { conditionMeta } from '@/types/room-inventory';
import type { ChecklistAnswer, ChecklistForm, FormItem, InventoryRowState } from '@/types/room-stays';
import { PhotoField } from './photo-field';
import { SignaturePad } from './signature-pad';

export type Answers = Record<string, ChecklistAnswer>;

/** Starting answers: handover quantities default to the usual amount; everything else is left for the GRO. */
export function initialAnswers(form: ChecklistForm): Answers {
  const out: Answers = {};
  for (const s of form.sections) {
    for (const i of s.items) {
      if (i.type === 'handover' && !i.returns) out[i.id] = { itemId: i.id, qty: i.defaultQty ?? 1 };
    }
  }
  return out;
}

/** Answers saved in a draft, kept only where the item still exists on the form. */
export function mergeDraft(form: ChecklistForm, draft: Answers | undefined): Answers {
  const base = initialAnswers(form);
  if (!draft) return base;
  const ids = new Set(form.sections.flatMap((s) => s.items.map((i) => i.id)));
  for (const [id, a] of Object.entries(draft)) if (ids.has(id)) base[id] = a;
  return base;
}

/** Same rules channeling checks on submit, so the GRO sees what's left before sending. */
export function checklistProblems(form: ChecklistForm, answers: Answers): Map<string, string> {
  const problems = new Map<string, string>();
  for (const s of form.sections) {
    for (const i of s.items) {
      const a = answers[i.id];
      const evidence = Boolean(a?.note?.trim()) || (a?.photos?.length ?? 0) > 0;
      switch (i.type) {
        case 'pass_fail':
          if (!a?.value && i.required) problems.set(i.id, 'Choose Pass or Fail');
          else if (a?.value === 'fail' && i.evidenceOnFail && !evidence) problems.set(i.id, 'Add a note or photo');
          break;
        case 'number':
          if (typeof a?.value !== 'number' && i.required) problems.set(i.id, 'Enter a number');
          break;
        case 'text':
          if (!(typeof a?.value === 'string' && a.value.trim()) && i.required) problems.set(i.id, 'Fill this in');
          break;
        case 'photo':
          if (!a?.photos?.length && i.required) problems.set(i.id, 'Take a photo');
          break;
        case 'signature':
          if (typeof a?.value !== 'string' && i.required) problems.set(i.id, 'Sign here');
          break;
        case 'inventory': {
          const got = new Map((a?.units ?? []).map((u) => [u.unitId, u]));
          const missing = (i.units ?? []).filter((u) => !got.has(u.unitId)).length;
          if (missing) problems.set(i.id, `${missing} item${missing === 1 ? '' : 's'} not checked`);
          else if (i.evidenceOnFail && !a?.photos?.length && (a?.units ?? []).some((u) => u.state !== 'present' && !u.note?.trim())) {
            problems.set(i.id, 'Add a note for each missing or damaged item');
          }
          break;
        }
        case 'handover':
          if (i.returns) {
            const got = new Map((a?.returns ?? []).map((r) => [r.key, r]));
            if (i.returns.some((r) => !got.has(r.key))) problems.set(i.id, 'Enter how many came back');
            else if (!a?.photos?.length && i.returns.some((r) => (got.get(r.key)?.returnedQty ?? 0) < r.givenQty && !got.get(r.key)?.note?.trim())) {
              problems.set(i.id, 'Add a note for anything not returned');
            }
          } else if (typeof a?.qty !== 'number' && i.required) problems.set(i.id, 'Enter how many were given');
          break;
        case 'tick':
          break;
      }
    }
  }
  return problems;
}

export function ChecklistRunner({
  form,
  answers,
  onChange,
  showProblems,
  stayId
}: {
  form: ChecklistForm;
  answers: Answers;
  onChange: (next: Answers) => void;
  showProblems: boolean;
  stayId?: string | null;
}) {
  const problems = showProblems ? checklistProblems(form, answers) : new Map<string, string>();
  const set = (itemId: string, patch: Partial<ChecklistAnswer>) =>
    onChange({ ...answers, [itemId]: { ...(answers[itemId] ?? { itemId }), ...patch, itemId } });

  if (form.sections.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        There is no checklist for this room and nothing was handed over at check-in.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {form.sections.map((section) => (
        <section key={section.id} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
          <div className="space-y-2">
            {section.items.map((item) => (
              <div
                key={item.id}
                id={`item-${item.id}`}
                className={cn('rounded-2xl border bg-card p-3', problems.has(item.id) && 'border-destructive ring-1 ring-destructive/40')}
              >
                <ItemControl item={item} answer={answers[item.id]} set={(p) => set(item.id, p)} stayId={stayId} />
                {problems.has(item.id) && <p className="mt-2 text-xs font-medium text-destructive">{problems.get(item.id)}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Label({ item }: { item: FormItem }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-medium leading-snug">
        {item.label}
        {item.required && item.type !== 'tick' && <span className="text-destructive"> *</span>}
        {item.blocking && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Must pass</span>}
      </p>
      {item.help && <p className="text-xs text-muted-foreground">{item.help}</p>}
    </div>
  );
}

function ItemControl({
  item,
  answer: a,
  set,
  stayId
}: {
  item: FormItem;
  answer: ChecklistAnswer | undefined;
  set: (patch: Partial<ChecklistAnswer>) => void;
  stayId?: string | null;
}) {
  const note = (placeholder = 'Note') => (
    <Textarea
      value={a?.note ?? ''}
      onChange={(e) => set({ note: e.target.value })}
      placeholder={placeholder}
      maxLength={500}
      rows={2}
      className="mt-2 rounded-xl text-sm"
    />
  );

  switch (item.type) {
    case 'tick': {
      const ticked = a?.value === true;
      return (
        <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => set({ value: !ticked })}>
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
              ticked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40'
            )}
          >
            {ticked && <Check className="h-5 w-5" />}
          </span>
          <Label item={item} />
        </button>
      );
    }
    case 'pass_fail': {
      const v = a?.value;
      return (
        <div>
          <Label item={item} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Choice active={v === 'pass'} tone="ok" onClick={() => set({ value: 'pass' })}>
              <Check className="h-4 w-4" /> Pass
            </Choice>
            <Choice active={v === 'fail'} tone="bad" onClick={() => set({ value: 'fail' })}>
              <X className="h-4 w-4" /> Fail
            </Choice>
          </div>
          {v === 'fail' && (
            <>
              {note('What is wrong?')}
              <div className="mt-2">
                <PhotoField value={a?.photos ?? []} onChange={(photos) => set({ photos })} stayId={stayId} compact />
              </div>
            </>
          )}
        </div>
      );
    }
    case 'number':
      return (
        <div className="space-y-2">
          <Label item={item} />
          <Input
            type="number"
            inputMode="decimal"
            className="h-11 w-40 rounded-xl"
            value={typeof a?.value === 'number' ? a.value : ''}
            onChange={(e) => set({ value: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
      );
    case 'text':
      return (
        <div className="space-y-2">
          <Label item={item} />
          <Textarea
            className="rounded-xl"
            rows={2}
            maxLength={2000}
            value={typeof a?.value === 'string' ? a.value : ''}
            onChange={(e) => set({ value: e.target.value })}
          />
        </div>
      );
    case 'photo':
      return (
        <div className="space-y-2">
          <Label item={item} />
          <PhotoField value={a?.photos ?? []} onChange={(photos) => set({ photos })} stayId={stayId} />
        </div>
      );
    case 'signature':
      return (
        <div className="space-y-2">
          <Label item={item} />
          <SignaturePad value={typeof a?.value === 'string' ? a.value : null} onChange={(value) => set({ value })} stayId={stayId} />
        </div>
      );
    case 'inventory':
      return <InventoryControl item={item} answer={a} set={set} stayId={stayId} />;
    case 'handover':
      return item.returns ? (
        <ReturnsControl item={item} answer={a} set={set} stayId={stayId} />
      ) : (
        <div className="flex items-center gap-3">
          <Label item={item} />
          <Stepper value={a?.qty ?? 0} onChange={(qty) => set({ qty })} />
        </div>
      );
  }
}

function Choice({
  active,
  tone,
  onClick,
  children,
  small
}: {
  active: boolean;
  tone: 'ok' | 'bad' | 'warn';
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  const activeClass =
    tone === 'ok'
      ? 'border-emerald-600 bg-emerald-600 text-white'
      : tone === 'bad'
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-amber-500 bg-amber-500 text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl border font-medium transition-colors',
        small ? 'h-9 px-2.5 text-xs' : 'h-11 text-sm',
        active ? activeClass : 'bg-background active:bg-muted'
      )}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange, max = 999 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex shrink-0 items-center rounded-xl border">
      <button type="button" className="flex h-10 w-10 items-center justify-center disabled:opacity-40" disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label="Less">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className="flex h-10 w-10 items-center justify-center disabled:opacity-40" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

const STATES: { value: InventoryRowState; label: string; tone: 'ok' | 'bad' | 'warn' }[] = [
  { value: 'present', label: 'Present', tone: 'ok' },
  { value: 'missing', label: 'Missing', tone: 'bad' },
  { value: 'damaged', label: 'Damaged', tone: 'warn' }
];

function InventoryControl({
  item,
  answer: a,
  set,
  stayId
}: {
  item: FormItem;
  answer: ChecklistAnswer | undefined;
  set: (patch: Partial<ChecklistAnswer>) => void;
  stayId?: string | null;
}) {
  const units = item.units ?? [];
  const states = new Map((a?.units ?? []).map((u) => [u.unitId, u]));
  const setUnit = (unitId: string, patch: { state?: InventoryRowState; note?: string }) => {
    const current = states.get(unitId);
    const next = { unitId, state: patch.state ?? current?.state ?? 'present', note: patch.note ?? current?.note ?? null };
    set({ units: [...(a?.units ?? []).filter((u) => u.unitId !== unitId), next] });
  };
  const allPresent = () =>
    set({
      units: units.map((u) => states.get(u.unitId) ?? { unitId: u.unitId, state: 'present' as const, note: null })
    });
  const unchecked = units.filter((u) => !states.has(u.unitId)).length;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Label item={item} />
        {unchecked > 0 && (
          <button type="button" onClick={allPresent} className="flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
            <CheckCheck className="h-3.5 w-3.5" /> Rest present
          </button>
        )}
      </div>
      {units.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PackageOpen className="h-4 w-4" /> No inventory recorded for this room.
        </p>
      )}
      <div className="divide-y overflow-hidden rounded-xl border">
        {units.map((u) => {
          const st = states.get(u.unitId);
          const before = conditionMeta(u.condition);
          return (
            <div key={u.unitId} className="space-y-2 p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <InventoryIcon name={u.itemIcon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.itemName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {u.assetTag}
                    {u.condition !== 0 && <span className="ml-1.5 font-sans">· was {before.label.toLowerCase()}</span>}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {STATES.map((s) => (
                  <Choice key={s.value} small active={st?.state === s.value} tone={s.tone} onClick={() => setUnit(u.unitId, { state: s.value })}>
                    {s.label}
                  </Choice>
                ))}
              </div>
              {st && st.state !== 'present' && (
                <Input
                  className="h-10 rounded-xl text-sm"
                  placeholder={st.state === 'missing' ? 'Where is it? Who was told?' : 'What is damaged?'}
                  maxLength={300}
                  value={st.note ?? ''}
                  onChange={(e) => setUnit(u.unitId, { note: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>
      {(a?.units ?? []).some((u) => u.state !== 'present') && (
        <PhotoField value={a?.photos ?? []} onChange={(photos) => set({ photos })} stayId={stayId} compact />
      )}
    </div>
  );
}

function ReturnsControl({
  item,
  answer: a,
  set,
  stayId
}: {
  item: FormItem;
  answer: ChecklistAnswer | undefined;
  set: (patch: Partial<ChecklistAnswer>) => void;
  stayId?: string | null;
}) {
  const rows = item.returns ?? [];
  const got = new Map((a?.returns ?? []).map((r) => [r.key, r]));
  const setRow = (key: string, patch: { returnedQty?: number; note?: string }) => {
    const cur = got.get(key);
    const next = { key, returnedQty: patch.returnedQty ?? cur?.returnedQty ?? 0, note: patch.note ?? cur?.note ?? null };
    set({ returns: [...(a?.returns ?? []).filter((r) => r.key !== key), next] });
  };
  const allBack = () => set({ returns: rows.map((r) => got.get(r.key) ?? { key: r.key, returnedQty: r.givenQty, note: null }) });
  const short = rows.some((r) => {
    const g = got.get(r.key);
    return g && g.returnedQty < r.givenQty;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Label item={item} />
        {rows.some((r) => !got.has(r.key)) && (
          <button type="button" onClick={allBack} className="flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
            <CheckCheck className="h-3.5 w-3.5" /> All back
          </button>
        )}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border">
        {rows.map((r) => {
          const g = got.get(r.key);
          return (
            <div key={r.key} className="space-y-2 p-2.5">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">Given {r.givenQty}</p>
                </div>
                {g ? (
                  <Stepper value={g.returnedQty} max={r.givenQty} onChange={(returnedQty) => setRow(r.key, { returnedQty })} />
                ) : (
                  <div className="flex gap-1.5">
                    <Choice small active={false} tone="ok" onClick={() => setRow(r.key, { returnedQty: r.givenQty })}>
                      All {r.givenQty}
                    </Choice>
                    <Choice small active={false} tone="bad" onClick={() => setRow(r.key, { returnedQty: 0 })}>
                      None
                    </Choice>
                  </div>
                )}
              </div>
              {g && g.returnedQty < r.givenQty && (
                <Input
                  className="h-10 rounded-xl text-sm"
                  placeholder="Why not returned?"
                  maxLength={300}
                  value={g.note ?? ''}
                  onChange={(e) => setRow(r.key, { note: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>
      {short && <PhotoField value={a?.photos ?? []} onChange={(photos) => set({ photos })} stayId={stayId} compact />}
    </div>
  );
}
