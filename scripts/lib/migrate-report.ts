/**
 * Accumulates migration run stats across scripts and writes Excel to /temp.
 * Disable with MIGRATE_REPORT=0
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

export type MigrateTaskStats = {
  detected: number;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  notes?: string;
};

export type MigrateReportIssue = {
  task: string;
  issueType: string;
  identifier: string;
  detail: string;
};

export type MigrateTaskRecord = MigrateTaskStats & {
  script: string;
  task: string;
  completedAt: string;
};

type MigrateReportState = {
  runId: string;
  startedAt: string;
  meta: Record<string, string>;
  tasks: MigrateTaskRecord[];
  issues: Array<MigrateReportIssue & { script: string }>;
};

const TEMP_DIR = path.join(process.cwd(), 'temp');
const STATE_PATH = path.join(TEMP_DIR, 'migrate-report-state.json');
const RUN_ID_PATH = path.join(TEMP_DIR, '.migrate-report-run-id');
const EXCEL_PATH = path.join(TEMP_DIR, 'migrate-report.xlsx');

function reportsEnabled(): boolean {
  return process.env.MIGRATE_REPORT !== '0';
}

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function readState(): MigrateReportState {
  ensureTempDir();
  if (fs.existsSync(STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as MigrateReportState;
    } catch {
      /* fall through */
    }
  }
  let runId = process.env.MIGRATE_REPORT_RUN_ID?.trim();
  if (!runId && fs.existsSync(RUN_ID_PATH)) {
    runId = fs.readFileSync(RUN_ID_PATH, 'utf8').trim();
  }
  if (!runId) {
    runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(RUN_ID_PATH, runId, 'utf8');
  }
  return {
    runId,
    startedAt: new Date().toISOString(),
    meta: {},
    tasks: [],
    issues: [],
  };
}

function writeState(state: MigrateReportState): void {
  ensureTempDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export class MigrateReporter {
  private readonly script: string;
  private readonly state: MigrateReportState;

  constructor(script: string, meta?: Record<string, string>) {
    this.script = script;
    this.state = readState();
    if (meta) {
      for (const [k, v] of Object.entries(meta)) {
        this.state.meta[k] = v;
      }
    }
    this.state.meta[`script:${script}:started`] = new Date().toISOString();
    writeState(this.state);
  }

  task(taskName: string, stats: MigrateTaskStats): void {
    const created = stats.created ?? 0;
    const updated = stats.updated ?? 0;
    const skipped = stats.skipped ?? 0;
    const failed = stats.failed ?? 0;
    const migrated = created + updated;
    const notes = [
      stats.notes,
      stats.detected > 0 && migrated + skipped + failed !== stats.detected
        ? `transferred=${migrated} (create+update)`
        : undefined,
    ]
      .filter(Boolean)
      .join('; ');

    this.state.tasks.push({
      script: this.script,
      task: taskName,
      detected: stats.detected,
      created,
      updated,
      skipped,
      failed,
      notes: notes || undefined,
      completedAt: new Date().toISOString(),
    });
    writeState(this.state);
  }

  issue(task: string, issueType: string, identifier: string, detail: string): void {
    this.state.issues.push({
      script: this.script,
      task,
      issueType,
      identifier,
      detail,
    });
    writeState(this.state);
  }

  async finish(): Promise<string | null> {
    if (!reportsEnabled()) return null;
    this.state.meta[`script:${this.script}:finished`] = new Date().toISOString();
    writeState(this.state);
    return writeMigrateReportExcel(this.state);
  }
}

export function createMigrateReporter(script: string, meta?: Record<string, string>): MigrateReporter | null {
  if (!reportsEnabled()) return null;
  return new MigrateReporter(script, meta);
}

export async function finishMigrateReporter(reporter: MigrateReporter | null): Promise<void> {
  if (!reporter) return;
  const filePath = await reporter.finish();
  if (filePath) {
    console.log(`\nMigration report: ${filePath}`);
  }
}

function migratedTotal(row: MigrateTaskRecord): number {
  return (row.created ?? 0) + (row.updated ?? 0);
}

export async function writeMigrateReportExcel(state: MigrateReportState): Promise<string> {
  ensureTempDir();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'channeling-migrate';
  workbook.created = new Date();

  const metaSheet = workbook.addWorksheet('Meta');
  metaSheet.columns = [
    { header: 'Key', key: 'key', width: 36 },
    { header: 'Value', key: 'value', width: 64 },
  ];
  metaSheet.addRow({ key: 'runId', value: state.runId });
  metaSheet.addRow({ key: 'startedAt', value: state.startedAt });
  metaSheet.addRow({ key: 'generatedAt', value: new Date().toISOString() });
  for (const [key, value] of Object.entries(state.meta)) {
    metaSheet.addRow({ key, value });
  }
  metaSheet.getRow(1).font = { bold: true };

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Script', key: 'script', width: 28 },
    { header: 'Task', key: 'task', width: 22 },
    { header: 'Detected (legacy)', key: 'detected', width: 18 },
    { header: 'Created', key: 'created', width: 12 },
    { header: 'Updated', key: 'updated', width: 12 },
    { header: 'Skipped', key: 'skipped', width: 12 },
    { header: 'Failed', key: 'failed', width: 10 },
    { header: 'Migrated (create+update)', key: 'migrated', width: 22 },
    { header: 'Notes', key: 'notes', width: 48 },
    { header: 'Completed at', key: 'completedAt', width: 26 },
  ];
  for (const row of state.tasks) {
    summarySheet.addRow({
      ...row,
      migrated: migratedTotal(row),
    });
  }
  summarySheet.getRow(1).font = { bold: true };

  const issuesSheet = workbook.addWorksheet('Issues');
  issuesSheet.columns = [
    { header: 'Script', key: 'script', width: 28 },
    { header: 'Task', key: 'task', width: 18 },
    { header: 'Issue type', key: 'issueType', width: 22 },
    { header: 'Identifier', key: 'identifier', width: 24 },
    { header: 'Detail', key: 'detail', width: 64 },
  ];
  for (const row of state.issues) {
    issuesSheet.addRow(row);
  }
  issuesSheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(EXCEL_PATH);

  const stampedName = `migrate-report-${state.runId}.xlsx`;
  const stampedPath = path.join(TEMP_DIR, stampedName);
  await workbook.xlsx.writeFile(stampedPath);

  return EXCEL_PATH;
}

/** Reset report state (e.g. new full migration run). */
export function resetMigrateReportState(): void {
  ensureTempDir();
  for (const p of [STATE_PATH, RUN_ID_PATH]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
