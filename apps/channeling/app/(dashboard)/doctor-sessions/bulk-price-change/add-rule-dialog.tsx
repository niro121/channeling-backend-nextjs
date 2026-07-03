'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LOCAL_FEE_OPERATORS, type BulkPriceChangeRule } from '@/types/bulk-price-change';
import { useToast } from '@/components/hooks/use-toast';
import { Loader2, ArrowRight, Sliders } from 'lucide-react';

const OP_LABELS: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '='
};

type AddRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkPriceChangeId: string;
  onAdded: () => void;
  addRuleAction: (
    bulkId: string,
    rule: Omit<BulkPriceChangeRule, 'id' | 'bulkPriceChangeId'>
  ) => Promise<{ success: boolean; error?: { message: string } }>;
};

type ConditionType = 'single' | 'range';

export function AddRuleDialog({
  open,
  onOpenChange,
  bulkPriceChangeId,
  onAdded,
  addRuleAction
}: AddRuleDialogProps) {
  const [conditionType, setConditionType] = useState<ConditionType>('single');
  const [loading, setLoading] = useState(false);
  const [single, setSingle] = useState({
    localFeeOp: 'gt' as BulkPriceChangeRule['localFeeOp'],
    localFeeValue: ''
  });
  const [range, setRange] = useState({ from: '', to: '' });
  const [newLocalFee, setNewLocalFee] = useState('');
  const [newForeignFee, setNewForeignFee] = useState('');
  const { toast } = useToast();

  const resetForm = () => {
    setSingle({ localFeeOp: 'gt', localFeeValue: '' });
    setRange({ from: '', to: '' });
    setNewLocalFee('');
    setNewForeignFee('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newLocal = parseFloat(newLocalFee);
    const newForeign = parseFloat(newForeignFee);
    if (isNaN(newLocal) || isNaN(newForeign)) {
      toast({ title: 'Enter valid new local and foreign fees', variant: 'destructive' });
      return;
    }

    if (conditionType === 'range') {
      const from = parseFloat(range.from);
      const to = parseFloat(range.to);
      if (isNaN(from) || isNaN(to)) {
        toast({ title: 'Enter valid From and To values', variant: 'destructive' });
        return;
      }
      if (from > to) {
        toast({ title: 'From must be less than or equal to To', variant: 'destructive' });
        return;
      }
      setLoading(true);
      const res = await addRuleAction(bulkPriceChangeId, {
        localFeeOp: 'range',
        localFeeValue: from,
        localFeeMin: from,
        localFeeMax: to,
        newLocalFee: newLocal,
        newForeignFee: newForeign
      });
      setLoading(false);
      if (res.success) {
        toast({ title: 'Rule added' });
        resetForm();
        onOpenChange(false);
        onAdded();
      } else {
        toast({ title: res.error?.message ?? 'Failed to add rule', variant: 'destructive' });
      }
      return;
    }

    const value = parseFloat(single.localFeeValue);
    if (isNaN(value)) {
      toast({ title: 'Enter a valid value for the condition', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const res = await addRuleAction(bulkPriceChangeId, {
      localFeeOp: single.localFeeOp,
      localFeeValue: value,
      newLocalFee: newLocal,
      newForeignFee: newForeign
    });
    setLoading(false);
    if (res.success) {
      toast({ title: 'Rule added' });
      resetForm();
      onOpenChange(false);
      onAdded();
    } else {
      toast({ title: res.error?.message ?? 'Failed to add rule', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:rounded-lg">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Add rule</DialogTitle>
          <DialogDescription>
            When the current local fee matches your condition, it will be updated to the new fees below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-0">
          {/* Condition section */}
          <div className="space-y-4 px-6 pb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              Condition
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConditionType('single')}
                className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  conditionType === 'single'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <span className="font-medium">Single</span>
                <span className="mt-0.5 block text-xs opacity-80">e.g. local fee &gt; 100</span>
              </button>
              <button
                type="button"
                onClick={() => setConditionType('range')}
                className={`flex-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  conditionType === 'range'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <span className="font-medium">Range</span>
                <span className="mt-0.5 block text-xs opacity-80">From value to value</span>
              </button>
            </div>

            {conditionType === 'single' && (
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Local fee is</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={single.localFeeOp}
                      onValueChange={(v) =>
                        setSingle((s) => ({ ...s, localFeeOp: v as BulkPriceChangeRule['localFeeOp'] }))
                      }
                    >
                      <SelectTrigger className="w-[72px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCAL_FEE_OPERATORS.map((op) => (
                          <SelectItem key={op} value={op}>
                            {OP_LABELS[op] ?? op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="100"
                      value={single.localFeeValue}
                      onChange={(e) => setSingle((s) => ({ ...s, localFeeValue: e.target.value }))}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            )}

            {conditionType === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">From (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="100"
                    value={range.from}
                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">To (max)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="500"
                    value={range.to}
                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className="my-0" />

          {/* New fees section */}
          <div className="space-y-4 px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Set new fees
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">New local fee</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="300"
                  value={newLocalFee}
                  onChange={(e) => setNewLocalFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">New foreign fee</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="400"
                  value={newForeignFee}
                  onChange={(e) => setNewForeignFee(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator className="my-0" />

          <DialogFooter className="gap-2 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add rule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
