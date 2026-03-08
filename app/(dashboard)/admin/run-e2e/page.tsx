import { redirect } from "next/navigation";
import { fetchServerSession } from "@/lib/session";
import { userTypes } from "@/lib/roles";
import { RunE2EClient } from "./run-e2e-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const E2E_RUN_ENABLED =
  process.env.E2E_RUN_FROM_APP === "true" || process.env.E2E_RUN_FROM_APP === "1";

export default async function AdminRunE2EPage() {
  const session = await fetchServerSession();
  if (!session?.user) {
    redirect("/login");
  }
  const userType = (session.user as { userType?: number }).userType;
  if (userType !== userTypes.admin) {
    redirect("/unauthorized-access");
  }

  if (!E2E_RUN_ENABLED) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Run E2E tests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            E2E test runner is disabled. Set <code className="bg-muted px-1 rounded">E2E_RUN_FROM_APP=true</code> in
            your environment (e.g. Heroku config) to enable. When you go live, do not set this variable and the feature
            will not be available.
          </p>
        </div>
        <Link href="/admin/monitor">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Run E2E tests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Trigger Playwright E2E tests from this page. Tests run on the server; do not set E2E_RUN_FROM_APP in
          production.
        </p>
      </div>
      <RunE2EClient />
    </div>
  );
}
