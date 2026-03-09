import type { Account } from '@/types/accounting';
import type { AccountType } from '@prisma/client';

/** Map Prisma account row to Account type. Used by account.service and statement.service. */
export function mapAccount(
  row: {
    id: string;
    code: string | null;
    name: string;
    type: AccountType;
    parentAccountId: string | null;
    locationId: string | null;
    doctorId: string | null;
    agencyId: string | null;
    creditCustomerId?: string | null;
    userId: string | null;
    minBalanceAllowed: number | null;
    maxBalanceAllowed: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    location?: { id: string; name: string } | null;
    doctor?: { id: string; name: string; code: string } | null;
    agency?: { id: string; name: string; code: string | null } | null;
    creditCustomer?: { id: string; name: string; code: string | null } | null;
    parentAccount?: { id: string; name: string; code: string | null } | null;
  }
): Account {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    parentAccountId: row.parentAccountId,
    locationId: row.locationId,
    doctorId: row.doctorId,
    agencyId: row.agencyId,
    creditCustomerId: row.creditCustomerId ?? null,
    userId: row.userId,
    minBalanceAllowed: row.minBalanceAllowed,
    maxBalanceAllowed: row.maxBalanceAllowed ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    location: row.location ?? null,
    doctor: row.doctor ?? null,
    agency: row.agency ?? null,
    creditCustomer: row.creditCustomer ?? null,
  };
}
