import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkRouteAccess } from "@/lib/server-permissions";

export default async function AdminKnowledgeHubPage() {
  const canView = await checkRouteAccess("/admin/knowledge-hub");
  if (!canView) {
    redirect("/unauthorized-access");
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Hub</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Admin reference pages for how key workflows behave in the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Accounting Transactions</CardTitle>
          <CardDescription>
            Readable debit/credit scenarios for channeling, ledger, and related receipt flows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/admin/knowledge-hub/accounting-transactions">Open module</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Flow</CardTitle>
          <CardDescription>
            Visual workflow of receipt, booking, refund, ledger, and journal-entry paths.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/knowledge-hub/transaction-flow">Open module</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

