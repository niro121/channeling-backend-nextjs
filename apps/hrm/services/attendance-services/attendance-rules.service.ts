import {
  colomboMinutesFromMidnight,
  parseHhMmToMinutes
} from '@/lib/helpers/attendance-timezone.helper';
import type { AttendanceDayFlag, AttendanceDayStatus } from '@/types/attendance';

export type PunchLike = {
  punchedAt: Date;
  direction: string;
};

export type ShiftRuleInput = {
  startTime: string;
  endTime: string;
  graceMinutes: number;
  lateThresholdMinutes: number;
  earlyExitThresholdMinutes: number;
  isOvernight: boolean;
};

export type AttendanceRuleResult = {
  firstInAt: Date | null;
  lastOutAt: Date | null;
  status: AttendanceDayStatus;
  flags: AttendanceDayFlag[];
};

/**
 * Pair punches for a civil day.
 * - explicit in/out preferred
 * - unknown direction: chronological first ≈ in, last ≈ out when count ≥ 2
 */
export function pairPunches(punches: PunchLike[]): {
  firstInAt: Date | null;
  lastOutAt: Date | null;
  flags: AttendanceDayFlag[];
} {
  const sorted = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime()
  );
  if (sorted.length === 0) {
    return { firstInAt: null, lastOutAt: null, flags: [] };
  }

  const ins = sorted.filter((p) => p.direction === 'in');
  const outs = sorted.filter((p) => p.direction === 'out');
  const hasExplicit = ins.length > 0 || outs.length > 0;

  let firstInAt: Date | null = null;
  let lastOutAt: Date | null = null;
  const flags: AttendanceDayFlag[] = [];

  if (hasExplicit) {
    firstInAt = ins[0]?.punchedAt ?? null;
    lastOutAt = outs.length > 0 ? outs[outs.length - 1]!.punchedAt : null;
    if (!firstInAt && lastOutAt) flags.push('missing_in');
    if (firstInAt && !lastOutAt) flags.push('missing_out');
  } else if (sorted.length === 1) {
    firstInAt = sorted[0]!.punchedAt;
    flags.push('missing_out');
  } else {
    firstInAt = sorted[0]!.punchedAt;
    lastOutAt = sorted[sorted.length - 1]!.punchedAt;
  }

  return { firstInAt, lastOutAt, flags };
}

export function classifyAttendanceDay(input: {
  punches: PunchLike[];
  isLeave: boolean;
  hasRoster: boolean;
  shift: ShiftRuleInput | null;
}): AttendanceRuleResult {
  if (input.isLeave) {
    return {
      firstInAt: null,
      lastOutAt: null,
      status: 'on_leave',
      flags: []
    };
  }

  const paired = pairPunches(input.punches);

  if (!input.hasRoster) {
    if (paired.firstInAt || paired.lastOutAt) {
      return {
        ...paired,
        status: paired.flags.includes('missing_out') || paired.flags.includes('missing_in')
          ? 'missing_punch'
          : 'not_rostered',
        flags: [...paired.flags, 'exception'].filter(
          (f, i, arr) => arr.indexOf(f) === i
        ) as AttendanceDayFlag[]
      };
    }
    return {
      firstInAt: null,
      lastOutAt: null,
      status: 'not_rostered',
      flags: []
    };
  }

  if (!paired.firstInAt && !paired.lastOutAt) {
    return {
      firstInAt: null,
      lastOutAt: null,
      status: 'absent',
      flags: []
    };
  }

  if (paired.flags.includes('missing_in') || paired.flags.includes('missing_out')) {
    const flags = [...paired.flags];
    let status: AttendanceDayStatus = 'missing_punch';

    if (paired.firstInAt && input.shift) {
      const late = isLateArrival(paired.firstInAt, input.shift);
      if (late) {
        // Keep missing_punch as primary status when pair incomplete; Late still visible via flags later if needed.
        status = 'missing_punch';
      }
    }

    if (paired.firstInAt && paired.lastOutAt && input.shift) {
      if (isEarlyExit(paired.lastOutAt, input.shift)) {
        flags.push('early_exit');
      }
    }

    return {
      firstInAt: paired.firstInAt,
      lastOutAt: paired.lastOutAt,
      status,
      flags: uniqueFlags(flags)
    };
  }

  if (!paired.firstInAt) {
    return {
      firstInAt: null,
      lastOutAt: paired.lastOutAt,
      status: 'missing_punch',
      flags: uniqueFlags([...paired.flags, 'missing_in'])
    };
  }

  const flags = [...paired.flags];
  let status: AttendanceDayStatus = 'present';

  if (input.shift && isLateArrival(paired.firstInAt, input.shift)) {
    status = 'late';
  }

  if (paired.lastOutAt && input.shift && isEarlyExit(paired.lastOutAt, input.shift)) {
    flags.push('early_exit');
  }

  return {
    firstInAt: paired.firstInAt,
    lastOutAt: paired.lastOutAt,
    status,
    flags: uniqueFlags(flags)
  };
}

function isLateArrival(firstInAt: Date, shift: ShiftRuleInput): boolean {
  const startMins = parseHhMmToMinutes(shift.startTime);
  if (startMins == null) return false;
  const grace = Math.max(0, shift.graceMinutes || 0);
  const arrival = colomboMinutesFromMidnight(firstInAt);

  // Overnight: first-in after midnight is not "late vs evening start".
  if (shift.isOvernight && arrival < startMins) {
    return false;
  }

  return arrival > startMins + grace;
}

function isEarlyExit(lastOutAt: Date, shift: ShiftRuleInput): boolean {
  const endMins = parseHhMmToMinutes(shift.endTime);
  if (endMins == null) return false;
  const threshold = Math.max(0, shift.earlyExitThresholdMinutes || 0);
  if (threshold <= 0) return false;
  const exitMins = colomboMinutesFromMidnight(lastOutAt);

  if (shift.isOvernight) {
    // End time is after midnight; early exit if before end - threshold on the end calendar segment.
    return exitMins < endMins - threshold;
  }

  return exitMins < endMins - threshold;
}

function uniqueFlags(flags: AttendanceDayFlag[]): AttendanceDayFlag[] {
  return [...new Set(flags)];
}
