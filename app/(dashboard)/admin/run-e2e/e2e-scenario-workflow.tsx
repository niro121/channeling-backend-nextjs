"use client";

import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  Handle,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

/** Shape needed for the diagram (matches `E2EScenarioStep` from the editor). */
export type E2EWorkflowStep = {
  type: string;
  config: {
    patientName?: string;
    paymentMethods?: string[];
    bookingExtras?: Record<string, string>;
    appointmentNo?: string;
    doctorSearch?: string;
    doctorSelect?: string;
    sessionIndex?: number | string;
    sessionButtonText?: string;
  };
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  ON_CALL: "OnCall",
  AGENT: "Agent",
  STAFF: "Staff",
  CARD: "Card",
  SLIP: "Slip",
  CREDIT: "Credit",
  E_WALLET: "E-wallet",
};

function paymentSummary(methods: string[] | undefined): string {
  if (!methods?.length) return "Cash";
  return methods
    .map((m) => PAYMENT_LABELS[m] ?? m)
    .slice(0, 2)
    .join(", ");
}

function stepSummaryLines(step: E2EWorkflowStep, index: number, allSteps: E2EWorkflowStep[]): string[] {
  const c = step.config;
  const lines: string[] = [];
  const prev = index > 0 ? allSteps[index - 1] : null;
  const actionTypes = ["cancel", "refund", "settle", "change"];

  if (step.type === "booking") {
    const base = c.patientName?.trim() || `TEST USER Step${index + 1}`;
    const firstCode = c.paymentMethods?.[0] ?? "CASH";
    lines.push(`Patient base: ${base}`);
    lines.push(`Bracket: ( ${PAYMENT_LABELS[firstCode] ?? firstCode} )`);
    if (prev && actionTypes.includes(prev.type)) {
      lines.push("Not auto-linked: no selectBooking before create");
    }
  } else if (actionTypes.includes(step.type)) {
    if (prev?.type === "booking") {
      lines.push("Row: auto (prior step was booking)");
    } else if (c.appointmentNo?.trim()) {
      lines.push(`Row: manual — appt #${c.appointmentNo.trim()}`);
    } else {
      lines.push("Row: manual — first table row");
    }
    const dr = c.doctorSelect?.trim() || c.doctorSearch?.trim();
    if (dr) lines.push("Doctor fields: not used by runner*");
  } else {
    lines.push(`Type: ${step.type}`);
  }
  return lines;
}

function stepTitle(step: E2EWorkflowStep): string {
  const t = step.type;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const ACTION_TYPES = ["cancel", "refund", "settle", "change"] as const;

/**
 * `autoLinked` is true only when the runner skips `selectBooking` because the previous step was `booking`
 * and the UI still has that new row selected (`e2e/channel-booking-scenario.spec.ts`).
 */
function edgeCaption(
  from: "start" | number,
  to: number,
  steps: E2EWorkflowStep[]
): { short: string; detail: string; autoLinked: boolean } {
  if (from === "start") {
    return {
      short: "Not auto-linked",
      detail:
        "No prior step: consultant & session are taken from Step 1 config only. Later steps’ doctor/session fields are not applied by the runner today.",
      autoLinked: false,
    };
  }
  const prev = steps[from];
  const next = steps[to];
  const prevBooking = prev.type === "booking";
  const nextBooking = next.type === "booking";
  const nextAction = (ACTION_TYPES as readonly string[]).includes(next.type);

  if (prevBooking && nextAction) {
    return {
      short: "Auto-linked",
      detail:
        "Runner skips selectBooking: the row created in the previous booking step stays selected, so this action runs on that booking.",
      autoLinked: true,
    };
  }
  if (prevBooking && nextBooking) {
    return {
      short: "Not auto-linked",
      detail:
        "Same browser session, but the runner does not treat this as “carry row from previous booking”. A new booking is created; table selection may not match the prior row.",
      autoLinked: false,
    };
  }
  if (!prevBooking && nextAction) {
    const appt = next.config.appointmentNo?.trim();
    return {
      short: appt ? "Not auto-linked · appt #" : "Not auto-linked · 1st row",
      detail: appt
        ? "Runner always calls selectBooking for this step and clicks the row whose appointment cell matches this number."
        : "Runner always calls selectBooking and clicks the first bookings table row (not the previous step’s implicit selection).",
      autoLinked: false,
    };
  }
  if (!prevBooking && nextBooking) {
    return {
      short: "Not auto-linked",
      detail:
        "Booking step does not inherit row selection from the prior step in code; the UI may still have some row focused from earlier actions.",
      autoLinked: false,
    };
  }
  if (nextAction) {
    return {
      short: "Not auto-linked",
      detail: "Sequential step; row selection follows the rules above for action steps.",
      autoLinked: false,
    };
  }
  return {
    short: "Order",
    detail: "Runs after the previous step in the same browser session.",
    autoLinked: false,
  };
}

function edgeStyle(autoLinked: boolean): { stroke: string; strokeWidth?: number; strokeDasharray?: string } {
  if (autoLinked) {
    return { stroke: "hsl(var(--primary))", strokeWidth: 2 };
  }
  return {
    stroke: "hsl(var(--muted-foreground) / 0.65)",
    strokeWidth: 1.5,
    strokeDasharray: "6 5",
  };
}

function buildGraph(
  steps: E2EWorkflowStep[],
  selectedIndex: number | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const y = 48;
  const dx = 240;

  nodes.push({
    id: "start",
    type: "e2eStart",
    position: { x: 0, y: y + 24 },
    data: { label: "Login → Channel booking" },
    sourcePosition: Position.Right,
    draggable: false,
  });

  steps.forEach((step, i) => {
    const id = `step-${i}`;
    nodes.push({
      id,
      type: "e2eStep",
      position: { x: 40 + (i + 1) * dx, y },
      data: {
        index: i,
        step,
        lines: stepSummaryLines(step, i, steps),
        title: stepTitle(step),
        selected: selectedIndex === i,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
    });
  });

  if (steps.length > 0) {
    const c0 = edgeCaption("start", 0, steps);
    edges.push({
      id: "e-start-0",
      source: "start",
      target: "step-0",
      label: c0.short,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: c0.autoLinked ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" },
      style: edgeStyle(c0.autoLinked),
      labelStyle: { fill: "var(--foreground)", fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: "var(--background)" },
      labelBgPadding: [4, 2] as [number, number],
      data: { detail: c0.detail, autoLinked: c0.autoLinked },
    });
  }

  for (let i = 0; i < steps.length - 1; i++) {
    const cap = edgeCaption(i, i + 1, steps);
    edges.push({
      id: `e-${i}-${i + 1}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      label: cap.short,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: cap.autoLinked ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      },
      style: edgeStyle(cap.autoLinked),
      labelStyle: { fill: "var(--foreground)", fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: "var(--background)" },
      labelBgPadding: [4, 2] as [number, number],
      data: { detail: cap.detail, autoLinked: cap.autoLinked },
    });
  }

  return { nodes, edges };
}

function E2eStartNode(_: NodeProps) {
  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center shadow-sm min-w-[140px]">
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Browser</p>
      <p className="text-xs font-medium text-foreground leading-tight">Login → Channel booking</p>
      <p className="text-[10px] text-muted-foreground mt-1">Then Step 1 config</p>
    </div>
  );
}

function E2eStepNode({ data }: NodeProps) {
  const d = data as {
    index: number;
    title: string;
    lines: string[];
    selected: boolean;
  };
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-2.5 py-2 shadow-sm w-[200px] transition-shadow",
        d.selected ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="flex items-baseline justify-between gap-1 border-b border-border/80 pb-1 mb-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground">Step {d.index + 1}</span>
        <span className="text-xs font-bold text-foreground truncate">{d.title}</span>
      </div>
      <ul className="space-y-0.5 text-[10px] text-muted-foreground leading-snug">
        {d.lines.map((line, i) => (
          <li key={i} className="list-disc list-inside marker:text-primary/70">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

const nodeTypes = { e2eStart: E2eStartNode, e2eStep: E2eStepNode };

export type E2EScenarioWorkflowProps = {
  steps: E2EWorkflowStep[];
  selectedStepIndex: number | null;
  onSelectStep: (index: number) => void;
  className?: string;
};

export function E2EScenarioWorkflow({
  steps,
  selectedStepIndex,
  onSelectStep,
  className,
}: E2EScenarioWorkflowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(steps, selectedStepIndex),
    [steps, selectedStepIndex]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("step-")) {
        const i = parseInt(node.id.replace("step-", ""), 10);
        if (!Number.isNaN(i)) onSelectStep(i);
      }
    },
    [onSelectStep]
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col rounded-lg border border-border bg-muted/20",
        className
      )}
    >
      <p className="shrink-0 border-b border-border/80 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span className="inline-block h-0.5 w-6 rounded-full bg-primary" aria-hidden />
          Auto-linked
        </span>{" "}
        = runner keeps the booking row from the previous booking step (no <code className="text-[10px]">selectBooking</code>).{" "}
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <span className="inline-block w-6 border-t border-dashed border-muted-foreground" aria-hidden />
          Dashed
        </span>{" "}
        = not auto-linked: runner uses Step 1 for doctor/session, or calls <code className="text-[10px]">selectBooking</code>, or order-only.
        Click a step to edit it in the list tab. <span className="italic">*</span>Doctor/session on steps 2+ are stored but not used by the runner.
      </p>
      <div className="min-h-0 w-full min-h-[320px] flex-1">
        <ReactFlow
          className="h-full w-full"
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ interactionWidth: 24 }}
        >
          <Background gap={16} size={1} className="!bg-transparent" />
          <Controls showInteractive={false} className="!bg-background !border-border !shadow-sm" />
          <MiniMap
            className="!bg-background !border-border rounded-md"
            maskColor="rgb(0 0 0 / 12%)"
            nodeStrokeWidth={2}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
