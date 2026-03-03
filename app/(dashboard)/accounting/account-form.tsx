'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount } from '@/app/actions/accounting.actions';
import type { CreateAccountInput, AccountType } from '@/types/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackButton } from '@/components/common/back-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { Save } from 'lucide-react';

type AccountFormProps = {
  types: { value: AccountType; label: string }[];
  locations: { id: string; name: string }[];
  doctors: { id: string; name: string; code: string }[];
  agencies: { id: string; name: string; code: string | null }[];
  cashAccounts: { id: string; name: string; code: string | null }[];
};

export default function AccountForm({
  types,
  locations,
  doctors,
  agencies,
  cashAccounts,
}: AccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<AccountType>('CASH');
  const [parentAccountId, setParentAccountId] = useState<string>('__none__');
  const [locationId, setLocationId] = useState<string>('__none__');
  const [doctorId, setDoctorId] = useState<string>('__none__');
  const [agencyId, setAgencyId] = useState<string>('__none__');
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Name is required' });
      return;
    }

    const payload: CreateAccountInput = {
      name,
      type,
      code: (formData.get('code') as string)?.trim() || null,
      minBalanceAllowed: null,
    };

    const minVal = (formData.get('minBalanceAllowed') as string)?.trim();
    if (minVal !== '' && minVal !== undefined) {
      const num = Number(minVal);
      if (!Number.isNaN(num)) {
        payload.minBalanceAllowed = Math.round(num * 100);
      }
    }

    if (type === 'CASH') {
      if (parentAccountId && parentAccountId !== '__none__') payload.parentAccountId = parentAccountId;
      if (locationId && locationId !== '__none__') payload.locationId = locationId;
    } else if (type === 'PAYABLE' || type === 'RECEIVABLE') {
      if (doctorId && doctorId !== '__none__') payload.doctorId = doctorId;
      if (agencyId && agencyId !== '__none__') payload.agencyId = agencyId;
    }

    setLoading(true);
    try {
      const result = await createAccount(payload);
      if (result.success) {
        toast({ title: result.message ?? 'Account created' });
        router.push('/accounting');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add account</h2>
        <BackButton href="/accounting" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as AccountType)}
            name="type"
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required placeholder="Account name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Code (optional)</Label>
          <Input id="code" name="code" placeholder="e.g. CB-001" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minBalanceAllowed">
            Minimum balance allowed (optional, in currency units)
          </Label>
          <Input
            id="minBalanceAllowed"
            name="minBalanceAllowed"
            type="number"
            step="0.01"
            placeholder="e.g. 0 = no negative; -50 = allowed to -50"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for no limit. 0 = cannot go negative. Negative = allowed down to that value.
          </p>
        </div>

        {type === 'CASH' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="parentAccountId">Parent Cash Book (for branch)</Label>
              <Select value={parentAccountId} onValueChange={setParentAccountId}>
                <SelectTrigger id="parentAccountId">
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (main Cash Book)</SelectItem>
                  {cashAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code ?? a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location (branch)</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="locationId">
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {(type === 'PAYABLE' || type === 'RECEIVABLE') && (
          <>
            <div className="space-y-2">
              <Label htmlFor="doctorId">Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger id="doctorId">
                  <SelectValue placeholder="Select doctor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencyId">Agency</Label>
              <Select value={agencyId} onValueChange={setAgencyId}>
                <SelectTrigger id="agencyId">
                  <SelectValue placeholder="Select agency (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.code ?? '-'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}
