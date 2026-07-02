"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Play, Pencil, Trash2, Plus, GitBranch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/common/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { E2EScenarioWorkflow } from "./e2e-scenario-workflow";

const REF_NO_OPTIONS = Array.from({ length: 99 }, (_, i) =>
  (i + 1).toString().padStart(2, "0")
);

type AgencyOption = { id: string; name: string; code?: string | null };
type AgencyBookOption = { id: string; bookNumber: string };
type StaffOption = { id: string; name: string; code?: string | null };
type BankOption = { id: string; name: string };
type CreditCustomerOption = { id: string; name: string; code: string | null };

const PAYMENT_OPTIONS: { value: string; label: string; needsExtras: boolean }[] = [
  { value: "CASH", label: "Cash", needsExtras: false },
  { value: "ON_CALL", label: "OnCall", needsExtras: false },
  { value: "AGENT", label: "Agent", needsExtras: true },
  { value: "STAFF", label: "Staff", needsExtras: true },
  { value: "CARD", label: "Card", needsExtras: true },
  { value: "SLIP", label: "Slip", needsExtras: true },
  { value: "CREDIT", label: "Credit Customer", needsExtras: true },
  { value: "E_WALLET", label: "E-wallet", needsExtras: false },
];

const STEP_TYPES = [
  { value: "booking", label: "Booking" },
  { value: "refund", label: "Refund" },
  { value: "cancel", label: "Cancel" },
  { value: "settle", label: "Settle" },
  { value: "change", label: "Change" },
] as const;

export type E2EScenarioStepConfig = {
  paymentMethods?: string[];
  bookingExtras?: Record<string, string>;
  /** Base patient name; Playwright uses `{patientName} ( {payment label} )`. */
  patientName?: string;
  doctorSearch?: string;
  doctorSelect?: string;
  /** Persisted as a positive integer; form may use string while editing. */
  sessionIndex?: number | string;
  sessionButtonText?: string;
  appointmentNo?: string;
};

export type E2EScenarioStep = {
  id?: string;
  order: number;
  type: string;
  config: E2EScenarioStepConfig;
};

export type E2EScenario = {
  id: string;
  name: string;
  paymentMethods?: string[];
  bookingExtras?: Record<string, string>;
  steps?: E2EScenarioStep[];
  createdAt?: string;
  updatedAt?: string;
};

const SCENARIOS_API = "/api/admin/run-e2e/scenarios";
const RUN_STREAM_API = "/api/admin/run-e2e/stream";
const REFERENCE_AGENCIES_API = "/api/admin/run-e2e/reference/agencies";
const REFERENCE_STAFF_API = "/api/admin/run-e2e/reference/staff";
const REFERENCE_BANKS_API = "/api/admin/run-e2e/reference/banks";
const REFERENCE_CREDIT_CUSTOMERS_API = "/api/admin/run-e2e/reference/credit-customers";

const DEFAULT_STEP: E2EScenarioStep = {
  order: 0,
  type: "booking",
  config: {
    paymentMethods: ["CASH"],
    bookingExtras: {},
    patientName: "",
    doctorSearch: "",
    doctorSelect: "",
    sessionIndex: "",
    sessionButtonText: "",
  },
};

/** Sentinel id: no doctor in scenario config → runner uses TEST DOCTOR + MR. TEST DOCTOR in code. */
const E2E_DEFAULT_DOCTOR_ID = "__e2e_default__";
/** Must match Playwright default consultant search; hide same-labelled row from API to avoid duplicates in the combobox. */
const E2E_DEFAULT_DOCTOR_LABEL = "TEST DOCTOR";

function resolveE2EStepDoctorComboboxValue(
  step: E2EScenarioStep,
  doctorOptions: Array<{ id: string; name: string }>
): string {
  const a = step.config.doctorSearch?.trim() ?? "";
  const b = step.config.doctorSelect?.trim() ?? "";
  if (!a && !b) return E2E_DEFAULT_DOCTOR_ID;
  // Prefer sentinel: real consultant list also contains this formatted name.
  if (a === b && a === E2E_DEFAULT_DOCTOR_LABEL) return E2E_DEFAULT_DOCTOR_ID;
  if (a === b) {
    const hit = doctorOptions.find((o) => o.name === a);
    if (hit) return hit.id;
  }
  const hitB = b ? doctorOptions.find((o) => o.name === b) : undefined;
  if (hitB) return hitB.id;
  const hitA = a ? doctorOptions.find((o) => o.name === a) : undefined;
  return hitA?.id ?? E2E_DEFAULT_DOCTOR_ID;
}

type RunE2EClientProps = {
  doctorOptions: Array<{ id: string; name: string }>;
};

export function RunE2EClient({ doctorOptions }: RunE2EClientProps) {
  const [scenarios, setScenarios] = useState<E2EScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSteps, setFormSteps] = useState<E2EScenarioStep[]>([{ ...DEFAULT_STEP }]);
  const [scenarioEditorTab, setScenarioEditorTab] = useState<"list" | "flow">("list");
  const [flowSelectedStepIndex, setFlowSelectedStepIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomerOption[]>([]);

  /** Same Combobox pattern as reports (`formatDoctorName` list); first row is built-in E2E doctor. */
  const doctorChoices = useMemo(
    () => [
      { id: E2E_DEFAULT_DOCTOR_ID, name: E2E_DEFAULT_DOCTOR_LABEL },
      ...doctorOptions.filter((o) => o.name !== E2E_DEFAULT_DOCTOR_LABEL),
    ],
    [doctorOptions]
  );

  function setStepDoctorChoice(index: number, doctorId: string) {
    setFormSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (doctorId === E2E_DEFAULT_DOCTOR_ID) {
          return { ...s, config: { ...s.config, doctorSearch: "", doctorSelect: "" } };
        }
        const opt = doctorOptions.find((o) => o.id === doctorId);
        const label = opt?.name ?? "";
        return { ...s, config: { ...s.config, doctorSearch: label, doctorSelect: label } };
      })
    );
  }

  const refreshScenarios = useCallback(async () => {
    setScenariosLoading(true);
    try {
      const res = await fetch(SCENARIOS_API);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(Array.isArray(data) ? "Failed to load" : data?.error ?? "Failed to load");
      setScenarios(Array.isArray(data) ? data : []);
    } catch (e) {
      setScenarios([]);
      setError(e instanceof Error ? e.message : "Failed to load scenarios");
    } finally {
      setScenariosLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshScenarios();
  }, [refreshScenarios]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  useEffect(() => {
    if (flowSelectedStepIndex == null || scenarioEditorTab !== "list") return;
    const t = window.setTimeout(() => {
      document.getElementById(`e2e-scenario-step-${flowSelectedStepIndex}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(t);
  }, [flowSelectedStepIndex, scenarioEditorTab]);

  useEffect(() => {
    let cancelled = false;
    fetch(REFERENCE_AGENCIES_API)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AgencyOption[]) => {
        if (!cancelled && Array.isArray(data)) setAgencies(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(REFERENCE_STAFF_API)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StaffOption[]) => {
        if (!cancelled && Array.isArray(data)) setStaff(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(REFERENCE_BANKS_API)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: BankOption[]) => {
        if (!cancelled && Array.isArray(data)) setBanks(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(REFERENCE_CREDIT_CUSTOMERS_API)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CreditCustomerOption[]) => {
        if (!cancelled && Array.isArray(data)) setCreditCustomers(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const getAgencyBooks = useCallback(async (agencyId: string): Promise<AgencyBookOption[]> => {
    if (!agencyId?.trim()) return [];
    const res = await fetch(`/api/admin/run-e2e/reference/agencies/${encodeURIComponent(agencyId)}/books`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  }, []);

  function startNewScenario() {
    setEditingId(null);
    setFormName("");
    setFormSteps([{ ...DEFAULT_STEP }]);
  }

  function handleScenarioDialogOpenChange(open: boolean) {
    setScenarioDialogOpen(open);
    if (!open) {
      startNewScenario();
      setScenarioEditorTab("list");
      setFlowSelectedStepIndex(null);
    }
  }

  function openCreateScenarioDialog() {
    startNewScenario();
    setScenarioEditorTab("list");
    setFlowSelectedStepIndex(null);
    setScenarioDialogOpen(true);
  }

  function openEditScenarioDialog(s: E2EScenario) {
    startEditScenario(s);
    setScenarioEditorTab("list");
    setFlowSelectedStepIndex(null);
    setScenarioDialogOpen(true);
  }

  function startEditScenario(s: E2EScenario) {
    setEditingId(s.id);
    setFormName(s.name);
    const cfg = (c: Record<string, unknown> | undefined) => {
      const rawIdx = c?.sessionIndex;
      const sessionIndexStr = (() => {
        if (rawIdx == null || rawIdx === "") return "";
        const n = typeof rawIdx === "number" ? rawIdx : parseInt(String(rawIdx).trim(), 10);
        return Number.isFinite(n) && n >= 1 ? String(Math.floor(n)) : "";
      })();
      return {
        paymentMethods: (c?.paymentMethods as string[] | undefined) ?? ["CASH"],
        bookingExtras: (c?.bookingExtras as Record<string, string> | undefined) ?? {},
        patientName: (c?.patientName as string | undefined) ?? "",
        doctorSearch: (c?.doctorSearch as string | undefined) ?? "",
        doctorSelect: (c?.doctorSelect as string | undefined) ?? "",
        sessionIndex: sessionIndexStr,
        sessionButtonText: (c?.sessionButtonText as string | undefined) ?? "",
        appointmentNo: (c?.appointmentNo as string | undefined) ?? "",
      };
    };
    if (s.steps && s.steps.length > 0) {
      setFormSteps(
        s.steps.map((st, i) => ({
          id: (st as { id?: string }).id,
          order: i,
          type: st.type || "booking",
          config: cfg(st.config as Record<string, unknown>),
        }))
      );
    } else {
      const legacy = (s as { paymentMethods?: string[]; bookingExtras?: Record<string, string> });
      setFormSteps([
        {
          order: 0,
          type: "booking",
          config: cfg(legacy.paymentMethods || legacy.bookingExtras ? { paymentMethods: legacy.paymentMethods, bookingExtras: legacy.bookingExtras } : undefined),
        },
      ]);
    }
  }

  function addStep() {
    setFormSteps((prev) => [...prev, { ...DEFAULT_STEP, order: prev.length }]);
  }

  function setStepTarget(
    index: number,
    key: "patientName" | "doctorSearch" | "doctorSelect" | "sessionIndex" | "sessionButtonText" | "appointmentNo",
    value: string
  ) {
    setFormSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  }

  function removeStep(index: number) {
    setFormSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  }

  function updateStep(index: number, upd: Partial<E2EScenarioStep>) {
    setFormSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const next = { ...s, ...upd };
        if (upd.type && upd.type !== s.type) {
          const base = next.config;
          if (upd.type === "booking") {
            next.config = {
              paymentMethods: base.paymentMethods ?? ["CASH"],
              bookingExtras: base.bookingExtras ?? {},
              patientName: base.patientName ?? "",
              doctorSearch: base.doctorSearch ?? "",
              doctorSelect: base.doctorSelect ?? "",
              sessionIndex: base.sessionIndex ?? "",
              sessionButtonText: base.sessionButtonText ?? "",
            };
          } else {
            next.config = {
              ...base,
              doctorSearch: base.doctorSearch ?? "",
              doctorSelect: base.doctorSelect ?? "",
              sessionIndex: base.sessionIndex ?? "",
              sessionButtonText: base.sessionButtonText ?? "",
              appointmentNo: base.appointmentNo ?? "",
            };
          }
        }
        return next;
      })
    );
  }

  function setStepConfig(index: number, key: "paymentMethods" | "bookingExtras", value: string[] | Record<string, string>) {
    setFormSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, config: { ...s.config, [key]: value } } : s
      )
    );
  }

  function setStepExtra(index: number, extraKey: string, value: string) {
    setFormSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const extras = { ...(s.config.bookingExtras ?? {}) };
        if (value.trim()) extras[extraKey] = value.trim();
        else delete extras[extraKey];
        return { ...s, config: { ...s.config, bookingExtras: extras } };
      })
    );
  }

  async function handleSaveScenario() {
    const name = formName.trim();
    if (!name) return;
    setSaveLoading(true);
    setError(null);
    try {
      const steps = formSteps.map((s) => {
        const c = s.config;
        const idxRaw = c.sessionIndex;
        const parsedIdx =
          typeof idxRaw === "number" && Number.isFinite(idxRaw)
            ? Math.floor(idxRaw)
            : typeof idxRaw === "string"
              ? parseInt(idxRaw.trim(), 10)
              : NaN;
        const sessionIndex =
          Number.isFinite(parsedIdx) && parsedIdx >= 1 ? parsedIdx : undefined;
        const config: E2EScenarioStepConfig = s.type === "booking"
          ? {
              paymentMethods: c.paymentMethods?.length ? c.paymentMethods : ["CASH"],
              bookingExtras: c.bookingExtras ?? {},
              ...(c.patientName?.trim() ? { patientName: c.patientName.trim() } : {}),
              ...(c.doctorSearch?.trim() ? { doctorSearch: c.doctorSearch.trim() } : {}),
              ...(c.doctorSelect?.trim() ? { doctorSelect: c.doctorSelect.trim() } : {}),
              ...(sessionIndex != null ? { sessionIndex } : {}),
              ...(c.sessionButtonText?.trim() ? { sessionButtonText: c.sessionButtonText.trim() } : {}),
            }
          : {
              doctorSearch: c.doctorSearch?.trim() || undefined,
              doctorSelect: c.doctorSelect?.trim() || undefined,
              ...(sessionIndex != null ? { sessionIndex } : {}),
              sessionButtonText: c.sessionButtonText?.trim() || undefined,
              appointmentNo: c.appointmentNo?.trim() || undefined,
            };
        return { type: s.type, config };
      });
      if (editingId) {
        const res = await fetch(`${SCENARIOS_API}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, steps }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to update");
      } else {
        const res = await fetch(SCENARIOS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, steps }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to create");
      }
      await refreshScenarios();
      setScenarioDialogOpen(false);
      startNewScenario();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save scenario");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDeleteScenario(id: string) {
    setError(null);
    try {
      const res = await fetch(`${SCENARIOS_API}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to delete");
      }
      if (editingId === id) {
        setScenarioDialogOpen(false);
        startNewScenario();
      }
      await refreshScenarios();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete scenario");
    }
  }

  async function handleRunScenario(scenario: E2EScenario) {
    setRunning(true);
    setRunningScenarioId(scenario.id);
    setTerminalOutput("");
    setError(null);
    try {
      const res = await fetch(RUN_STREAM_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setError("No response body");
        return;
      }
      let out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        out += decoder.decode(value, { stream: true });
        setTerminalOutput(out);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRunning(false);
      setRunningScenarioId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={scenarioDialogOpen} onOpenChange={handleScenarioDialogOpenChange}>
        <DialogContent
          className={cn(
            // Near-fullscreen: override default centered max-w-lg dialog
            "!fixed !left-3 !top-3 !right-3 !bottom-3 !translate-x-0 !translate-y-0",
            "sm:!left-5 sm:!top-5 sm:!right-5 sm:!bottom-5",
            "flex h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-4 overflow-hidden p-4",
            "sm:h-[calc(100dvh-2.5rem)] sm:w-[calc(100vw-2.5rem)] sm:p-6 sm:rounded-xl"
          )}
        >
          <DialogHeader className="shrink-0 space-y-2 text-left">
            <DialogTitle>{editingId ? "Edit scenario" : "Create scenario"}</DialogTitle>
            <DialogDescription>
              Add steps (e.g. Booking tests). Each step runs one test; steps run sequentially. Use the{" "}
              <span className="font-medium text-foreground">Workflow</span> tab for an n8n-style map of data flow between steps. A scenario
              passes when every step passes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid shrink-0 gap-2 sm:max-w-xl">
              <Label htmlFor="scenario-name">Scenario name</Label>
              <Input
                id="scenario-name"
                placeholder="e.g. Cash then Agent booking"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <Tabs
              value={scenarioEditorTab}
              onValueChange={(v) => setScenarioEditorTab(v as "list" | "flow")}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label className="shrink-0">Steps</Label>
                <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:max-w-xs">
                  <TabsTrigger value="list">Step list</TabsTrigger>
                  <TabsTrigger value="flow" className="gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    Workflow
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="list" className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
                  {formSteps.map((step, index) => (
                <Card
                  key={index}
                  id={`e2e-scenario-step-${index}`}
                  className={cn(
                    "rounded-lg border bg-muted/30 scroll-mt-6",
                    flowSelectedStepIndex === index && "ring-2 ring-primary/45 border-primary/35"
                  )}
                >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium shrink-0">Step {index + 1}:</span>
                        <Select
                          value={step.type}
                          onValueChange={(v) => updateStep(index, { type: v })}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STEP_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStep(index)}
                        disabled={formSteps.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {step.type === "booking" && (
                      <>
                        <div className="flex flex-wrap gap-3">
                          {PAYMENT_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={(step.config.paymentMethods ?? []).includes(opt.value)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...(step.config.paymentMethods ?? []), opt.value]
                                    : (step.config.paymentMethods ?? []).filter((m) => m !== opt.value);
                                  setStepConfig(index, "paymentMethods", next.length ? next : ["CASH"]);
                                }}
                              />
                              <span className="text-xs">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        <StepExtrasFields
                          step={step}
                          index={index}
                          setStepExtra={setStepExtra}
                          agencies={agencies}
                          getAgencyBooks={getAgencyBooks}
                          staff={staff}
                          banks={banks}
                          creditCustomers={creditCustomers}
                        />
                        <div className="space-y-1.5">
                          <Label className="text-xs">Patient name (base)</Label>
                          <Input
                            placeholder="e.g. TEST USER — leave empty for TEST USER Step1, Step2…"
                            value={step.config.patientName ?? ""}
                            onChange={(e) => setStepTarget(index, "patientName", e.target.value)}
                            className="h-9"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Playwright fills <code className="text-[10px]">{"{base} ( {first payment method} )"}</code> (e.g.{" "}
                            <code className="text-[10px]">ACME ( Cash )</code>). Match payment checkboxes above; use extras for Agent / Card / …
                          </p>
                        </div>
                        <div className="space-y-2 border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground">Consultant &amp; session (optional)</p>
                          <p className="text-[11px] text-muted-foreground">
                            Same doctor picker as elsewhere (searchable list). The runner reads consultant from the <strong>first step</strong>. <strong>TEST DOCTOR</strong> is selected first and uses the standard E2E targets; choose another doctor to override.
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Sessions load for that doctor, the <strong>selected date</strong> (today by default), and branch. Use <strong>session index</strong> (1 = first bookable row, not on leave) or a <strong>substring</strong> of the row label (e.g. time). If both are set, index wins.
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2 space-y-1.5">
                              <Combobox
                                label="Doctor"
                                options={doctorChoices}
                                value={resolveE2EStepDoctorComboboxValue(step, doctorOptions)}
                                defaultValue={E2E_DEFAULT_DOCTOR_ID}
                                onChange={(v) => setStepDoctorChoice(index, v ?? E2E_DEFAULT_DOCTOR_ID)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Session index</Label>
                              <Input
                                inputMode="numeric"
                                placeholder="1 = first bookable"
                                value={step.config.sessionIndex != null && step.config.sessionIndex !== "" ? String(step.config.sessionIndex) : ""}
                                onChange={(e) => setStepTarget(index, "sessionIndex", e.target.value.replace(/\D/g, ""))}
                                className="h-9"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs">Session row text (substring)</Label>
                              <Input
                                placeholder="e.g. 1:00 PM or Mon Mar/9/26"
                                value={step.config.sessionButtonText ?? ""}
                                onChange={(e) => setStepTarget(index, "sessionButtonText", e.target.value)}
                                className="h-9"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {(step.type === "refund" || step.type === "cancel" || step.type === "settle" || step.type === "change") && (
                      <div className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="sm:col-span-2 space-y-1.5">
                            <Combobox
                              label="Doctor"
                              options={doctorChoices}
                              value={resolveE2EStepDoctorComboboxValue(step, doctorOptions)}
                              defaultValue={E2E_DEFAULT_DOCTOR_ID}
                              onChange={(v) => setStepDoctorChoice(index, v ?? E2E_DEFAULT_DOCTOR_ID)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Session index</Label>
                            <Input
                              inputMode="numeric"
                              placeholder="1 = first bookable"
                              value={step.config.sessionIndex != null && step.config.sessionIndex !== "" ? String(step.config.sessionIndex) : ""}
                              onChange={(e) => setStepTarget(index, "sessionIndex", e.target.value.replace(/\D/g, ""))}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Appointment no</Label>
                            <Input
                              placeholder="e.g. 29"
                              value={step.config.appointmentNo ?? ""}
                              onChange={(e) => setStepTarget(index, "appointmentNo", e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="text-xs">Session row text (substring)</Label>
                            <Input
                              placeholder="e.g. 1:00 PM or Mon Mar/9/26"
                              value={step.config.sessionButtonText ?? ""}
                              onChange={(e) => setStepTarget(index, "sessionButtonText", e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Use same doctor + session as the previous step. Leave appointment no empty to select the <strong>first booking</strong> in the list (e.g. the one created in step 1).
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addStep} className="mt-3 shrink-0 gap-1.5 self-start">
                  <Plus className="h-3.5 w-3.5" />
                  Add step
                </Button>
              </TabsContent>
              <TabsContent
                value="flow"
                className="mt-3 flex h-full min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
              >
                <E2EScenarioWorkflow
                  steps={formSteps}
                  selectedStepIndex={flowSelectedStepIndex}
                  onSelectStep={(i) => {
                    setFlowSelectedStepIndex(i);
                    setScenarioEditorTab("list");
                  }}
                  className="h-full min-h-0 flex-1"
                />
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border pt-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleScenarioDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveScenario} disabled={!formName.trim() || saveLoading}>
              {saveLoading ? "Saving…" : editingId ? "Update scenario" : "Save scenario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved scenarios */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Scenarios</CardTitle>
            <CardDescription>
              Run a scenario. All steps run sequentially; output streams in the terminal below.
            </CardDescription>
          </div>
          <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={openCreateScenarioDialog} disabled={running}>
            <Plus className="h-3.5 w-3.5" />
            New scenario
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenariosLoading ? (
            <p className="text-sm text-muted-foreground">Loading scenarios…</p>
          ) : scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scenarios yet. Use New scenario to add one.</p>
          ) : (
            <ul className="space-y-2">
              {scenarios.map((s) => {
                const stepCount = s.steps?.length ?? (s.paymentMethods ? 1 : 0);
                const stepLabels = s.steps?.length
                  ? s.steps
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((st) => STEP_TYPES.find((t) => t.value === st.type)?.label ?? st.type)
                  : [];
                const label = stepLabels.length
                  ? stepLabels.join(" → ")
                  : s.paymentMethods
                    ? (Array.isArray(s.paymentMethods) ? s.paymentMethods.join(", ") : "Booking")
                    : "—";
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditScenarioDialog(s)}
                        disabled={running}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteScenario(s.id)}
                        disabled={running}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRunScenario(s)}
                        disabled={running}
                        className="gap-1.5"
                      >
                        {running && runningScenarioId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Run
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Terminal view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terminal</CardTitle>
          <CardDescription>
            Live output when you run a scenario. Steps run one after another; the scenario completes when all steps pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre
            className="rounded bg-black text-green-400 p-4 text-xs font-mono overflow-x-auto overflow-y-auto max-h-[400px] min-h-[120px] whitespace-pre-wrap"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {terminalOutput || (running ? "Waiting for output…" : "Run a scenario to see output here.")}
            <div ref={terminalEndRef} />
          </pre>
        </CardContent>
      </Card>

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

      <p className="text-xs text-muted-foreground">
        Scenarios and steps are saved in the database. Run streams output to the terminal. Each step is one test (e.g. booking with selected payment methods); they run in order.
      </p>
    </div>
  );
}

function StepExtrasFields({
  step,
  index,
  setStepExtra,
  agencies,
  getAgencyBooks,
  staff,
  banks,
  creditCustomers,
}: {
  step: E2EScenarioStep;
  index: number;
  setStepExtra: (index: number, key: string, value: string) => void;
  agencies: AgencyOption[];
  getAgencyBooks: (agencyId: string) => Promise<AgencyBookOption[]>;
  staff: StaffOption[];
  banks: BankOption[];
  creditCustomers: CreditCustomerOption[];
}) {
  const pm = step.config.paymentMethods ?? [];
  const ex = step.config.bookingExtras ?? {};
  const hasAgent = pm.includes("AGENT");
  const hasStaff = pm.includes("STAFF");
  const hasCard = pm.includes("CARD");
  const hasSlip = pm.includes("SLIP");
  const hasCredit = pm.includes("CREDIT");

  const agencyId = agencies.find((a) => a.name === (ex.agencyName ?? ""))?.id ?? "";
  const [agencyBooks, setAgencyBooks] = useState<AgencyBookOption[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  useEffect(() => {
    if (!hasAgent || !agencyId) {
      setAgencyBooks([]);
      return;
    }
    let cancelled = false;
    setBooksLoading(true);
    getAgencyBooks(agencyId)
      .then((books) => {
        if (!cancelled) setAgencyBooks(books);
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasAgent, agencyId, getAgencyBooks]);

  if (!hasAgent && !hasStaff && !hasCard && !hasSlip && !hasCredit) return null;
  return (
    <div className="space-y-2 pt-2 border-t">
      {hasAgent && (
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Agency name</Label>
            <Select
              value={ex.agencyName ?? ""}
              onValueChange={(v) => setStepExtra(index, "agencyName", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select agency" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.name}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Book</Label>
            <Select
              value={ex.agencyBook ?? ""}
              onValueChange={(v) => setStepExtra(index, "agencyBook", v)}
              disabled={!agencyId || booksLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={booksLoading ? "Loading…" : "Select book"} />
              </SelectTrigger>
              <SelectContent>
                {agencyBooks.map((b) => (
                  <SelectItem key={b.id} value={b.bookNumber}>
                    {b.bookNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">REF NO.</Label>
            <Select
              value={ex.agencyRef ? String(ex.agencyRef).padStart(2, "0") : undefined}
              onValueChange={(v) => setStepExtra(index, "agencyRef", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select ref (01–99)" />
              </SelectTrigger>
              <SelectContent>
                {REF_NO_OPTIONS.map((ref) => (
                  <SelectItem key={ref} value={ref}>
                    {ref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {hasStaff && (
        <div>
          <Label className="text-xs">Staff name</Label>
          <Select
            value={ex.staffName ?? ""}
            onValueChange={(v) => setStepExtra(index, "staffName", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select staff" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {hasCard && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Last 4 digits</Label>
            <Input
              placeholder="1234"
              value={ex.cardLast4 ?? ""}
              onChange={(e) => setStepExtra(index, "cardLast4", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Bank name</Label>
            <Select
              value={ex.bankName ?? ""}
              onValueChange={(v) => setStepExtra(index, "bankName", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {hasSlip && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Bank reference</Label>
            <Input
              placeholder="123456"
              value={ex.slipRef ?? ""}
              onChange={(e) => setStepExtra(index, "slipRef", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Bank name</Label>
            <Select
              value={ex.bankName ?? ""}
              onValueChange={(v) => setStepExtra(index, "bankName", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {hasCredit && (
        <div>
          <Label className="text-xs">Credit customer</Label>
          <Select
            value={ex.creditCustomerName ?? ""}
            onValueChange={(v) => setStepExtra(index, "creditCustomerName", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select credit customer" />
            </SelectTrigger>
            <SelectContent>
              {creditCustomers.map((c) => {
                const label = c.code ? `${c.name} (${c.code})` : c.name;
                return (
                  <SelectItem key={c.id} value={label}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
