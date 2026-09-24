import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, Home, Lock } from "lucide-react";
import { fetchServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import GoBackButton from "./go-back-button";

export default async function UnauthorizedAccessPage() {
  const session = await fetchServerSession();

  // If no session, redirect to login
  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
                <ShieldX className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Access Denied</CardTitle>
            <CardDescription className="text-lg">
              You don't have permission to access this resource
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">
                Your account doesn't have the necessary permissions to view this page.
              </p>
              <p className="text-sm text-muted-foreground">
                If you believe this is an error, please contact your administrator to request access.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild variant="default" className="gap-2">
                <Link href="/welcome">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
              <GoBackButton />
            </div>

            <div className="pt-6 border-t">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Need Access?</p>
                  <p className="text-xs text-muted-foreground">
                    Contact your system administrator to request the appropriate user group permissions
                    for this resource.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
