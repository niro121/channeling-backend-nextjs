import React from 'react';
import Link from 'next/link';
import { getMyTillBalance } from '@/app/actions/till.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  Receipt,
  Smartphone,
  Pencil,
  Link2,
  CircleDollarSign,
} from 'lucide-react';
import { formatCents } from '@/lib/format-money';
import { CreateTillButton } from './create-till-button';
import type { MyTillBalance as Balance } from '@/app/actions/till.actions';

const BALANCE_ITEMS: Array<{
  key: keyof Pick<
    Balance,
    'cashCents' | 'cardCents' | 'slipCents' | 'checkCents' | 'creditCents' | 'eWalletCents' | 'totalCents'
  >;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'cashCents', label: 'Cash', icon: Banknote },
  { key: 'cardCents', label: 'Card', icon: CreditCard },
  { key: 'slipCents', label: 'Slip', icon: FileText },
  { key: 'checkCents', label: 'Cheque', icon: Landmark },
  { key: 'creditCents', label: 'Credit', icon: Receipt },
  { key: 'eWalletCents', label: 'E-Wallet', icon: Smartphone },
  { key: 'totalCents', label: 'Total', icon: CircleDollarSign },
];

export async function TillBalanceSection() {
  const res = await getMyTillBalance();
  if (!res.success || !res.data) {
    return (
      <p className="text-sm text-muted-foreground">{res.message ?? 'Unable to load till balance.'}</p>
    );
  }

  const balance = res.data;
  const hasTill = balance.tillAccountId != null;
  const isTotal = (k: string) => k === 'totalCents';

  return (
    <>
      {!hasTill && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">No till account yet</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create your till account to track cash, card, slip and other payment types. You can edit the account later from this page.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CreateTillButton />
          </CardContent>
        </Card>
      )}

      {hasTill && balance.tillAccountId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Link2 className="h-4 w-4" />
              Linked account
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {balance.tillAccountName ?? 'Till account'}
              {balance.tillAccountCode ? (
                <span className="ml-1 font-normal text-muted-foreground">({balance.tillAccountCode})</span>
              ) : null}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/accounting/${balance.tillAccountId}/edit`} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit account
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CircleDollarSign className="h-4 w-4" />
          Balance by payment type
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BALANCE_ITEMS.map(({ key, label, icon: Icon }) => (
            <Card key={key} className={isTotal(key) ? 'border-primary/50 bg-primary/5' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className={`h-4 w-4 ${isTotal(key) ? 'text-primary' : ''}`} />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-semibold tabular-nums ${isTotal(key) ? 'text-primary' : ''}`}>
                  {formatCents(balance[key])}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">LKR</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
