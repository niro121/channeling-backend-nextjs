import { getChannelingPrisma } from '@/lib/channeling-prisma';
import type { StaffOption } from '@/types/doctor-payment';

function staffLabel(name: string, code: string | null | undefined): string {
  const label = name.trim();
  const staffCode = code?.trim();
  return staffCode ? `${label} (${staffCode})` : label;
}

/** Active channeling staff for the optional "Handed to staff" picker. */
export async function getStaffForDoctorPayment(): Promise<StaffOption[]> {
  try {
    const records = await getChannelingPrisma().staff.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });

    return records.flatMap((record) => {
      const name = record.name?.trim();
      if (!record.id || !name) return [];
      return [{ id: record.id, name: staffLabel(name, record.code) }];
    });
  } catch (error) {
    console.error('getStaffForDoctorPayment', error);
    return [];
  }
}
