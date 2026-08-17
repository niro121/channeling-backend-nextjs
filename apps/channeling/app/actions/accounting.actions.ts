'use server';

import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllAccounts,
  getLinkedAccountUserOptions,
  getAccountById as getAccountByIdService,
  createAccount as createAccountService,
  updateAccount as updateAccountService,
  getAccountStatement as getAccountStatementService,
  getMainCashBookAccount,
  getBranchCashBalance,
  getFullInstituteCashBalance,
  createJournalEntry as createJournalEntryService,
  type GetAllAccountsParams,
} from '@/services/accounting.service';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/accounting';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import prisma from '@/lib/prisma';

export type GetAccountsParams = {
  page?: string | number;
  limit?: string | number;
  type?: string | null;
  locationId?: string | null;
  userId?: string | null;
  keyword?: string | null;
};

export async function getAccounts(
  params: GetAccountsParams = {}
): Promise<{
  success: boolean;
  message?: string;
  data: Account[];
  totalRecords: number;
}> {
  await requirePermission('accounting', 'view');

  try {
    const query: GetAllAccountsParams = {
      page: params.page != null ? Number(params.page) : 0,
      limit:
        params.limit != null
          ? Number(params.limit)
          : Number(process.env.DEFAULT_PER_PAGE ?? '10'),
      type: (params.type as GetAllAccountsParams['type']) ?? undefined,
      locationId: params.locationId ?? undefined,
      userId: params.userId ?? undefined,
      keyword: params.keyword ?? undefined,
    };

    const response = await getAllAccounts(query);

    if (!response.success) {
      return {
        success: false,
        message: response.error ?? 'Failed to fetch accounts',
        data: [],
        totalRecords: 0,
      };
    }

    return {
      success: true,
      data: response.data ?? [],
      totalRecords: response.totalRecords ?? 0,
    };
  } catch (error: unknown) {
    console.error('getAccounts action error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error loading accounts',
      data: [],
      totalRecords: 0,
    };
  }
}

/** Users with at least one linked account, for the Accounting filter. */
export async function getLinkedAccountUserOptionsAction(): Promise<{
  success: boolean;
  data: Array<{ id: string; name: string }>;
  message?: string;
}> {
  await requirePermission('accounting', 'view');

  try {
    const data = await getLinkedAccountUserOptions();
    return { success: true, data };
  } catch (error: unknown) {
    console.error('getLinkedAccountUserOptionsAction error:', error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : 'Error loading users',
    };
  }
}

export async function getAccountById(id: string) {
  await requirePermission('accounting', 'view');

  try {
    const account = await getAccountByIdService(id);
    return { success: true, data: account };
  } catch (error: unknown) {
    console.error('getAccountById action error:', error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : 'Error loading account',
    };
  }
}

export async function createAccount(payload: CreateAccountInput) {
  await requirePermission('accounting', 'add');

  try {
    const result = await createAccountService(payload);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        data: null,
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'accounting.account.created',
        entityType: 'Account',
        entityId: result.account?.id ?? undefined,
        importance: 'high',
        metadata: result.account ? { code: result.account.code, name: result.account.name } : undefined,
      });
    }
    revalidatePath('/accounting');
    return {
      success: true,
      data: result.account,
      message: 'Account created successfully',
    };
  } catch (error: unknown) {
    console.error('createAccount action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account',
      data: null,
    };
  }
}

export async function updateAccount(id: string, payload: UpdateAccountInput) {
  await requirePermission('accounting', 'edit');

  try {
    const shouldTrackHardLimitChange =
      ('maxBalanceAllowed' in payload && payload.maxBalanceAllowed !== undefined) ||
      ('minBalanceAllowed' in payload && payload.minBalanceAllowed !== undefined);
    const beforeHardLimit = shouldTrackHardLimitChange
      ? await prisma.account.findUnique({
          where: { id },
          select: {
            id: true,
            type: true,
            minBalanceAllowed: true,
            maxBalanceAllowed: true,
            agencyId: true,
            agency: { select: { id: true, name: true, code: true } },
          },
        })
      : null;

    const result = await updateAccountService(id, payload);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        data: null,
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const actorUserId = session.user.id;
      logActivityNonBlocking({
        userId: actorUserId,
        action: 'accounting.account.updated',
        entityType: 'Account',
        entityId: id,
        importance: 'high',
        metadata: result.account ? { code: result.account.code, name: result.account.name } : undefined,
      });

      if (shouldTrackHardLimitChange && beforeHardLimit?.agencyId) {
        const track = (
          field: 'minBalanceAllowed' | 'maxBalanceAllowed',
          oldValueCents: number | null,
          newValueCents: number | null
        ) => {
          if (oldValueCents === newValueCents) return;
          const oldValue = oldValueCents == null ? null : oldValueCents / 100;
          const newValue = newValueCents == null ? null : newValueCents / 100;
          const delta =
            oldValue != null && newValue != null ? newValue - oldValue : null;

          logActivityNonBlocking({
            userId: actorUserId,
            action: 'agencies.limit.hard_changed',
            entityType: 'Account',
            entityId: id,
            importance: 'high',
            metadata: {
              accountId: id,
              accountType: beforeHardLimit.type,
              agencyId: beforeHardLimit.agencyId,
              agencyName: beforeHardLimit.agency?.name ?? null,
              agencyCode: beforeHardLimit.agency?.code ?? null,
              field,
              oldValueCents,
              newValueCents,
              oldValue,
              newValue,
              delta,
            },
          });
        };

        if ('minBalanceAllowed' in payload && payload.minBalanceAllowed !== undefined) {
          track('minBalanceAllowed', beforeHardLimit.minBalanceAllowed ?? null, result.account?.minBalanceAllowed ?? null);
        }
        if ('maxBalanceAllowed' in payload && payload.maxBalanceAllowed !== undefined) {
          track('maxBalanceAllowed', beforeHardLimit.maxBalanceAllowed ?? null, result.account?.maxBalanceAllowed ?? null);
        }
      }
    }
    revalidatePath('/accounting');
    revalidatePath(`/accounting/${id}/edit`);
    revalidatePath(`/accounting/${id}/statement`);
    return {
      success: true,
      data: result.account,
      message: 'Account updated successfully',
    };
  } catch (error: unknown) {
    console.error('updateAccount action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update account',
      data: null,
    };
  }
}

export async function getAccountStatement(
  accountId: string,
  fromDate?: string | Date,
  toDate?: string | Date
) {
  await requirePermission('accounting', 'view');

  try {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    const statement = await getAccountStatementService(accountId, from, to);
    return { success: true, data: statement };
  } catch (error: unknown) {
    console.error('getAccountStatement action error:', error);
    return {
      success: false,
      data: null,
      message:
        error instanceof Error ? error.message : 'Error loading statement',
    };
  }
}

export async function getMainCashBook() {
  await requirePermission('accounting', 'view');
  try {
    const account = await getMainCashBookAccount();
    return { success: true, data: account };
  } catch (error: unknown) {
    console.error('getMainCashBook action error:', error);
    return { success: false, data: null };
  }
}

export async function getBranchBalance(locationId: string) {
  await requirePermission('accounting', 'view');
  try {
    const balance = await getBranchCashBalance(locationId);
    return { success: true, data: balance };
  } catch (error: unknown) {
    console.error('getBranchBalance action error:', error);
    return { success: false, data: 0 };
  }
}

export async function getInstituteCashBalance() {
  await requirePermission('accounting', 'view');
  try {
    const balance = await getFullInstituteCashBalance();
    return { success: true, data: balance };
  } catch (error: unknown) {
    console.error('getInstituteCashBalance action error:', error);
    return { success: false, data: 0 };
  }
}

const journalLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  debitLKR: z.number().min(0).optional(),
  creditLKR: z.number().min(0).optional(),
}).refine(
  (data) => {
    const hasDebit = data.debitLKR != null && data.debitLKR > 0;
    const hasCredit = data.creditLKR != null && data.creditLKR > 0;
    return hasDebit !== hasCredit && (hasDebit || hasCredit);
  },
  { message: 'Each line must have either debit or credit (not both, not zero)' }
);

const createJournalEntrySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  locationId: z.string().nullable().optional(),
  lines: z.array(journalLineSchema).min(2, 'At least two lines are required'),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((s, l) => s + (l.debitLKR ?? 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + (l.creditLKR ?? 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Total debits must equal total credits' }
);

export type CreateJournalEntryActionInput = z.infer<typeof createJournalEntrySchema>;

export async function createJournalEntryAction(input: unknown) {
  await requirePermission('accounting', 'add');

  const parsed = createJournalEntrySchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat().filter(Boolean)[0] ?? 'Validation failed';
    return {
      success: false as const,
      error: message,
      errorCode: 'VALIDATION_ERROR',
      issues: flat.fieldErrors,
    };
  }

  const { date, description, locationId, lines } = parsed.data;
  const amountCents = (lkr: number) => Math.round(lkr * 100);

  const journalLines = lines.map((l) => ({
    accountId: l.accountId,
    debitAmount: amountCents(l.debitLKR ?? 0),
    creditAmount: amountCents(l.creditLKR ?? 0),
    memo: null as string | null,
  }));

  const { fetchServerSession } = await import('@/lib/session');
  const session = await fetchServerSession();
  const createdBy = session?.user?.id ?? null;

  try {
    const result = await createJournalEntryService({
      date: new Date(date),
      description: description.trim(),
      referenceType: 'Manual',
      referenceId: null,
      locationId: locationId ?? null,
      createdBy,
      lines: journalLines,
    });

    if (!result.success) {
      return {
        success: false as const,
        error: result.error,
        errorCode: result.errorCode,
        issues: undefined,
      };
    }

    revalidatePath('/accounting');
    revalidatePath('/accounting/entries');
    return {
      success: true as const,
      data: { journalId: result.journalId },
      message: 'Journal entry created',
    };
  } catch (error: unknown) {
    console.error('createJournalEntryAction error:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to create journal entry',
      errorCode: 'SERVER_ERROR',
      issues: undefined,
    };
  }
}
