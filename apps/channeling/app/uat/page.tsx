"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import type { UatCaseRow } from "@/app/api/uat/cases/route";
import type { UatResultsByTester } from "@/app/api/uat/results/route";

const CURRENT_TESTER_KEY = "uat-current-tester";

type ResultEntry = { status: "" | "pass" | "fail"; comment: string };

function loadCurrentTester(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(CURRENT_TESTER_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

function saveCurrentTester(name: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENT_TESTER_KEY, name);
  } catch (e) {
    console.warn("UAT save current tester failed", e);
  }
}

function normalizeByTester(byTester: UatResultsByTester): Record<string, { results: Record<string, ResultEntry>; sectionComplete: Record<string, boolean> }> {
  const out: Record<string, { results: Record<string, ResultEntry>; sectionComplete: Record<string, boolean> }> = {};
  for (const [name, state] of Object.entries(byTester)) {
    const results: Record<string, ResultEntry> = {};
    for (const [id, r] of Object.entries(state.results ?? {})) {
      results[id] = { status: (r.status as "" | "pass" | "fail") || "", comment: r.comment ?? "" };
    }
    out[name] = {
      results,
      sectionComplete: state.sectionComplete ?? {},
    };
  }
  return out;
}

/** Group by Feature in dependency order (API already returns rows sorted). */
function groupByFeature(rows: UatCaseRow[]): { feature: string; module: string; cases: UatCaseRow[] }[] {
  const seen = new Set<string>();
  const sections: { feature: string; module: string; cases: UatCaseRow[] }[] = [];
  for (const row of rows) {
    const f = row.Feature ?? "";
    if (!seen.has(f)) {
      seen.add(f);
      sections.push({ feature: f, module: row.Module ?? "", cases: [] });
    }
    const sec = sections.find((s) => s.feature === f);
    if (sec) sec.cases.push(row);
  }
  return sections;
}

export default function GuidedUatPage() {
  const [rows, setRows] = useState<UatCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [byTester, setByTester] = useState<Record<string, { results: Record<string, ResultEntry>; sectionComplete: Record<string, boolean> }>>({});
  const [currentTester, setCurrentTester] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const results = useMemo(
    () => (currentTester ? byTester[currentTester]?.results ?? {} : {}),
    [byTester, currentTester]
  );
  const sectionComplete = useMemo(
    () => (currentTester ? byTester[currentTester]?.sectionComplete ?? {} : {}),
    [byTester, currentTester]
  );

  const sections = useMemo(() => groupByFeature(rows), [rows]);
  const currentCases = useMemo(
    () => rows.filter((r) => r.Feature === selectedFeature),
    [rows, selectedFeature]
  );

  const summary = useMemo(() => {
    const totalSections = sections.length;
    const sectionsDone = Object.keys(sectionComplete).filter((f) => sectionComplete[f]).length;
    let passed = 0;
    let failed = 0;
    rows.forEach((r) => {
      const s = results[r["Test Case ID"]]?.status;
      if (s === "pass") passed++;
      else if (s === "fail") failed++;
    });
    const notSet = rows.length - passed - failed;
    return { totalSections, sectionsDone, passed, failed, notSet };
  }, [sections.length, sectionComplete, results, rows]);

  const fetchResults = useCallback(() => {
    return fetch("/api/uat/results", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { byTester: {} }))
      .then((data: { byTester: UatResultsByTester }) => normalizeByTester(data.byTester ?? {}));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/uat/cases", { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error("Failed to load cases");
        return res.json();
      }),
      fetchResults(),
    ])
      .then(([casesData, normalizedByTester]: [UatCaseRow[], ReturnType<typeof normalizeByTester>]) => {
        setRows(casesData);
        setByTester(normalizedByTester);
        if (casesData.length && !selectedFeature) setSelectedFeature(casesData[0].Feature ?? null);
        const name = loadCurrentTester();
        if (name) setCurrentTester(name);
        else setShowNameModal(true);
        setError(null);
      })
      .catch((e) => setError(e.message || "Failed to load UAT data"))
      .finally(() => setLoading(false));
  }, [fetchResults]);

  // When name modal is shown, refetch results so other devices' data is visible (e.g. "continue as")
  useEffect(() => {
    if (!showNameModal || loading) return;
    fetchResults().then((normalized) => setByTester(normalized));
  }, [showNameModal, loading, fetchResults]);

  const handleSetTester = useCallback((name: string) => {
    const n = name.trim();
    if (!n) return;
    setCurrentTester(n);
    setShowNameModal(false);
    setNameInput("");
    saveCurrentTester(n);
    setByTester((prev) => ({
      ...prev,
      [n]: prev[n] ?? { results: {}, sectionComplete: {} },
    }));
  }, []);

  const switchTester = () => {
    setShowNameModal(true);
    setNameInput(currentTester ?? "");
  };

  const setResult = useCallback(
    (id: string, update: Partial<ResultEntry>) => {
      if (!currentTester) return;
      const next: ResultEntry = {
        status: (update.status ?? results[id]?.status ?? "") as "" | "pass" | "fail",
        comment: update.comment ?? results[id]?.comment ?? "",
      };
      setByTester((prev) => ({
        ...prev,
        [currentTester]: {
          ...prev[currentTester],
          results: { ...prev[currentTester]?.results, [id]: next },
          sectionComplete: prev[currentTester]?.sectionComplete ?? {},
        },
      }));
      fetch("/api/uat/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testerName: currentTester,
          testCaseId: id,
          status: next.status || undefined,
          comment: next.comment || null,
        }),
      }).catch((e) => console.warn("UAT save result failed", e));
    },
    [currentTester, results]
  );

  const markSectionComplete = useCallback(
    (featureName: string) => {
      if (!currentTester) return;
      setByTester((prev) => ({
        ...prev,
        [currentTester]: {
          ...prev[currentTester],
          results: prev[currentTester]?.results ?? {},
          sectionComplete: { ...prev[currentTester]?.sectionComplete, [featureName]: true },
        },
      }));
      fetch("/api/uat/results/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testerName: currentTester, feature: featureName }),
      }).catch((e) => console.warn("UAT save section failed", e));
    },
    [currentTester]
  );

  const exportResults = () => {
    const header = "Tester,Module,Feature,Test Case ID,Test Case Description,Steps,Expected Result,Pass/Fail,Notes";
    const lines = rows.map((r) => {
      const id = r["Test Case ID"];
      const entry = results[id];
      const passFail = entry?.status === "pass" ? "Pass" : entry?.status === "fail" ? "Fail" : "";
      const notes = (entry?.comment ?? "").replace(/"/g, '""');
      const tester = (currentTester ?? "").replace(/"/g, '""');
      return [
        tester ? `"${tester}"` : "",
        r.Module,
        r.Feature,
        id,
        r["Test Case Description"],
        r.Steps,
        r["Expected Result"],
        passFail,
        notes ? `"${notes}"` : "",
      ].join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `uat-results-${currentTester ? `${currentTester.replace(/\s+/g, "-")}-` : ""}${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Loading UAT cases…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  const showTesterModal = showNameModal || !currentTester;
  const existingTesterNames = Object.keys(byTester).filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {showTesterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Who is testing?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your name so your pass/fail and section progress are saved separately.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetTester(nameInput)}
              placeholder="Your name"
              className="mt-4 w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetTester(nameInput)}
                disabled={!nameInput.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Start
              </button>
              {existingTesterNames.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">or continue as:</span>
                  {existingTesterNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSetTester(name)}
                      className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm hover:bg-muted/80"
                    >
                      {name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {currentTester && (
        <>
      <aside className="w-full border-b border-border bg-muted/30 p-4 md:w-56 md:border-b-0 md:border-r">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sections
        </h2>
        <nav className="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
          {sections.map(({ feature, module: mod }) => (
            <button
              key={feature}
              type="button"
              onClick={() => setSelectedFeature(feature)}
              className={`flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                selectedFeature === feature
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs">
                  {sectionComplete[feature] ? "✓" : ""}
                </span>
                {feature}
              </span>
              {mod && (
                <span className={`ml-7 text-xs ${selectedFeature === feature ? "opacity-90" : "text-muted-foreground"}`}>
                  {mod}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Guided UAT</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Testing as <span className="font-medium text-foreground">{currentTester}</span>
                {" · "}
                Complete each section. Mark Pass/Fail and add comments. When done, mark section complete.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={switchTester}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Switch tester
              </button>
              <button
                type="button"
                onClick={exportResults}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Export results
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="font-medium">Summary</span>
            <span>
              Sections: <strong>{summary.sectionsDone}/{summary.totalSections}</strong> complete
            </span>
            <span>
              Passed: <strong className="text-green-600">{summary.passed}</strong>
            </span>
            <span>
              Failed: <strong className="text-red-600">{summary.failed}</strong>
            </span>
            {summary.notSet > 0 && (
              <span className="text-muted-foreground">
                Not set: {summary.notSet}
              </span>
            )}
          </div>
        </header>

        {selectedFeature && (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{selectedFeature}</h2>
              <button
                type="button"
                onClick={() => markSectionComplete(selectedFeature)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Mark section complete
              </button>
            </div>

            <ul className="space-y-6">
              {currentCases.map((row) => {
                const id = row["Test Case ID"];
                const entry = results[id] ?? { status: "" as const, comment: "" };
                return (
                  <li
                    key={id}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        {id}
                      </span>
                      <span className="font-medium">{row["Test Case Description"]}</span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <p>
                        <span className="font-medium text-muted-foreground">Steps: </span>
                        {row.Steps}
                      </p>
                      <p>
                        <span className="font-medium text-muted-foreground">Expected: </span>
                        {row["Expected Result"]}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Result:</span>
                      <button
                        type="button"
                        onClick={() => setResult(id, { status: "pass" })}
                        className={`rounded px-3 py-1 text-sm font-medium ${
                          entry.status === "pass"
                            ? "bg-green-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-green-600/20"
                        }`}
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => setResult(id, { status: "fail" })}
                        className={`rounded px-3 py-1 text-sm font-medium ${
                          entry.status === "fail"
                            ? "bg-red-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-red-600/20"
                        }`}
                      >
                        Fail
                      </button>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        Issue / comment
                      </label>
                      <textarea
                        placeholder="Add an issue or comment…"
                        value={entry.comment}
                        onChange={(e) => setResult(id, { comment: e.target.value })}
                        className="w-full rounded border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        rows={2}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
        </>
      )}
    </div>
  );
}
