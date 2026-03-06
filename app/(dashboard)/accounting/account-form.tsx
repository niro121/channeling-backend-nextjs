'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount, updateAccount } from '@/app/actions/accounting.actions';
import type { CreateAccountInput, UpdateAccountInput, AccountType, Account } from '@/types/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { Ban, Save } from 'lucide-react';

type AccountFormProps = {
  account?: Account | null;
  types: { value: AccountType; label: string }[];
  locations: { id: string; name: string }[];
  doctors: { id: string; name: string; code: string }[];
  agencies: { id: string; name: string; code: string | null }[];
  creditCustomers?: { id: string; name: string; code: string | null }[];
  cashAccounts: { id: string; name: string; code: string | null }[];
};

export default function AccountForm({
  account,
  types,
  locations,
  doctors,
  agencies,
  creditCustomers = [],
  cashAccounts,
}: AccountFormProps) {
  const isEdit = !!account?.id;
  const [loading, setLoading] = useState(false);
  const saveAndCloseRef = React.useRef<boolean>(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [type, setType] = useState<AccountType>(account?.type ?? 'CASH');
  const [parentAccountId, setParentAccountId] = useState<string>(account?.parentAccountId ?? '__none__');
  const [locationId, setLocationId] = useState<string>(account?.locationId ?? '__none__');
  const [doctorId, setDoctorId] = useState<string>(account?.doctorId ?? '__none__');
  const [agencyId, setAgencyId] = useState<string>(account?.agencyId ?? '__none__');
  const [creditCustomerId, setCreditCustomerId] = useState<string>(account?.creditCustomerId ?? '__none__');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!account) return;
    setType(account.type);
    setParentAccountId(account.parentAccountId ?? '__none__');
    setLocationId(account.locationId ?? '__none__');
    setDoctorId(account.doctorId ?? '__none__');
    setAgencyId(account.agencyId ?? '__none__');
    setCreditCustomerId(account.creditCustomerId ?? '__none__');
  }, [account]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Name is required' });
      return;
    }

    const code = (formData.get('code') as string)?.trim() || null;
    const minVal = (formData.get('minBalanceAllowed') as string)?.trim();
    let minBalanceAllowed: number | null = null;
    if (minVal !== '' && minVal !== undefined) {
      const num = Number(minVal);
      if (!Number.isNaN(num)) minBalanceAllowed = Math.round(num * 100);
    }

    setLoading(true);
    try {
      if (isEdit && account?.id) {
        const payload: UpdateAccountInput = {
          name,
          code,
          minBalanceAllowed,
        };
        if (type === 'CASH') {
          payload.parentAccountId = parentAccountId === '__none__' ? null : parentAccountId;
          payload.locationId = locationId === '__none__' ? null : locationId;
        } else if (type === 'PAYABLE' || type === 'RECEIVABLE') {
          payload.doctorId = doctorId === '__none__' ? null : doctorId;
          payload.agencyId = agencyId === '__none__' ? null : agencyId;
          payload.creditCustomerId = creditCustomerId === '__none__' ? null : creditCustomerId;
        }
        const result = await updateAccount(account.id, payload);
        if (result.success) {
          toast({ title: result.message ?? 'Account updated' });
          if (saveAndCloseRef.current) {
            router.push('/accounting');
          } else {
            router.refresh();
          }
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      } else {
        const payload: CreateAccountInput = {
          name,
          type,
          code,
          minBalanceAllowed,
        };
        if (type === 'CASH') {
          if (parentAccountId && parentAccountId !== '__none__') payload.parentAccountId = parentAccountId;
          if (locationId && locationId !== '__none__') payload.locationId = locationId;
        } else if (type === 'PAYABLE' || type === 'RECEIVABLE') {
          if (doctorId && doctorId !== '__none__') payload.doctorId = doctorId;
          if (agencyId && agencyId !== '__none__') payload.agencyId = agencyId;
          if (creditCustomerId && creditCustomerId !== '__none__') payload.creditCustomerId = creditCustomerId;
        }
        const result = await createAccount(payload);
        if (result.success) {
          toast({ title: result.message ?? 'Account created' });
          if (saveAndCloseRef.current) {
            router.push('/accounting');
          } else if (result.data?.id) {
            router.push(`/accounting/${result.data.id}/edit`);
          } else {
            router.push('/accounting');
          }
          router.refresh();
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid gap-4 rounded-lg border p-6">
        <h3 className="text-lg font-medium">Account details</h3>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as AccountType)}
            name="type"
            disabled={isEdit}
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
          {isEdit && (
            <p className="text-xs text-muted-foreground">Type cannot be changed after creation.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Account name"
            defaultValue={account?.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Code (optional)</Label>
          <Input
            id="code"
            name="code"
            placeholder="e.g. CB-001"
            defaultValue={account?.code ?? ''}
          />
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
            defaultValue={
              account?.minBalanceAllowed != null
                ? (account.minBalanceAllowed / 100).toFixed(2)
                : ''
            }
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
            {type === 'RECEIVABLE' && creditCustomers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="creditCustomerId">Credit customer</Label>
                <Select value={creditCustomerId} onValueChange={setCreditCustomerId}>
                  <SelectTrigger id="creditCustomerId">
                    <SelectValue placeholder="Select credit customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {creditCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code ?? '-'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
            type="button"
            onClick={() => router.push('/accounting')}
            disabled={loading}
          >
            <Ban className="h-4 w-4" />
            <span>Cancel</span>
          </Button>
          <Button
            disabled={loading}
            size="sm"
            type="button"
            className="w-full sm:w-auto gap-1 text-white px-6 transition-colors ease-in-out duration-100 hover:text-black"
            onClick={() => {
              saveAndCloseRef.current = false;
              formRef.current?.requestSubmit();
            }}
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
          <Button
            disabled={loading}
            size="sm"
            type="button"
            variant="secondary"
            className="w-full sm:w-auto gap-1 px-6"
            onClick={() => {
              saveAndCloseRef.current = true;
              formRef.current?.requestSubmit();
            }}
          >
            <Save className="h-4 w-4" />
            <span>Save and Close</span>
          </Button>
      </div>
    </form>
  );
}
