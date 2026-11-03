'use server';

import { format } from 'date-fns';
import prisma, { Prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/helpers/email';
import { sendSms } from '@/lib/helpers/sms';
import { payslipEmailTemplate } from '@/lib/templates/email/payslip';
import { payslipSmsTemplate } from '@/lib/templates/sms/payslip';
import { getInstitutionName } from '@/types/institution';
import {
  EMPTY_PAYSLIP_SUMMARY,
  PAYSLIP_PAYMENT_STATUS_LABELS,
  type GetPayslipParams,
  type PayslipPaymentStatus,
  type PayslipRecord,
  type PayslipSummary
} from '@/types/payroll';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function maskAccount(account: string | null | undefined): string {
  const digits = (account ?? '').replace(/\s+/g, '');
  if (!digits) return '—';
  if (digits.length <= 4) return `****${digits}`;
  return `****${digits.slice(-4)}`;
}

function mapRunStatusToPayment(
  status: string
): PayslipPaymentStatus {
  if (status === 'paid') return 'paid';
  if (status === 'processed') return 'processed';
  if (status === 'on_hold') return 'on_hold';
  return 'pending';
}

function formatMoneyLabel(value: number): string {
  return `LKR ${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

type LineWithRun = {
  id: string;
  payrollRunId: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  departmentId: string;
  designation: string;
  designationId: string;
  institution: string;
  institutionId: string;
  basic: number;
  allowances: number;
  ot: number;
  otherEarnings: number;
  gross: number;
  epf8: number;
  epf12: number;
  etf3: number;
  paye: number;
  loans: number;
  otherDeductions: number;
  net: number;
  components: Array<{ source: string; typeId: string; amount: number }>;
  createdAt: Date;
  run: {
    id: string;
    code: string;
    status: string;
    salaryFromDate: Date;
    salaryToDate: Date;
    institution: string;
    institutionId: number;
    updatedAt: Date;
  };
};

function mapPayslipRecord(
  line: LineWithRun,
  contact?: {
    email: string | null;
    phone: string | null;
    epfNumber: string;
    accountNumber: string | null;
  }
): PayslipRecord {
  const advances = roundMoney(
    line.components
      .filter((c) => c.typeId === 'advance' || c.source === 'advance')
      .reduce((sum, c) => sum + c.amount, 0)
  );
  const loanAmount = roundMoney(Math.max(0, line.loans - advances));
  const totalDeductions = roundMoney(
    line.epf8 + line.paye + line.loans + line.otherDeductions
  );
  const from = line.run.salaryFromDate;
  const salaryMonth = String(from.getUTCMonth() + 1);
  const salaryYear = String(from.getUTCFullYear());
  const salaryPeriod = `${format(from, 'MMMM yyyy')}`;

  return {
    id: line.id,
    payrollRunId: line.run.id,
    payrollRunCode: line.run.code,
    staffId: line.staffId,
    staffCode: line.staffCode,
    staffName: line.staffName,
    staffEmail: contact?.email ?? null,
    staffPhone: contact?.phone ?? null,
    department: line.department || '—',
    departmentId: line.departmentId || '',
    designation: line.designation || '—',
    designationId: line.designationId || '',
    institution:
      line.institution ||
      getInstitutionName(line.run.institutionId) ||
      '—',
    institutionId: line.institutionId || String(line.run.institutionId),
    bankAccountMasked: maskAccount(contact?.accountNumber),
    epfNumber: contact?.epfNumber || '—',
    salaryPeriod,
    salaryMonth,
    salaryYear,
    basicSalary: line.basic,
    totalAllowances: line.allowances,
    otherEarnings: roundMoney(line.ot + line.otherEarnings),
    grossSalary: line.gross,
    epfStaff: line.epf8,
    paye: line.paye,
    loans: loanAmount,
    advances,
    otherDeductions: line.otherDeductions,
    totalDeductions,
    netSalary: line.net,
    employerEpf: line.epf12 ?? 0,
    employerEtf: line.etf3 ?? 0,
    paymentStatus: mapRunStatusToPayment(line.run.status),
    generatedAt: line.run.updatedAt.toISOString()
  };
}

async function loadStaffContacts(staffIds: string[]) {
  if (!staffIds.length) return new Map<string, {
    email: string | null;
    phone: string | null;
    epfNumber: string;
    accountNumber: string | null;
  }>();

  const rows = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: {
      id: true,
      contactMobile: true,
      hrDetails: true,
      employmentDetails: true
    }
  });

  const map = new Map<
    string,
    {
      email: string | null;
      phone: string | null;
      epfNumber: string;
      accountNumber: string | null;
    }
  >();

  for (const staff of rows) {
    map.set(staff.id, {
      email: staff.hrDetails?.email?.trim() || null,
      phone: staff.contactMobile?.trim() || null,
      epfNumber: staff.hrDetails?.epfNumber?.trim() || '',
      accountNumber:
        staff.employmentDetails?.payroll?.accountNumber?.trim() || null
    });
  }
  return map;
}

function buildRunStatusFilter(
  paymentStatus?: string
): string[] {
  if (!paymentStatus || paymentStatus === '__all__') {
    return ['generated', 'processed', 'on_hold', 'paid'];
  }
  if (paymentStatus === 'pending') return ['generated'];
  if (paymentStatus === 'processed') return ['processed'];
  if (paymentStatus === 'on_hold') return ['on_hold'];
  if (paymentStatus === 'paid') return ['paid'];
  return ['generated', 'processed', 'on_hold', 'paid'];
}

type PayslipRunScope = {
  id: string;
  code: string;
  status: string;
  salaryFromDate: Date;
  salaryToDate: Date;
  institution: string;
  institutionId: number;
  updatedAt: Date;
};

type PayslipQueryScope = {
  filteredRuns: PayslipRunScope[];
  runById: Map<string, PayslipRunScope>;
  where: Prisma.PayrollRunLineWhereInput;
};

/** Soft ceiling for export / bulk notify — ask user to narrow filters beyond this. */
const PAYSLIP_BULK_MAX_ROWS = 10_000;
const PAYSLIP_FETCH_CHUNK = 500;

async function resolvePayslipScope(
  params: GetPayslipParams = {}
): Promise<PayslipQueryScope> {
  const statuses = buildRunStatusFilter(params.paymentStatus);
  const runs = await prisma.payrollRun.findMany({
    where: { status: { in: statuses } },
    select: {
      id: true,
      code: true,
      status: true,
      salaryFromDate: true,
      salaryToDate: true,
      institution: true,
      institutionId: true,
      updatedAt: true
    },
    orderBy: [{ salaryFromDate: 'desc' }, { updatedAt: 'desc' }]
  });

  let filteredRuns = runs;
  if (params.salaryYear && params.salaryYear !== '__all__') {
    const year = Number(params.salaryYear);
    filteredRuns = filteredRuns.filter(
      (run) => run.salaryFromDate.getUTCFullYear() === year
    );
  }
  if (params.salaryMonth && params.salaryMonth !== '__all__') {
    const month = Number(params.salaryMonth);
    filteredRuns = filteredRuns.filter(
      (run) => run.salaryFromDate.getUTCMonth() + 1 === month
    );
  }
  if (params.institution && params.institution !== '__all__') {
    filteredRuns = filteredRuns.filter(
      (run) => String(run.institutionId) === params.institution
    );
  }

  const and: Prisma.PayrollRunLineWhereInput[] = [
    { payrollRunId: { in: filteredRuns.map((run) => run.id) } }
  ];

  if (params.staffId) and.push({ staffId: params.staffId });
  if (params.staffCode?.trim()) {
    and.push({
      staffCode: {
        contains: params.staffCode.trim()
      }
    });
  }
  if (params.departmentId) and.push({ departmentId: params.departmentId });
  if (params.designationId) {
    and.push({ designationId: params.designationId });
  }

  return {
    filteredRuns,
    runById: new Map(filteredRuns.map((run) => [run.id, run])),
    where: { AND: and }
  };
}

async function mapLinesToPayslips(
  lines: Array<Omit<LineWithRun, 'run'> & { payrollRunId: string }>,
  runById: Map<string, PayslipRunScope>
): Promise<PayslipRecord[]> {
  const contacts = await loadStaffContacts([
    ...new Set(lines.map((line) => line.staffId))
  ]);

  return lines
    .map((line) => {
      const run = runById.get(line.payrollRunId);
      if (!run) return null;
      return mapPayslipRecord({ ...line, run }, contacts.get(line.staffId));
    })
    .filter((row): row is PayslipRecord => row != null);
}

export async function getPayslipList(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: PayslipRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const scope = await resolvePayslipScope(params);
    if (!scope.filteredRuns.length) {
      return { success: true, data: [], total: 0 };
    }

    const pageNumber = Math.max(
      1,
      Number(params.page) ||
        Number.parseInt(process.env.DEFAULT_PAGE ?? '0', 10) ||
        1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number(params.limit) || Number.parseInt(defaultPerPage, 10) || 10
      )
    );
    const skip = (pageNumber - 1) * pageSize;

    const [total, lines] = await Promise.all([
      prisma.payrollRunLine.count({ where: scope.where }),
      prisma.payrollRunLine.findMany({
        where: scope.where,
        orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }],
        skip,
        take: pageSize
      })
    ]);

    const data = await mapLinesToPayslips(lines, scope.runById);
    return { success: true, data, total };
  } catch (error: any) {
    console.error('getPayslipList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load payslips' }
    };
  }
}

/**
 * All matching payslips without UI page-size clamp (chunked).
 * Soft-fails above PAYSLIP_BULK_MAX_ROWS so callers can ask users to narrow filters.
 */
export async function getPayslipListAll(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: PayslipRecord[];
  total?: number;
  error?: { message?: string };
}> {
  try {
    const scope = await resolvePayslipScope(params);
    if (!scope.filteredRuns.length) {
      return { success: true, data: [], total: 0 };
    }

    const total = await prisma.payrollRunLine.count({ where: scope.where });
    if (total > PAYSLIP_BULK_MAX_ROWS) {
      return {
        success: false,
        error: {
          message: `Too many payslips (${total}). Narrow filters (month/year) — max ${PAYSLIP_BULK_MAX_ROWS}.`
        }
      };
    }

    const allLines: Awaited<
      ReturnType<typeof prisma.payrollRunLine.findMany>
    > = [];
    for (let skip = 0; skip < total; skip += PAYSLIP_FETCH_CHUNK) {
      const chunk = await prisma.payrollRunLine.findMany({
        where: scope.where,
        orderBy: [{ staffName: 'asc' }, { staffCode: 'asc' }],
        skip,
        take: PAYSLIP_FETCH_CHUNK
      });
      allLines.push(...chunk);
    }

    const data = await mapLinesToPayslips(allLines, scope.runById);
    return { success: true, data, total };
  } catch (error: any) {
    console.error('getPayslipListAll error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load payslips' }
    };
  }
}

export async function getPayslipSummary(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: PayslipSummary;
  error?: { message?: string };
}> {
  try {
    const scope = await resolvePayslipScope(params);
    if (!scope.filteredRuns.length) {
      return {
        success: true,
        data: {
          ...EMPTY_PAYSLIP_SUMMARY,
          periodLabel:
            params.salaryMonth &&
            params.salaryMonth !== '__all__' &&
            params.salaryYear &&
            params.salaryYear !== '__all__'
              ? format(
                  new Date(
                    Number(params.salaryYear),
                    Number(params.salaryMonth) - 1,
                    1
                  ),
                  'MMMM yyyy'
                )
              : null
        }
      };
    }

    const onHoldRunIds = scope.filteredRuns
      .filter((run) => run.status === 'on_hold')
      .map((run) => run.id);

    const [payslipsGenerated, aggregates, onHold] = await Promise.all([
      prisma.payrollRunLine.count({ where: scope.where }),
      prisma.payrollRunLine.aggregate({
        where: scope.where,
        _sum: { gross: true, net: true }
      }),
      onHoldRunIds.length
        ? prisma.payrollRunLine.count({
            where: {
              AND: [scope.where, { payrollRunId: { in: onHoldRunIds } }]
            }
          })
        : Promise.resolve(0)
    ]);

    const periodLabel =
      params.salaryMonth &&
      params.salaryMonth !== '__all__' &&
      params.salaryYear &&
      params.salaryYear !== '__all__'
        ? format(
            new Date(
              Number(params.salaryYear),
              Number(params.salaryMonth) - 1,
              1
            ),
            'MMMM yyyy'
          )
        : scope.filteredRuns[0]
          ? format(scope.filteredRuns[0].salaryFromDate, 'MMMM yyyy')
          : null;

    return {
      success: true,
      data: {
        periodLabel,
        payslipsGenerated,
        grossSalary: roundMoney(aggregates._sum.gross ?? 0),
        netSalary: roundMoney(aggregates._sum.net ?? 0),
        onHold
      }
    };
  } catch (error: any) {
    console.error('getPayslipSummary error:', error);
    return {
      success: false,
      data: EMPTY_PAYSLIP_SUMMARY,
      error: { message: error.message || 'Failed to load summary' }
    };
  }
}

export async function getPayslipById(id: string): Promise<{
  success: boolean;
  data?: PayslipRecord;
  error?: { message?: string };
}> {
  try {
    const line = await prisma.payrollRunLine.findUnique({ where: { id } });
    if (!line) {
      return { success: false, error: { message: 'Payslip not found' } };
    }
    const run = await prisma.payrollRun.findUnique({
      where: { id: line.payrollRunId }
    });
    if (!run) {
      return { success: false, error: { message: 'Payroll run not found' } };
    }
    const contacts = await loadStaffContacts([line.staffId]);
    return {
      success: true,
      data: mapPayslipRecord(
        { ...line, run },
        contacts.get(line.staffId)
      )
    };
  } catch (error: any) {
    console.error('getPayslipById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load payslip' }
    };
  }
}

export async function getPayslipExportRows(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: Array<Record<string, string>>;
  error?: { message?: string };
}> {
  try {
    const result = await getPayslipListAll(params);
    if (!result.success) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Export failed' }
      };
    }
    return {
      success: true,
      data: (result.data ?? []).map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        designation: row.designation,
        institution: row.institution,
        salaryPeriod: row.salaryPeriod,
        basicSalary: String(row.basicSalary),
        totalAllowances: String(row.totalAllowances),
        grossSalary: String(row.grossSalary),
        totalDeductions: String(row.totalDeductions),
        netSalary: String(row.netSalary),
        paymentStatus: PAYSLIP_PAYMENT_STATUS_LABELS[row.paymentStatus],
        generatedAt: row.generatedAt ?? '—'
      }))
    };
  } catch (error: any) {
    console.error('getPayslipExportRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Export failed' }
    };
  }
}

function templateInputFromRecord(record: PayslipRecord) {
  return {
    staffName: record.staffName,
    staffCode: record.staffCode,
    salaryPeriod: record.salaryPeriod,
    netSalaryLabel: formatMoneyLabel(record.netSalary),
    grossSalaryLabel: formatMoneyLabel(record.grossSalary),
    totalDeductionsLabel: formatMoneyLabel(record.totalDeductions),
    paymentStatusLabel: PAYSLIP_PAYMENT_STATUS_LABELS[record.paymentStatus],
    institution: record.institution
  };
}

export async function sendPayslipEmail(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    const result = await getPayslipById(id);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Payslip not found' }
      };
    }
    const email = result.data.staffEmail?.trim();
    if (!email) {
      return {
        success: false,
        error: { message: 'Staff email is not available' }
      };
    }
    const content = payslipEmailTemplate(templateInputFromRecord(result.data));
    const sent = await sendEmail(email, content.subject, content.text, {
      html: content.html
    });
    if (!sent.status) {
      return {
        success: false,
        error: { message: sent.error ?? 'Failed to send email' }
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error('sendPayslipEmail error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to send email' }
    };
  }
}

export async function sendPayslipSms(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    const result = await getPayslipById(id);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Payslip not found' }
      };
    }
    const phone = result.data.staffPhone?.trim();
    if (!phone) {
      return {
        success: false,
        error: { message: 'Staff phone number is not available' }
      };
    }
    const text = payslipSmsTemplate(templateInputFromRecord(result.data));
    const sent = await sendSms(phone, text);
    if (!sent.status) {
      return {
        success: false,
        error: { message: sent.error ?? 'Failed to send SMS' }
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error('sendPayslipSms error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to send SMS' }
    };
  }
}

export async function sendPayslipEmailBulk(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: { sent: number; skipped: number; failed: number };
  error?: { message?: string };
}> {
  try {
    const result = await getPayslipListAll(params);
    if (!result.success) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Failed to load payslips' }
      };
    }
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of result.data ?? []) {
      if (!row.staffEmail?.trim()) {
        skipped += 1;
        continue;
      }
      const res = await sendPayslipEmail(row.id);
      if (res.success) sent += 1;
      else failed += 1;
    }
    return { success: true, data: { sent, skipped, failed } };
  } catch (error: any) {
    console.error('sendPayslipEmailBulk error:', error);
    return {
      success: false,
      error: { message: error.message || 'Bulk email failed' }
    };
  }
}

export async function sendPayslipSmsBulk(
  params: GetPayslipParams = {}
): Promise<{
  success: boolean;
  data?: { sent: number; skipped: number; failed: number };
  error?: { message?: string };
}> {
  try {
    const result = await getPayslipListAll(params);
    if (!result.success) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Failed to load payslips' }
      };
    }
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of result.data ?? []) {
      if (!row.staffPhone?.trim()) {
        skipped += 1;
        continue;
      }
      const res = await sendPayslipSms(row.id);
      if (res.success) sent += 1;
      else failed += 1;
    }
    return { success: true, data: { sent, skipped, failed } };
  } catch (error: any) {
    console.error('sendPayslipSmsBulk error:', error);
    return {
      success: false,
      error: { message: error.message || 'Bulk SMS failed' }
    };
  }
}
