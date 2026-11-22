'use client';

import { Plus, Star, Trash2, UserRound } from 'lucide-react';
import { Button, Input } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { StayContactInput } from '@/types/room-stays';

export type ContactsValue = {
  patientPhone: string;
  primaryIsPatient: boolean;
  contacts: StayContactInput[];
};

const MOBILE = /^(\+94|94|0)?7[0-9]{8}$/;
export const isMobile = (v: string) => MOBILE.test(v.replace(/\s/g, ''));

/** Same rules channeling applies: valid mobiles, and exactly one primary (the patient or one contact). */
export function contactsProblem(v: ContactsValue): string | null {
  if (v.patientPhone.trim() && !isMobile(v.patientPhone)) return "The patient's phone number doesn't look right.";
  for (const c of v.contacts) {
    if (!c.name.trim()) return 'Every contact needs a name.';
    if (!isMobile(c.phone)) return `${c.name || 'A contact'}'s phone number doesn't look right.`;
  }
  const primaries = v.contacts.filter((c) => c.isPrimary).length;
  if (v.primaryIsPatient) {
    if (!v.patientPhone.trim()) return "Enter the patient's phone to make the patient the primary contact.";
    if (primaries) return 'Only one primary contact.';
  } else if (primaries !== 1) {
    return v.contacts.length ? 'Tap the star on one contact to make them primary.' : 'Add a contact, or make the patient the primary contact.';
  }
  return null;
}

export function ContactsEditor({ value, onChange }: { value: ContactsValue; onChange: (v: ContactsValue) => void }) {
  const setContact = (i: number, patch: Partial<StayContactInput>) =>
    onChange({ ...value, contacts: value.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const makePrimary = (i: number | 'patient') =>
    onChange({
      ...value,
      primaryIsPatient: i === 'patient',
      contacts: value.contacts.map((c, j) => ({ ...c, isPrimary: j === i }))
    });

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl border p-3', value.primaryIsPatient && 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20')}>
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">Patient&apos;s phone</span>
          <PrimaryStar active={value.primaryIsPatient} onClick={() => makePrimary('patient')} />
        </div>
        <Input
          className="mt-2 h-11 rounded-xl"
          type="tel"
          inputMode="tel"
          placeholder="07XXXXXXXX (optional)"
          value={value.patientPhone}
          onChange={(e) => onChange({ ...value, patientPhone: e.target.value })}
        />
      </div>

      {value.contacts.map((c, i) => (
        <div key={i} className={cn('space-y-2 rounded-2xl border p-3', c.isPrimary && 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20')}>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium">Contact {i + 1}</span>
            <PrimaryStar active={Boolean(c.isPrimary)} onClick={() => makePrimary(i)} />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
              onClick={() => onChange({ ...value, contacts: value.contacts.filter((_, j) => j !== i) })}
              aria-label="Remove contact"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Input className="h-11 rounded-xl" placeholder="Name" maxLength={120} value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} />
          <div className="flex gap-2">
            <Input
              className="h-11 flex-1 rounded-xl"
              type="tel"
              inputMode="tel"
              placeholder="07XXXXXXXX"
              value={c.phone}
              onChange={(e) => setContact(i, { phone: e.target.value })}
            />
            <Input
              className="h-11 w-36 rounded-xl"
              placeholder="Relationship"
              maxLength={60}
              value={c.relationship ?? ''}
              onChange={(e) => setContact(i, { relationship: e.target.value })}
            />
          </div>
        </div>
      ))}

      {value.contacts.length < 10 && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl border-dashed"
          onClick={() =>
            onChange({
              ...value,
              contacts: [
                ...value.contacts,
                { name: '', phone: '', relationship: '', isPrimary: !value.primaryIsPatient && value.contacts.every((c) => !c.isPrimary) }
              ]
            })
          }
        >
          <Plus className="h-4 w-4" /> Add authorised contact
        </Button>
      )}
      <p className="px-1 text-xs text-muted-foreground">
        <Star className="mr-1 inline h-3 w-3 fill-amber-400 text-amber-400" />
        The primary contact is called first about the patient.
      </p>
    </div>
  );
}

function PrimaryStar({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        active ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'text-muted-foreground active:bg-muted'
      )}
      aria-pressed={active}
    >
      <Star className={cn('h-3.5 w-3.5', active && 'fill-amber-400 text-amber-400')} />
      {active ? 'Primary' : 'Make primary'}
    </button>
  );
}
