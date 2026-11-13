import { format, parseISO } from 'date-fns';
import type { RosterStaffRow } from '@/types/roster';

export type ShiftRosterExportMode = 'filled' | 'blank';

export type ShiftRosterExportRow = Record<string, string>;

const STATUS_LABELS: Record<RosterStaffRow['status'], string> = {
  published: 'Published',
  draft: 'Draft',
  amended: 'Amended',
  none: '—'
};

function dayColumnKey(dayIso: string): string {
  return `day_${dayIso}`;
}

function dayColumnLabel(dayIso: string): string {
  return format(parseISO(dayIso), 'EEE dd MMM');
}

function cellValue(
  row: RosterStaffRow,
  dayIso: string,
  mode: ShiftRosterExportMode
): string {
  if (mode === 'blank') return '';
  const shifts = row.shifts[dayIso] ?? [];
  if (!shifts.length) return '';
  return shifts
    .map((shift) => {
      const code = shift.code || shift.label || '?';
      return shift.isLeave ? `${code} (L)` : code;
    })
    .join(', ');
}

/** Flatten staff × day grid into ExportWrapper-compatible rows. */
export function buildShiftRosterExport(input: {
  rows: RosterStaffRow[];
  dayIsos: string[];
  mode?: ShiftRosterExportMode;
  includeStaffMeta?: boolean;
}): {
  columns: string[];
  keys: string[];
  data: ShiftRosterExportRow[];
} {
  const mode = input.mode ?? 'filled';
  const includeStaffMeta = input.includeStaffMeta !== false;
  const dayKeys = input.dayIsos.map(dayColumnKey);

  const columns = [
    'Staff ID',
    'Staff Name',
    ...(includeStaffMeta ? ['Department', 'Unit', 'Designation'] : []),
    ...input.dayIsos.map(dayColumnLabel),
    'Total Hours',
    'OT Hours',
    'Status'
  ];

  const keys = [
    'staffCode',
    'staffName',
    ...(includeStaffMeta ? ['department', 'unit', 'designation'] : []),
    ...dayKeys,
    'totalHours',
    'otHours',
    'status'
  ];

  const data = input.rows.map((row) => {
    const record: ShiftRosterExportRow = {
      staffCode: row.staffCode,
      staffName: row.staffName,
      totalHours: mode === 'blank' ? '' : row.totalHours.toFixed(1),
      otHours: mode === 'blank' ? '' : row.otHours.toFixed(1),
      status: mode === 'blank' ? '' : STATUS_LABELS[row.status]
    };
    if (includeStaffMeta) {
      record.department = row.department;
      record.unit = row.unit;
      record.designation = row.designation;
    }
    for (const dayIso of input.dayIsos) {
      record[dayColumnKey(dayIso)] = cellValue(row, dayIso, mode);
    }
    return record;
  });

  return { columns, keys, data };
}
