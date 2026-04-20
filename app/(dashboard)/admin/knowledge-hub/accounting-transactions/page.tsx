import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/common/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchServerSession } from "@/lib/session";
import { userTypes } from "@/lib/roles";
import type { ReactNode } from "react";

type Scenario = {
  title: string;
  when: string;
  example: string;
  debit: string[];
  credit: string[];
  notes?: string[];
};

const SCENARIOS: Scenario[] = [
  {
    title: "Channel Payment (cash/card/slip/check/e-wallet/credit/agent)",
    when: "Receipt method = PAYMENT",
    example: "Patient pays LKR 2,000 at till for channeling.",
    debit: [
      "Till CASH (or Agent PAYABLE / Credit Customer RECEIVABLE depending on payment method)",
    ],
    credit: [
      "Branch INCOME (hospital fee side)",
      "Doctor PAYABLE (professional fee side, when fee split is present)",
    ],
    notes: [
      "Channel payment/refund routes branch side to INCOME account.",
      "For agent/credit customer methods, the debit side uses their linked account.",
    ],
  },
  {
    title: "Channel Refund",
    when: "Receipt method = REFUND",
    example: "Booking cancelled and LKR 2,000 refunded.",
    debit: [
      "Branch INCOME (hospital fee reversal)",
      "Doctor PAYABLE (professional fee reversal, when fee split is present)",
    ],
    credit: [
      "Till CASH (or Agent PAYABLE / Credit Customer RECEIVABLE depending on payment method)",
    ],
  },
  {
    title: "Branch Income",
    when: "Ledger receipt method = BRANCH_INCOME",
    example: "Misc branch income (e.g. file charge) LKR 500 received in cash.",
    debit: ["Till CASH"],
    credit: ["Branch INCOME"],
  },
  {
    title: "Branch Expense",
    when: "Ledger receipt method = BRANCH_EXPENSE",
    example: "Branch pays courier expense LKR 300 from till.",
    debit: ["Branch EXPENSE"],
    credit: ["Till CASH"],
  },
  {
    title: "Agency Debit Note",
    when: "Ledger receipt method = DEBIT_NOTE",
    example: "Charge LKR 1,000 to agency payable balance.",
    debit: ["Agent PAYABLE"],
    credit: ["Branch CASH book"],
  },
  {
    title: "Agency Credit Note",
    when: "Ledger receipt method = CREDIT_NOTE",
    example: "Reverse prior agency charge by LKR 1,000.",
    debit: ["Branch CASH book"],
    credit: ["Agent PAYABLE"],
  },
  {
    title: "Agency Deposit",
    when: "Ledger receipt method = AGENCY_DEPOSIT",
    example: "Agency deposits LKR 5,000 as prepaid balance.",
    debit: ["Till CASH (cash method) OR Branch CASH book (non-cash method)"],
    credit: ["Agent PAYABLE"],
  },
  {
    title: "Agency Withdraw",
    when: "Ledger receipt method = AGENCY_WITHDRAW",
    example: "Agency withdraws LKR 2,000 from prepaid.",
    debit: ["Agent PAYABLE"],
    credit: ["Till CASH"],
  },
  {
    title: "Doctor Payment",
    when: "Ledger receipt method = DOCTOR_PAYMENT",
    example: "Pay doctor net LKR 10,000 after WHT.",
    debit: ["Doctor PAYABLE"],
    credit: ["Till CASH (cash) OR Branch CASH book (non-cash)"],
    notes: ["Net amount is used (gross - WHT)."],
  },
  {
    title: "Doctor Payment Cancel",
    when: "Ledger receipt method = DOCTOR_CANCEL",
    example: "Reverse doctor payment of net LKR 10,000.",
    debit: ["Till CASH (cash) OR Branch CASH book (non-cash)"],
    credit: ["Doctor PAYABLE"],
    notes: ["Reverse of Doctor Payment, using net amount."],
  },
];

const ACCOUNT_NAME_PATTERNS = [
  "Till CASH",
  "Agent PAYABLE",
  "Credit Customer RECEIVABLE",
  "Branch INCOME",
  "Doctor PAYABLE",
  "Branch EXPENSE",
  "Branch CASH book",
] as const;

function renderAccountLine(line: string): ReactNode {
  const sortedPatterns = [...ACCOUNT_NAME_PATTERNS].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(${sortedPatterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = line.split(regex);
  return (
    <>
      {parts.map((part, idx) =>
        ACCOUNT_NAME_PATTERNS.includes(part as (typeof ACCOUNT_NAME_PATTERNS)[number]) ? (
          <strong key={`${part}-${idx}`}>{part}</strong>
        ) : (
          <span key={`${part}-${idx}`}>{part}</span>
        )
      )}
    </>
  );
}

export default async function AdminAccountingTransactionsKnowledgePage() {
  const session = await fetchServerSession();
  if (!session?.user) {
    redirect("/login");
  }
  const userType = (session.user as { userType?: number }).userType;
  if (userType !== userTypes.admin) {
    redirect("/unauthorized-access");
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Hub: Accounting Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Readable scenarios for how debit and credit lines are posted for receipt-driven transactions.
          </p>
        </div>
        <BackButton href="/admin/knowledge-hub" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope</CardTitle>
          <CardDescription>
            These scenarios summarize current posting behavior in receipt/journal flows. For implementation details,
            check <code className="rounded bg-muted px-1 py-0.5">services/channel-booking/helpers/receipt-journal-entry.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Branch side routing now uses INCOME for channel sales and BRANCH_INCOME receipts, and EXPENSE for
            BRANCH_EXPENSE receipts.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Reference Table</CardTitle>
          <CardDescription>Short view of each transaction with a real-world example.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Scenario</th>
                  <th className="px-3 py-2 text-left font-semibold">Example</th>
                  <th className="px-3 py-2 text-left font-semibold">Debit</th>
                  <th className="px-3 py-2 text-left font-semibold">Credit</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((scenario) => (
                  <tr key={`row-${scenario.title}`} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{scenario.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{scenario.example}</td>
                    <td className="px-3 py-2">
                      <ul className="list-disc pl-4 space-y-1">
                        {scenario.debit.map((line) => (
                          <li key={`debit-${scenario.title}-${line}`}>{renderAccountLine(line)}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2">
                      <ul className="list-disc pl-4 space-y-1">
                        {scenario.credit.map((line) => (
                          <li key={`credit-${scenario.title}-${line}`}>{renderAccountLine(line)}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Link href="/admin/knowledge-hub/transaction-flow" className="text-sm underline underline-offset-4">
          Need visual workflow too? Open Transaction Flow Diagram
        </Link>
      </div>
    </div>
  );
}

