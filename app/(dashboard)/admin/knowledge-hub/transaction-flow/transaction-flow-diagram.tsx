"use client";

import Script from "next/script";
import { useRef, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OVERVIEW_CODE = `
flowchart TB
    subgraph ChannelBooking["Channel booking"]
        direction TB
        Save[Save booking] --> SaveCheck{Agent or Credit?}
        SaveCheck -->|Yes| SavePre[Pre-check min max]
        SavePre --> SaveCreate[Create booking and receipt]
        SaveCheck -->|No| SaveCreate
        SaveCreate --> SaveJ[Journal]
        Settle[Settle] --> SettleReceipt[Create receipt]
        SettleReceipt --> SettleJ[Journal]
        Refund[Refund] --> RefundTill{Till payout?}
        RefundTill -->|Yes| RefundCheck[Method till balance]
        RefundCheck --> RefundReceipt[Create receipt]
        RefundTill -->|No| RefundReceipt
        RefundReceipt --> RefundJ[Journal]
    end
    subgraph Doctor["Doctor payment"]
        direction TB
        Pay[Process payment] --> PayTill{Till method?}
        PayTill -->|Yes| PayCheck[Method till balance]
        PayCheck --> PayReceipt[Create receipt]
        PayTill -->|No| PayReceipt
        PayReceipt --> PayJ[Journal]
        Cancel[Cancel payment] --> CancelReceipt[Reversal receipt]
        CancelReceipt --> CancelJ[Journal]
    end
    subgraph Ledger["Ledger"]
        direction TB
        LedgerCreate[Create receipt] --> LedgerAgency{Agency withdraw?}
        LedgerAgency -->|Yes| LedgerAgent[Agent balance]
        LedgerAgent --> LedgerTill{Pays out from till?}
        LedgerAgency -->|No| LedgerTill
        LedgerTill -->|Yes| LedgerCheck[Method till balance]
        LedgerCheck --> LedgerReceipt[Create receipt]
        LedgerTill -->|No| LedgerReceipt
        LedgerReceipt --> LedgerJ[Journal]
        LedgerCancel[Cancel receipt] --> LedgerRev[Reversal]
        LedgerRev --> LedgerJ2[Journal]
    end
    subgraph Other["Other"]
        direction TB
        FloatApprove[Float approve] --> FloatSource[Source account balance]
        FloatReceive[Float receive] --> FloatJ[Journal]
        Manual[Manual journal] --> ManualJ[Journal]
    end
    SaveJ --> Core[Min max check then write]
    SettleJ --> Core
    RefundJ --> Core
    PayJ --> Core
    CancelJ --> Core
    LedgerJ --> Core
    LedgerJ2 --> Core
    FloatJ --> Core
    ManualJ --> Core
`.trim();

const CHANNEL_BOOKING_CODE = `
flowchart TB
    subgraph Save["Save booking - new booking"]
        direction TB
        S1[Validate input] --> S2{Agent or Credit?}
        S2 -->|Yes| S3[Resolve receipt journal accounts]
        S3 --> S4[Soft credit limit check]
        S4 --> S5[Pre-check min or max balance]
        S5 --> S6[Create booking]
        S6 --> S7[Create receipt]
        S7 --> S8[Create journal - min max check]
        S2 -->|No| S6
    end
    subgraph Settle["Settle - pay for existing booking"]
        direction TB
        T1[Validate and resolve accounts] --> T2[Create receipt]
        T2 --> T3[Create journal - min max check]
    end
    N1[No till check - money in]
`.trim();

const REFUND_CODE = `
flowchart TB
    subgraph Full["Full cancel"]
        direction TB
        F1[Load booking] --> F2[Block if doctor already paid]
        F2 --> F3[Resolve accounts]
        F3 --> F4{Paying out from till?}
        F4 -->|Yes| F5[Method till balance check]
        F5 --> F6[Create receipt and update booking]
        F4 -->|No| F6
        F6 --> F7[Create journal - min max check]
    end
    subgraph Partial["Partial refund"]
        direction TB
        P1[Load booking and validate] --> P2[Resolve accounts]
        P2 --> P3{Paying out from till?}
        P3 -->|Yes| P4[Method till balance check]
        P4 --> P5[Create receipt and update booking]
        P3 -->|No| P5
        P5 --> P6[Create journal - min max check]
    end
    N1[Till check by method - cash card slip etc]
`.trim();

const DOCTOR_PAYMENT_CODE = `
flowchart TB
    subgraph Process["Process doctor payment"]
        direction TB
        D1[Validate bookings] --> D2[Resolve doctor payment accounts]
        D2 --> D3{Paying from till?}
        D3 -->|Yes| D4[Method till balance check]
        D4 --> D5[Create receipt method 4]
        D5 --> D6[Update bookings as doctor paid]
        D6 --> D7[Create journal - min max check]
        D3 -->|No| D5
    end
    subgraph Cancel["Cancel doctor payment"]
        direction TB
        C1[Load original receipt] --> C2[Create reversal receipt method 5]
        C2 --> C3[Create journal - min max check]
    end
    N1[Reversal - no till check]
`.trim();

const LEDGER_CODE = `
flowchart TB
    subgraph Create["Create ledger receipt"]
        direction TB
        L1[Validate input] --> L2{Agency withdraw?}
        L2 -->|Yes| L3[Agent balance check]
        L3 --> L4[Resolve accounts]
        L2 -->|No| L4
        L4 --> L5{Pays out from till?}
        L5 -->|Yes| L6[Method till balance check]
        L6 --> L7[Create receipt]
        L5 -->|No| L7
        L7 --> L8[Create journal - min max check]
    end
    subgraph Cancel["Cancel ledger receipt"]
        direction TB
        LC1[Load original receipt] --> LC2[Create reversal receipt]
        LC2 --> LC3[Create journal - min max check]
    end
`.trim();

const OTHER_CODE = `
flowchart TB
    subgraph Float["Float request"]
        direction TB
        FA1[Approve - validate request] --> FA2[Source account balance check]
        FA2 --> FA3[Update request with receive code]
        FA3 --> FR1[Receive - cashier enters code]
        FR1 --> FR2[Create journal - min max check]
    end
    subgraph Manual["Manual journal entry"]
        direction TB
        M1[Validate input] --> M2[Create journal - min max check]
    end
    N1[Journal on receive not approve]
`.trim();

const DIAGRAMS = [
  { id: "overview", label: "Overview", code: OVERVIEW_CODE },
  { id: "channel-booking", label: "Channel booking", code: CHANNEL_BOOKING_CODE },
  { id: "refund", label: "Refund", code: REFUND_CODE },
  { id: "doctor-payment", label: "Doctor payment", code: DOCTOR_PAYMENT_CODE },
  { id: "ledger", label: "Ledger", code: LEDGER_CODE },
  { id: "other", label: "Other", code: OTHER_CODE },
] as const;

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: { startOnLoad?: boolean; theme?: string }) => void;
      run: (config?: { nodes?: Node[]; querySelector?: string; suppressErrors?: boolean }) => Promise<void>;
    };
  }
}

export function TransactionFlowDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [error, setError] = useState<string | null>(null);

  // Run Mermaid on the active tab only (one diagram in DOM at a time to avoid duplicate IDs).
  // Defer run until after layout/paint so getBoundingClientRect sees a measured node.
  useEffect(() => {
    if (!ready || !containerRef.current || typeof window === "undefined") return;
    const mermaid = window.mermaid;
    if (!mermaid) return;
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const container = containerRef.current;
      if (!container) return;
      const node = container.querySelector(".mermaid");
      if (!node || !node.isConnected) return;
      setError(null);
      mermaid.run({ nodes: [node], suppressErrors: false }).catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : String(err);
        setError(msg);
      });
    };
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id1);
    };
  }, [ready, activeTab]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {DIAGRAMS.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>
                {d.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div ref={containerRef} id="transaction-flow-diagrams" className="mt-4">
            {DIAGRAMS.map((d) => (
              <TabsContent key={d.id} value={d.id}>
                <div className="rounded-lg border bg-card p-4 overflow-auto">
                  <div className="mermaid">{d.code}</div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
        {error && (
          <p className="text-destructive text-sm">Diagram failed to load: {error}</p>
        )}
      </div>
    </>
  );
}

