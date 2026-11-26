export type PayableShare = {
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  amount: number;
};

type Line = {
  doctorId?: string | null;
  doctorCode?: string | null;
  doctorName: string;
  amount: number;
  sortOrder: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function parsePayableShares(value: unknown): PayableShare[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const share = row as Partial<PayableShare>;
    const amount = Number(share.amount);
    if (!share.doctorId || !share.doctorCode || !Number.isFinite(amount) || amount <= 0) return [];
    return [
      {
        doctorId: String(share.doctorId),
        doctorCode: String(share.doctorCode),
        doctorName: String(share.doctorName ?? share.doctorCode),
        amount: round2(amount),
      },
    ];
  });
}

/**
 * Spread a patient payment across doctors in line order, up to each doctor's unpaid fee.
 * Extra (overpayment) is added to the last doctor.
 */
export function allocatePaymentShares(
  lines: Line[],
  alreadyCredited: PayableShare[],
  amount: number
): { success: true; shares: PayableShare[] } | { success: false; message: string } {
  const payment = round2(amount);
  if (payment <= 0) return { success: false, message: 'Amount received must be greater than zero.' };

  const ordered = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const doctors: PayableShare[] = [];
  const indexByCode = new Map<string, number>();

  for (const line of ordered) {
    const doctorId = line.doctorId?.trim() ?? '';
    const doctorCode = line.doctorCode?.trim() ?? '';
    if (!doctorId || !doctorCode) {
      return {
        success: false,
        message: `Reselect ${line.doctorName || 'the doctor'} on the bill so the DPAY payable can be posted.`,
      };
    }
    const existing = indexByCode.get(doctorCode);
    if (existing == null) {
      indexByCode.set(doctorCode, doctors.length);
      doctors.push({
        doctorId,
        doctorCode,
        doctorName: line.doctorName,
        amount: round2(line.amount),
      });
    } else {
      doctors[existing].amount = round2(doctors[existing].amount + line.amount);
    }
  }

  const credited = new Map<string, number>();
  for (const share of alreadyCredited) {
    credited.set(share.doctorCode, round2((credited.get(share.doctorCode) ?? 0) + share.amount));
  }

  let left = payment;
  const shares: PayableShare[] = [];
  for (const doctor of doctors) {
    const room = round2(Math.max(0, doctor.amount - (credited.get(doctor.doctorCode) ?? 0)));
    if (room <= 0 || left <= 0) continue;
    const take = round2(Math.min(room, left));
    shares.push({ ...doctor, amount: take });
    left = round2(left - take);
  }

  if (left > 0) {
    const target = shares[shares.length - 1] ?? doctors[doctors.length - 1];
    if (!target) return { success: false, message: 'Add a doctor charge before recording a payment.' };
    const existing = shares.find((share) => share.doctorCode === target.doctorCode);
    if (existing) existing.amount = round2(existing.amount + left);
    else shares.push({ ...target, amount: left });
  }

  return { success: true, shares: shares.filter((share) => share.amount > 0) };
}

/** Reverse stored shares, largest first, until the refund amount is covered. */
export function allocateRefundShares(
  credited: PayableShare[],
  amount: number
): { success: true; shares: PayableShare[] } | { success: false; message: string } {
  const refund = round2(amount);
  const pool = credited
    .map((share) => ({ ...share }))
    .sort((a, b) => b.amount - a.amount);
  let left = refund;
  const shares: PayableShare[] = [];
  for (const share of pool) {
    if (left <= 0) break;
    const take = round2(Math.min(share.amount, left));
    if (take <= 0) continue;
    shares.push({ ...share, amount: take });
    left = round2(left - take);
  }
  if (left > 0.009) {
    return { success: false, message: 'This refund is larger than the doctor amounts already credited.' };
  }
  return { success: true, shares };
}
