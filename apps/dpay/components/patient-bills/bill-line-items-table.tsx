'use client';

import { useState } from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@archmage/ui';
import type { BillLineItem } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { countActiveLineItems, isDeletedLineItem } from '@/lib/patient-bills/line-item-status';
import { LineItemHistoryDialog } from './line-item-history-dialog';
import { AddLineItemDialog } from './add-line-item-dialog';
import { RemoveLineItemDialog } from './remove-line-item-dialog';

type BillLineItemsTableProps = {
  billId: string;
  lineItems: BillLineItem[];
  totalAmount: number;
  canManageItems?: boolean;
};

export function BillLineItemsTable({
  billId,
  lineItems,
  totalAmount,
  canManageItems = false,
}: BillLineItemsTableProps) {
  const [historyItem, setHistoryItem] = useState<BillLineItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [removeItem, setRemoveItem] = useState<BillLineItem | null>(null);

  const activeCount = countActiveLineItems(lineItems);
  const deletedCount = lineItems.length - activeCount;

  return (
    <>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 p-5 border-b sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Bill Line Items</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeCount} active line item{activeCount === 1 ? '' : 's'}
              {deletedCount > 0
                ? ` · ${deletedCount} deleted`
                : ''}
            </p>
          </div>
          {canManageItems ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs uppercase tracking-wide">Doctor Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Description</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No doctor charges yet.
                    {canManageItems ? ' Use Add Item to add the first charge.' : ''}
                  </TableCell>
                </TableRow>
              ) : (
                lineItems.map((item) => {
                  const deleted = isDeletedLineItem(item);
                  const canRemove = canManageItems && !deleted && !item.doctorPaymentId;

                  return (
                    <TableRow
                      key={item.id}
                      className={deleted ? 'bg-muted/20 hover:bg-muted/20' : undefined}
                    >
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'font-medium',
                              deleted && 'line-through text-muted-foreground'
                            )}
                          >
                            {item.doctorName}
                          </span>
                          {deleted ? (
                            <Badge
                              variant="outline"
                              className="h-5 border-destructive/30 bg-destructive/5 text-destructive"
                            >
                              Deleted
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-muted-foreground',
                          deleted && 'line-through'
                        )}
                      >
                        {item.description}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          deleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {formatLkr(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View line item history"
                            onClick={() => setHistoryItem(item)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View history</span>
                          </Button>
                          {canManageItems && !deleted ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title={
                                item.doctorPaymentId
                                  ? 'Cannot remove — linked to a doctor payment'
                                  : 'Remove line item'
                              }
                              onClick={() => setRemoveItem(item)}
                              disabled={!canRemove}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove item</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end border-t px-5 py-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-primary tabular-nums">{formatLkr(totalAmount)}</p>
          </div>
        </div>
      </div>

      <LineItemHistoryDialog
        open={!!historyItem}
        onOpenChange={(open) => {
          if (!open) setHistoryItem(null);
        }}
        lineItem={historyItem}
      />

      <AddLineItemDialog billId={billId} open={addOpen} onOpenChange={setAddOpen} />

      <RemoveLineItemDialog
        billId={billId}
        open={!!removeItem}
        onOpenChange={(open) => {
          if (!open) setRemoveItem(null);
        }}
        lineItem={removeItem}
      />
    </>
  );
}
