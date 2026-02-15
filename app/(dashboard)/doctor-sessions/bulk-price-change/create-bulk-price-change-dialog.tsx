'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { FEE_TYPES } from '@/types/doctor.session';
import { useToast } from '@/components/hooks/use-toast';
import { createBulkPriceChange } from '@/app/actions/bulk-price-change.action';
import { Loader2 } from 'lucide-react';

type CreateBulkPriceChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
};

export function CreateBulkPriceChangeDialog({
  open,
  onOpenChange,
  onCreated
}: CreateBulkPriceChangeDialogProps) {
  const [name, setName] = useState('');
  const [feeTypeId, setFeeTypeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (!feeTypeId) {
      toast({ title: 'Please select a fee type', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await createBulkPriceChange(name.trim(), feeTypeId);
      if (res.success && res.data?.id) {
        toast({ title: 'Bulk price change created' });
        setName('');
        setFeeTypeId('');
        onOpenChange(false);
        onCreated(res.data.id);
      } else {
        toast({ title: res.error?.message ?? 'Failed to create', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New bulk price change</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-name">Name of the price change</Label>
            <Input
              id="bulk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 2025 Hospital Fee Update"
            />
          </div>
          <div className="space-y-2">
            <Label>Fee type to change (one at a time)</Label>
            <Select value={feeTypeId} onValueChange={setFeeTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select fee type" />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name} ({fee.feeType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
