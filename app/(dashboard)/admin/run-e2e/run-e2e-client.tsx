"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play } from "lucide-react";

export function RunE2EClient() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/run-e2e", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
        setResult(null);
        return;
      }
      setResult({
        success: data.success ?? false,
        exitCode: data.exitCode ?? 1,
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleRun} disabled={running} className="gap-2">
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running E2E tests…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run E2E tests
          </>
        )}
      </Button>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className={result.success ? "border-green-600" : "border-destructive"}>
          <CardHeader>
            <CardTitle className={`text-base ${result.success ? "text-green-600" : "text-destructive"}`}>
              {result.success ? "Tests passed" : "Tests failed"}
            </CardTitle>
            <CardDescription>Exit code: {result.exitCode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.stdout && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                <pre className="rounded bg-muted p-3 text-xs overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {result.stdout}
                </pre>
              </div>
            )}
            {result.stderr && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Stderr</p>
                <pre className="rounded bg-destructive/10 p-3 text-xs overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap text-destructive">
                  {result.stderr}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Runs <code className="bg-muted px-1 rounded">npx playwright test</code> on the server. Ensure Playwright is
        installed and <code className="bg-muted px-1 rounded">e2e/</code> tests exist. Set E2E_USER_EMAIL and
        E2E_USER_PASSWORD if your tests require login.
      </p>
    </div>
  );
}
