import { fetchServerSession } from '@/lib/session';
import { DollarSign, CreditCard, Receipt, CheckSquare, TrendingUp, Clock } from 'lucide-react';

export default async function WelcomePage() {
  const session = await fetchServerSession();
  const userName = session?.user?.name ?? 'there';

  const stats = [
    { label: 'Doctor Payments', value: '—', icon: DollarSign, description: 'This month' },
    { label: 'Pending Payments', value: '—', icon: CreditCard, description: 'Awaiting processing' },
    { label: 'Receipts Issued', value: '—', icon: Receipt, description: 'This month' },
    { label: 'Reconciled', value: '—', icon: CheckSquare, description: 'Transactions matched' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s an overview of your payment operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Recent Transactions</h2>
          </div>
          <div className="space-y-3">
            {['Doctor payment processed', 'Receipt #1042 issued', 'Reconciliation completed'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 italic">Connect your data to see live transactions.</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Pending Actions</h2>
          </div>
          <div className="space-y-3">
            {['Approve pending payments', 'Monthly reconciliation', 'Generate payment report'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 italic">Connect your data to see pending items.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
