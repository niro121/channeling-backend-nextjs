'use server';

import prisma from '@/lib/prisma';
import type { AgentBalanceReportQuery, AgentBalanceReportRow } from '@/types/reports/agent-balance';
import type { Prisma } from '@prisma/client';

export async function getAgentBalanceReportService(
  query: AgentBalanceReportQuery
): Promise<{
  success: boolean;
  data?: AgentBalanceReportRow[];
  totalRecords?: number;
  message?: string;
  error?: {
    message?: string;
  };
}> {
  try {
    const resolveAgencyHardCreditLimitLkr = (account?: {
      minBalanceAllowed?: number | null;
      maxBalanceAllowed?: number | null;
    } | null): number => {
      if (!account) return 0;
      if (account.minBalanceAllowed != null) return Math.abs(Number(account.minBalanceAllowed)) / 100;
      if (account.maxBalanceAllowed != null) return Number(account.maxBalanceAllowed) / 100;
      return 0;
    };

    const where: Prisma.AgencyWhereInput = {};
    if (query.agentId && query.agentId !== '__all__') {
      where.id = query.agentId;
    }
    if (query.status && query.status !== '__all__') {
      const parsedStatus = Number(query.status);
      if (!Number.isFinite(parsedStatus) || ![0, 1].includes(parsedStatus)) {
        return {
          success: false,
          message: 'Invalid status filter. Allowed values are Active or Inactive.',
        };
      }
      where.status = parsedStatus;
    }

    const rows = await prisma.agency.findMany({
      where,
      select: {
        id: true,
        status: true,
        name: true,
        code: true,
        phone: true,
        allowedCreditLimit: true,
        parentAgency: { select: { name: true } },
        addressLine1: true,
        addressLine2: true,
        city: true,
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          select: { id: true, minBalanceAllowed: true, maxBalanceAllowed: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const accountIds = rows.map((a) => a.accounts?.[0]?.id).filter(Boolean) as string[];
    const balanceByAccountId = new Map<string, number>();
    if (accountIds.length > 0) {
      const sums = await prisma.journalLine.groupBy({
        by: ['accountId'],
        where: { accountId: { in: accountIds } },
        _sum: { debitAmount: true, creditAmount: true },
      });
      for (const s of sums) {
        const debit = s._sum.debitAmount ?? 0;
        const credit = s._sum.creditAmount ?? 0;
        // PAYABLE account balance = credits - debits
        balanceByAccountId.set(s.accountId, credit - debit);
      }
    }

    const data: AgentBalanceReportRow[] = rows.map((a) => {
        const acc = a.accounts?.[0];
        const balanceCents = acc?.id ? balanceByAccountId.get(acc.id) ?? 0 : 0;
        const address = [a.addressLine1, a.addressLine2, a.city].filter(Boolean).join(', ');
        return {
          id: a.id,
          status: Number(a.status ?? 0),
          agentCode: a.code || '-',
          parentAgent: a.parentAgency?.name || '-',
          agentName: a.name || '-',
          agentPhoneNo: a.phone || '-',
          agentAddress: address || '-',
          maxCreditLimit: resolveAgencyHardCreditLimitLkr(acc),
          allowedCreditLimit: Number(a.allowedCreditLimit ?? 0),
          agentBalance: Number(balanceCents || 0) / 100,
        };
      });

    return {
      success: true,
      data,
      totalRecords: data.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch agent balance report';
    console.error('getAgentBalanceReportService error:', error);
    return {
      success: false,
      message: msg,
      error: {
        message: msg,
      },
    };
  }
}
