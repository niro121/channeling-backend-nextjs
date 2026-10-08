"use client";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const NAVY = "FF1E293B";
const thin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCBD5E1" } };
const boxBorder: Partial<ExcelJS.Borders> = {
  top: { style: "medium", color: { argb: "FF0F172A" } },
  left: { style: "medium", color: { argb: "FF0F172A" } },
  bottom: { style: "medium", color: { argb: "FF0F172A" } },
  right: { style: "medium", color: { argb: "FF0F172A" } },
};

export type TrainingExcelStep = { id: string; do: string; amount: string; report: string };

export type TrainingExcelInput = {
  fileName: string;
  sheetLabel: string;
  note: string;
  doctors: { slot: string; doctor: string; code: string; time: string; hospital: string; professional: string; bill: string }[];
  scenarios: { title: string; learn: string; steps: TrainingExcelStep[] }[];
  done: Set<string>;
  sheetNo: number;
  declaration: string[];
  totals?: { section: string; cash: string; card: string; slip: string; cheque: string; agent: string; credit: string; ewallet: string }[];
  totalsNote?: string;
};

export async function downloadTrainingExcel(input: TrainingExcelInput) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Training", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  writeSheet(sheet, input);
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), input.fileName);
}

function tickCell(cell: ExcelJS.Cell, checked: boolean) {
  cell.value = checked ? "✓" : "";
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = boxBorder;
  cell.font = { name: "Arial", size: 14, bold: true };
}

function writeSheet(sheet: ExcelJS.Worksheet, input: TrainingExcelInput) {
  sheet.columns = [
    { width: 10 },
    { width: 8 },
    { width: 62 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
  ];

  const span = 8;

  const title = (text: string, size: number, bold = false) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, span);
    row.getCell(1).font = { name: "Arial", size, bold };
    row.height = size + 6;
  };

  title("Ruhunu Hospital", 16, true);
  title("Training for new channeling", 12);
  title(input.sheetLabel, 11, true);

  const note = sheet.addRow([input.note]);
  sheet.mergeCells(note.number, 1, note.number, span);
  note.getCell(1).font = { name: "Arial", size: 10 };
  note.getCell(1).alignment = { wrapText: true, vertical: "middle" };
  note.height = 30;

  const nameLine = sheet.addRow(["Name: ____________________"]);
  sheet.mergeCells(nameLine.number, 1, nameLine.number, span);
  nameLine.getCell(1).font = { name: "Arial", size: 11 };
  sheet.addRow([]);

  const docHead = sheet.addRow(["", "Doctor", "Time", "Hospital", "Doctor fee", "Bill"]);
  styleHead(docHead);
  for (const doctor of input.doctors) {
    const row = sheet.addRow([
      doctor.slot,
      `${doctor.doctor} (${doctor.code})`,
      doctor.time,
      doctor.hospital,
      doctor.professional,
      doctor.bill,
    ]);
    styleBody(row);
  }
  sheet.addRow([]);

  let taskNo = 0;
  for (const scenario of input.scenarios) {
    const section = sheet.addRow([scenario.title]);
    sheet.mergeCells(section.number, 1, section.number, span);
    section.getCell(1).font = { name: "Arial", size: 12, bold: true };
    const learn = sheet.addRow([scenario.learn]);
    sheet.mergeCells(learn.number, 1, learn.number, span);
    learn.getCell(1).font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
    learn.getCell(1).alignment = { wrapText: true };
    learn.height = 28;

    const head = sheet.addRow(["Tick", "#", "What to do", "Amount", "On the report"]);
    styleHead(head);
    sheet.mergeCells(head.number, 5, head.number, span);

    for (const step of scenario.steps) {
      taskNo += 1;
      const checked = input.done.has(`${input.sheetNo}:${step.id}`);
      const row = sheet.addRow(["", taskNo, step.do, step.amount, step.report]);
      sheet.mergeCells(row.number, 5, row.number, span);
      styleBody(row);
      row.getCell(3).alignment = { wrapText: true, vertical: "middle" };
      row.height = 32;
      tickCell(row.getCell(1), checked);
    }
    sheet.addRow([]);
  }

  if (input.totals && input.totals.length > 0) {
    const label = sheet.addRow(["After every scenario, the report should show"]);
    sheet.mergeCells(label.number, 1, label.number, span);
    label.getCell(1).font = { name: "Arial", size: 12, bold: true };
    const head = sheet.addRow(["Section", "Cash", "Card", "Slip", "Cheque", "Agent", "Credit", "E-wallet"]);
    styleHead(head);
    for (const total of input.totals) {
      const row = sheet.addRow([
        total.section,
        total.cash || "—",
        total.card || "—",
        total.slip || "—",
        total.cheque || "—",
        total.agent || "—",
        total.credit || "—",
        total.ewallet || "—",
      ]);
      styleBody(row);
      if (total.section === "Grand total") row.font = { name: "Arial", size: 10, bold: true };
    }
    if (input.totalsNote) {
      const noteRow = sheet.addRow([input.totalsNote]);
      sheet.mergeCells(noteRow.number, 1, noteRow.number, span);
      noteRow.getCell(1).font = { name: "Arial", size: 9, italic: true };
      noteRow.getCell(1).alignment = { wrapText: true };
      noteRow.height = 32;
    }
    sheet.addRow([]);
  }

  const declTitle = sheet.addRow(["Declaration"]);
  sheet.mergeCells(declTitle.number, 1, declTitle.number, span);
  declTitle.getCell(1).font = { name: "Arial", size: 14, bold: true };
  const declIntro = sheet.addRow(["I completed this sheet. I know how to do each of the following."]);
  sheet.mergeCells(declIntro.number, 1, declIntro.number, span);
  declIntro.getCell(1).font = { name: "Arial", size: 10 };
  const declHead = sheet.addRow(["Tick", "I confirm"]);
  styleHead(declHead);
  sheet.mergeCells(declHead.number, 2, declHead.number, span);

  input.declaration.forEach((line, index) => {
    const checked = input.done.has(`${input.sheetNo}:decl:${index}`);
    const row = sheet.addRow(["", line]);
    sheet.mergeCells(row.number, 2, row.number, span);
    styleBody(row);
    row.height = 22;
    tickCell(row.getCell(1), checked);
  });

  sheet.addRow([]);
  const sign = sheet.addRow(["Name: ____________________    Date: ____________________    Signature: ____________________"]);
  sheet.mergeCells(sign.number, 1, sign.number, span);
  sign.getCell(1).font = { name: "Arial", size: 11 };
  sign.height = 22;
}

function styleHead(row: ExcelJS.Row) {
  row.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  row.height = 18;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle" };
    cell.border = { top: thin, left: thin, bottom: thin, right: thin };
  });
}

function styleBody(row: ExcelJS.Row) {
  row.font = { name: "Arial", size: 10 };
  row.eachCell((cell) => {
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { top: thin, left: thin, bottom: thin, right: thin };
  });
}
