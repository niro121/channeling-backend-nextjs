import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@archmage/ui';
import type { BillLineItem } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';

type BillLineItemsTableProps = {
  lineItems: BillLineItem[];
  totalAmount: number;
};

export function BillLineItemsTable({ lineItems, totalAmount }: BillLineItemsTableProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b">
        <h2 className="text-base font-semibold">Bill Line Items</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {lineItems.length} line item{lineItems.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide">Doctor Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Description</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.doctorName}</TableCell>
                <TableCell className="text-muted-foreground">{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">{formatLkr(item.amount)}</TableCell>
              </TableRow>
            ))}
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
  );
}
