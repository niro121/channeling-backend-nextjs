import { redirect } from "next/navigation";
import { fetchServerSession } from "@/lib/session";
import { userTypes } from "@/lib/roles";
import { RunE2EClient } from "./run-e2e-client";
import { TestingGuideDialog } from "./testing-guide-dialog";
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
          <h1 className="text-2xl font-semibold tracking-tight">Run end-to-end (E2E) tests</h1>
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Run end-to-end (E2E) tests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Run automated booking tests from this page. Open the testing guide if you need step-by-step instructions.
          </p>
        </div>
        <TestingGuideDialog />
      </div>

      <RunE2EClient />
    </div>
  );
}
