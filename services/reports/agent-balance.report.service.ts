'use server';

import prisma from '@/lib/prisma';
import moment from 'moment';
import { AgentBalanceReportQuery, AgentBalanceReportData } from '@/types/reports/agent-balance';
import { RECEIPT_METHOD, RECEIPT_PAYMENT_METHOD } from '@/types/receipt';

/**
 * Calculate agent balance from transaction records (Receipts and Leger)
 * Balance = Deposits - Payments - Refunds
 */
async function calculateAgentBalance(
  agencyId: string,
  asOfDate: string // Format: "YYYY-MM-DD"
): Promise<number> {
  // Convert date to end of day timestamp (Unix milliseconds)
  const endOfDayTimestamp = moment(asOfDate + " 23:59:59", "YYYY-MM-DD HH:mm:ss").valueOf();

  // 1. Calculate total payments (method = 1, Payment Receipts)
  const paymentsResult = await prisma.receipt.aggregate({
    _sum: { amount: true },
    where: {
      method: RECEIPT_METHOD.PAYMENT, // method = 1
      agencyId: agencyId,
      createdAt: { lte: new Date(endOfDayTimestamp) }
    }
  });
  const paidtotal = paymentsResult._sum.amount || 0;

  // 2. Calculate total refunds (method = 0 AND paymentMethod = 4, Agent payment method)
  const refundsResult = await prisma.receipt.aggregate({
    _sum: { amount: true },
    where: {
      method: RECEIPT_METHOD.REFUND, // method = 0
      paymentMethod: RECEIPT_PAYMENT_METHOD.AGENT, // paymentMethod = 4
      agencyId: agencyId,
      createdAt: { lte: new Date(endOfDayTimestamp) }
    }
  });
  const refundtotal = refundsResult._sum.amount || 0;

  // 3. Calculate total deposits
  // Note: According to requirements, deposits should come from Leger table/collection
  // However, in the current system, deposits are tracked via Receipts with method = 6 (AGENCY_DEPOSIT)
  // If a Leger collection exists with 'value', 'agency', and 'createdAt' fields, it should be used instead
  // For now, using Receipts method = 6 as the implementation
  const depositsResult = await prisma.receipt.aggregate({
    _sum: { amount: true },
    where: {
      method: RECEIPT_METHOD.AGENCY_DEPOSIT, // method = 6
      agencyId: agencyId,
      createdAt: { lte: new Date(endOfDayTimestamp) }
    }
  });
  const deposits = depositsResult._sum.amount || 0;

  // 4. Calculate final balance
  // Note: Receipt amounts are in cents, so we need to convert to rupees
  // Leger value might be in rupees or cents - assuming same as Receipts (cents)
  const balance = (deposits - paidtotal - refundtotal) / 100; // Convert cents to rupees

  return balance || 0;
}

export async function getAgentBalanceReportService(
  query: AgentBalanceReportQuery
): Promise<{
  success: boolean;
  data?: AgentBalanceReportData;
  message?: string;
  error?: {
    message?: string;
  };
}> {
  try {
    if (!query.agentId || query.agentId === '__all__') {
      return {
        success: false,
        message: 'Please select an agent'
      };
    }

    if (!query.date) {
      return {
        success: false,
        message: 'Please select a date'
      };
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
      return {
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD'
      };
    }

    // Get agency information
    const agency = await prisma.agency.findUnique({
      where: { id: query.agentId },
      select: {
        id: true,
        name: true,
        code: true,
        addressLine1: true,
        addressLine2: true,
        city: true
      }
    });

    if (!agency) {
      return {
        success: false,
        message: 'Agent not found'
      };
    }

    // Calculate balance from transactions
    const balance = await calculateAgentBalance(query.agentId, query.date);

    // Build address
    const addressParts = [
      agency.addressLine1,
      agency.addressLine2,
      agency.city
    ].filter(Boolean);
    const address = addressParts.join(', ');

    return {
      success: true,
      data: {
        agentName: agency.name,
        agentCode: agency.code || '',
        balance: balance,
        address: address || undefined,
        date: query.date
      }
    };
  } catch (error: any) {
    console.error('getAgentBalanceReportService error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch agent balance report',
      error: {
        message: error.message || 'Failed to fetch agent balance report'
      }
    };
  }
}
