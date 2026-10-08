"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DECLARATION, SHEET_COUNT, sheetByNo, type Sheet } from "./scenarios";
import { downloadTrainingExcel } from "../training-excel";

const SHEET_KEY = "uat-cashier-sheet-no";
const DONE_KEY = "uat-cashier-sheet-done";

function loadNo(): number {
  if (typeof window === "undefined") return 1;
  const n = Number(localStorage.getItem(SHEET_KEY));
  return n >= 1 && n <= SHEET_COUNT ? n : 1;
}

function loadDone(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DONE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function drawTickBox(doc: jsPDF, cell: { x: number; y: number; width: number; height: number }, checked: boolean) {
  const size = 3.8;
  const x = cell.x + (cell.width - size) / 2;
  const y = cell.y + (cell.height - size) / 2;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.rect(x, y, size, size);
  if (!checked) return;
  doc.setLineWidth(0.45);
  doc.line(x + 0.7, y + 1.9, x + 1.6, y + 2.9);
  doc.line(x + 1.6, y + 2.9, x + 3.1, y + 0.8);
}

function downloadPdf(sheet: Sheet, done: Set<string>) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Ruhunu Hospital", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Training for new channeling", 14, 18);
  doc.setFontSize(10);
  doc.text(`Cashier sheet ${sheet.no} of ${SHEET_COUNT}`, 14, 24);
  doc.setFontSize(9);
  doc.text(sheet.note, 14, 30, { maxWidth: 270 });
  doc.text("Name: ____________________", 14, 42);

  autoTable(doc, {
    startY: 48,
    head: [["", "Doctor", "Time", "Hospital", "Doctor fee", "Bill"]],
    body: sheet.doctors.map((row) => [row.slot, `${row.doctor} (${row.code})`, row.time, row.hospital, row.professional, row.bill]),
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 48;
  let taskNo = 0;

  for (const scenario of sheet.scenarios) {
    if (y > 180) {
      doc.addPage();
      y = 14;
    }
    doc.setFontSize(11);
    doc.text(scenario.title, 14, y + 8);
    doc.setFontSize(8);
    doc.text(scenario.learn, 14, y + 13, { maxWidth: 270 });
    autoTable(doc, {
      startY: y + 16,
      head: [["Tick", "#", "What to do", "Amount", "On the report"]],
      body: scenario.steps.map((step) => [
        done.has(`${sheet.no}:${step.id}`) ? "Yes" : "",
        String(++taskNo),
        step.do,
        step.amount,
        step.report,
      ]),
      styles: { fontSize: 8, cellPadding: 1.8, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 10, halign: "center" },
        3: { cellWidth: 32 },
        4: { cellWidth: 48 },
      },
      didParseCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 0) hook.cell.text = [""];
      },
      didDrawCell: (hook) => {
        if (hook.section === "body" && hook.column.index === 0) {
          drawTickBox(doc, hook.cell, hook.cell.raw === "Yes");
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  }

  if (y > 160) {
    doc.addPage();
    y = 14;
  }
  autoTable(doc, {
    startY: y + 8,
    head: [["Section", "Cash", "Card", "Slip", "Cheque", "Agent", "Credit", "E-wallet"]],
    body: sheet.totals.map((row) => [
      row.section,
      row.cash || "—",
      row.card || "—",
      row.slip || "—",
      row.cheque || "—",
      row.agent || "—",
      row.credit || "—",
      row.ewallet || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.row.index === sheet.totals.length - 1) {
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });

  const totalsEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  let declY = totalsEnd + 10;
  if (declY > 150) {
    doc.addPage();
    declY = 14;
  }
  doc.setFontSize(12);
  doc.text("Declaration", 14, declY);
  doc.setFontSize(9);
  doc.text("I completed this sheet. I know how to do each of the following.", 14, declY + 6);
  autoTable(doc, {
    startY: declY + 10,
    head: [["Tick", "I confirm"]],
    body: DECLARATION.map((line, index) => [done.has(`${sheet.no}:decl:${index}`) ? "Yes" : "", line]),
    styles: { fontSize: 9, cellPadding: 2.2, valign: "middle", minCellHeight: 8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: { 0: { cellWidth: 16, halign: "center" } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 0) hook.cell.text = [""];
    },
    didDrawCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 0) {
        drawTickBox(doc, hook.cell, hook.cell.raw === "Yes");
      }
    },
  });
  const signed = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? declY + 40;
  doc.setFontSize(10);
  doc.text("Name: ____________________    Date: ____________________    Signature: ____________________", 14, signed + 12);

  doc.save(`cashier-sheet-${String(sheet.no).padStart(2, "0")}.pdf`);
}

export default function CashierSummaryUatPage() {
  const [no, setNo] = useState(1);
  const [done, setDone] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setNo(loadNo());
    setDone(loadDone());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SHEET_KEY, String(no));
      localStorage.setItem(DONE_KEY, JSON.stringify(done));
    } catch {
      /* ignore */
    }
  }, [no, done, ready]);

  const sheet = useMemo(() => sheetByNo(no), [no]);
  const doneSet = useMemo(() => new Set(done), [done]);
  const mine = done.filter((id) => id.startsWith(`${no}:`) && !id.includes(":decl:"));
  const stepCount = sheet.scenarios.reduce((sum, scenario) => sum + scenario.steps.length, 0);

  const toggle = useCallback((id: string) => {
    setDone((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          nav { display: none !important; }
          .no-print { display: none !important; }
          body { background: white; }
          table { font-size: 11px; }
        }
      `}</style>

      <header className="mb-6">
        <p className="no-print text-sm text-muted-foreground">
          <Link href="/uat" className="underline-offset-2 hover:underline">
            UAT
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Ruhunu Hospital</h1>
            <p className="mt-1 text-sm">Training for new channeling</p>
            <p className="mt-1 text-sm text-muted-foreground">Cashier sheet {sheet.no} of {SHEET_COUNT}</p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {mine.length} / {stepCount} ticked
          </p>
        </div>
        <p className="mt-2 text-sm">Name: ____________________</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{sheet.note}</p>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Print this sheet
          </button>
          <button
            type="button"
            onClick={() => downloadPdf(sheet, doneSet)}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() =>
              void downloadTrainingExcel({
                fileName: `cashier-sheet-${String(sheet.no).padStart(2, "0")}.xlsx`,
                sheetLabel: `Cashier sheet ${sheet.no} of ${SHEET_COUNT}`,
                note: sheet.note,
                doctors: sheet.doctors,
                scenarios: sheet.scenarios,
                done: doneSet,
                sheetNo: no,
                declaration: DECLARATION,
                totals: sheet.totals,
                totalsNote: `Grand total rupees are ${sheet.grandRupees}. That is every column except Agent (${sheet.agentLeftOut}). ${sheet.whtOffNote}`,
              })
            }
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => setDone((prev) => prev.filter((id) => !id.startsWith(`${no}:`)))}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:underline"
          >
            Clear ticks
          </button>
        </div>
        <p className="no-print mt-5 text-sm font-medium">Pick your number. Each person uses a different sheet.</p>
        <div className="no-print mt-2 grid grid-cols-10 gap-1">
          {Array.from({ length: SHEET_COUNT }, (_, index) => {
            const value = index + 1;
            const selected = value === no;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setNo(value)}
                className={`rounded-md border py-2 text-sm tabular-nums ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </header>

      <table className="mb-8 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="w-10 py-2 pr-2 font-medium" />
            <th className="py-2 pr-3 font-medium">Doctor</th>
            <th className="py-2 pr-3 font-medium">Time</th>
            <th className="py-2 pr-3 font-medium">Hospital</th>
            <th className="py-2 pr-3 font-medium">Doctor fee</th>
            <th className="py-2 font-medium">Bill</th>
          </tr>
        </thead>
        <tbody>
          {sheet.doctors.map((row) => (
            <tr key={row.slot} className="border-b border-border">
              <td className="py-2 pr-2 font-medium">{row.slot}</td>
              <td className="py-2 pr-3">{row.doctor} ({row.code})</td>
              <td className="py-2 pr-3">{row.time}</td>
              <td className="py-2 pr-3 tabular-nums">{row.hospital}</td>
              <td className="py-2 pr-3 tabular-nums">{row.professional}</td>
              <td className="py-2 tabular-nums">{row.bill}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sheet.scenarios.map((scenario, scenarioIndex) => {
        const start =
          sheet.scenarios.slice(0, scenarioIndex).reduce((sum, item) => sum + item.steps.length, 0) + 1;
        return (
        <section key={scenario.id} className="mb-8 break-inside-avoid">
          <h2 className="text-base font-semibold">{scenario.title}</h2>
          <p className="mb-3 mt-1 text-sm leading-6 text-muted-foreground">{scenario.learn}</p>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-12 py-2 pr-2 font-medium">Tick</th>
                <th className="w-10 py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">What to do</th>
                <th className="w-40 py-2 pr-4 font-medium">Amount</th>
                <th className="w-56 py-2 font-medium">On the report</th>
              </tr>
            </thead>
            <tbody>
              {scenario.steps.map((step, index) => {
                const key = `${no}:${step.id}`;
                const checked = doneSet.has(key);
                return (
                  <tr key={step.id} className="border-b border-border align-top">
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(key)}
                        aria-label={`Tick task ${start + index}`}
                        className="mt-0.5 h-4 w-4"
                      />
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-muted-foreground">{start + index}</td>
                    <td className="py-3 pr-4 leading-6">{step.do}</td>
                    <td className="py-3 pr-4 tabular-nums">{step.amount}</td>
                    <td className="py-3 text-muted-foreground">{step.report}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        );
      })}

      <h2 className="mb-3 text-base font-semibold">After every scenario, the report should show</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 text-left font-medium">Section</th>
              <th className="px-2 py-2 font-medium">Cash</th>
              <th className="px-2 py-2 font-medium">Card</th>
              <th className="px-2 py-2 font-medium">Slip</th>
              <th className="px-2 py-2 font-medium">Cheque</th>
              <th className="px-2 py-2 font-medium">Agent</th>
              <th className="px-2 py-2 font-medium">Credit</th>
              <th className="px-2 py-2 font-medium">E-wallet</th>
            </tr>
          </thead>
          <tbody>
            {sheet.totals.map((row) => {
              const grand = row.section === "Grand total";
              return (
                <tr key={row.section} className={`border-b border-border/70 ${grand ? "font-semibold" : ""}`}>
                  <td className="py-2 pr-3 text-left">{row.section}</td>
                  <td className="px-2">{row.cash || "—"}</td>
                  <td className="px-2">{row.card || "—"}</td>
                  <td className="px-2">{row.slip || "—"}</td>
                  <td className="px-2">{row.cheque || "—"}</td>
                  <td className="px-2">{row.agent || "—"}</td>
                  <td className="px-2">{row.credit || "—"}</td>
                  <td className="px-2">{row.ewallet || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Grand total rupees are {sheet.grandRupees}. That is every column except Agent ({sheet.agentLeftOut}). {sheet.whtOffNote}
      </p>

      <section className="mt-10 break-inside-avoid border border-border p-4">
        <h2 className="text-base font-semibold">Declaration</h2>
        <p className="mb-3 mt-1 text-sm leading-6 text-muted-foreground">
          I completed this sheet. I know how to do each of the following.
        </p>
        <ul className="space-y-2">
          {DECLARATION.map((line, index) => {
            const key = `${no}:decl:${index}`;
            return (
              <li key={line} className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={doneSet.has(key)}
                  onChange={() => toggle(key)}
                  aria-label={line}
                  className="mt-1 h-4 w-4"
                />
                <span>{line}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 grid gap-6 text-sm sm:grid-cols-3">
          <p>Name: ____________________</p>
          <p>Date: ____________________</p>
          <p>Signature: ____________________</p>
        </div>
      </section>
    </div>
  );
}
