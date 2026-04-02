'use server';

import prisma from '@/lib/prisma';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';
import {
  AgentBalanceConfirmationLetterQuery,
  AgentBalanceConfirmationLetterRow,
} from '@/types/reports/agent.balance.confirmation.letter';

function getTodayAsAtDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getAddress(row: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
}): string {
  const parts = [row.addressLine1, row.addressLine2, row.city]
    .map((x) => (x ?? '').trim())
    .filter(Boolean);
  return parts.join(', ');
}

export async function getAgentBalanceConfirmationLetterService(
  query: AgentBalanceConfirmationLetterQuery
): Promise<{ success: boolean; data?: AgentBalanceConfirmationLetterRow[]; totalRecords?: number; message?: string }> {
  try {
    const language: 'en' | 'si' = query.language === 'si' ? 'si' : 'en';
    const asAtDate = (query.asAtDate ?? '').trim() || getTodayAsAtDate();
    const selectedAgentId = (query.agentId ?? '').trim();

    // Keep initial page behavior with a placeholder letter before search.
    if (!selectedAgentId || selectedAgentId === '__all__') {
      return {
        success: true,
        data: [
          {
            id: 'placeholder',
            agentName: '',
            agentCode: '',
            balance: 0,
            address: '',
            asAtDate,
            language,
            isPlaceholder: true,
          },
        ],
        totalRecords: 1,
      };
    }

    const agent = await prisma.agency.findUnique({
      where: { id: selectedAgentId },
      select: {
        id: true,
        name: true,
        code: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!agent) {
      return { success: false, data: [], totalRecords: 0, message: 'Selected agent not found.' };
    }

    const asAtEnd = new Date(`${asAtDate}T23:59:59.999`);
    const account = agent.accounts?.[0];
    const balanceCents = account ? await getAccountBalance(account.id, asAtEnd) : 0;

    const row: AgentBalanceConfirmationLetterRow = {
      id: agent.id,
      agentName: agent.name ?? '',
      agentCode: agent.code ?? '',
      balance: balanceCents / 100,
      address: getAddress(agent),
      asAtDate,
      language,
    };

    return { success: true, data: [row], totalRecords: 1 };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch agent balance confirmation letter';
    console.error('getAgentBalanceConfirmationLetterService error:', error);
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}
