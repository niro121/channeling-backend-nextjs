import { Card, CardContent } from '@archmage/ui';
import { formatLkr } from '@/lib/patient-bills/calculations';

type BillDetailSummaryCardsProps = {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  lineItemCount: number;
  receiptCount?: number;
};

export function BillDetailSummaryCards({
  totalAmount,
  paidAmount,
  outstandingAmount,
  lineItemCount,
  receiptCount = 0,
}: BillDetailSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total Bill
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{formatLkr(totalAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lineItemCount} line item{lineItemCount === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Received Amount
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{formatLkr(paidAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {receiptCount} receipt{receiptCount === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Outstanding
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
            {formatLkr(outstandingAmount)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
