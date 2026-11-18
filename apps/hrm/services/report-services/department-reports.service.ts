import { endOfMonth, format, startOfMonth } from 'date-fns';
import prisma from '@/lib/prisma';
import {
  colomboDateIsoToUtc,
  colomboDayEndInstant,
  colomboDayStartInstant
} from '@/lib/helpers/attendance-timezone.helper';
import { formatLkr } from '@/lib/utils/currency';
import {
  getInstitutionName,
  INSTITUTION_OPTIONS
} from '@/types/institution';
import type {
  DepartmentReportCards,
  DepartmentReportExportRow,
  DepartmentReportResult,
  DepartmentReportRow,
  GetDepartmentReportParams,
  ReportChartPoint
} from '@/types/reports';
import { EMPTY_DEPARTMENT_REPORT_CARDS } from '@/types/reports';

function defaultPeriod(): { fromDate: string; toDate: string } {
  const now = new Date();
  return {
    fromDate: format(startOfMonth(now), 'yyyy-MM-dd'),
    toDate: format(endOfMonth(now), 'yyyy-MM-dd')
  };
}

function parsePage(value?: string): number {
  const n = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseLimit(value?: string, fallback = 10): number {
  const n = Number.parseInt(
    value ?? process.env.DEFAULT_PER_PAGE ?? String(fallback),
    10
  );
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : fallback;
}

function displayCode(index: number): string {
  return `DEP-${String(index + 1).padStart(3, '0')}`;
}

function periodRange(fromDate: string, toDate: string) {
  const fromCivil = colomboDateIsoToUtc(fromDate);
  const toCivil = colomboDateIsoToUtc(toDate);
  return {
    fromStart: colomboDayStartInstant(fromCivil),
    toEnd: colomboDayEndInstant(toCivil)
  };
}

async function loadDepartmentOptions(institution?: string) {
  const where: { status: number; institution?: number } = { status: 1 };
  if (institution && institution !== '__all__') {
    const n = Number.parseInt(institution, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 3) {
      where.institution = n;
    }
  }

  const rows = await prisma.department.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return rows.map((row) => ({ id: row.id, name: row.name }));
}

type BuildOptions = {
  page: number;
  limit: number;
};

async function buildDepartmentReport(
  params: GetDepartmentReportParams,
  options: BuildOptions
): Promise<DepartmentReportResult> {
  const defaults = defaultPeriod();
  const fromDate = params.fromDate?.trim() || defaults.fromDate;
  const toDate = params.toDate?.trim() || defaults.toDate;
  const keyword = params.keyword?.trim().toLowerCase() ?? '';
  const departmentId = params.departmentId?.trim() || '';
  const institutionFilter =
    params.institution && params.institution !== '__all__'
      ? params.institution
      : '';

  const departmentWhere: {
    institution?: number;
    id?: string;
  } = {};

  if (institutionFilter) {
    const n = Number.parseInt(institutionFilter, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 3) {
      departmentWhere.institution = n;
    }
  }
  if (departmentId) {
    departmentWhere.id = departmentId;
  }

  const departments = await prisma.department.findMany({
    where: departmentWhere,
    select: {
      id: true,
      name: true,
      institution: true,
      status: true
    },
    orderBy: { name: 'asc' }
  });

  const departmentIds = departments.map((d) => d.id);
  const { fromStart, toEnd } = periodRange(fromDate, toDate);

  const staffRows = departmentIds.length
    ? await prisma.staff.findMany({
        where: {
          employmentDetails: {
            is: {
              employment: {
                is: {
                  department: { in: departmentIds }
                }
              }
            }
          }
        },
        select: {
          id: true,
          status: true,
          employmentDetails: true
        }
      })
    : [];

  const staffIds = staffRows.map((s) => s.id);

  const periodRuns = departmentIds.length
    ? await prisma.payrollRun.findMany({
        where: {
          status: { in: ['generated', 'processed', 'on_hold', 'paid'] },
          salaryFromDate: { lte: toEnd },
          salaryToDate: { gte: fromStart }
        },
        select: { id: true }
      })
    : [];
  const periodRunIds = periodRuns.map((run) => run.id);

  const [vacancyRows, payrollLines, attendanceDays, leaveApps, otRows] =
    await Promise.all([
      departmentIds.length
        ? prisma.vacancyRequest.findMany({
            where: {
              departmentId: { in: departmentIds },
              status: { in: ['pending_approval', 'approved'] }
            },
            select: { departmentId: true, vacancies: true }
          })
        : Promise.resolve([]),
      departmentIds.length && periodRunIds.length
        ? prisma.payrollRunLine.findMany({
            where: {
              departmentId: { in: departmentIds },
              payrollRunId: { in: periodRunIds }
            },
            select: { departmentId: true, net: true }
          })
        : Promise.resolve([]),
      staffIds.length
        ? prisma.attendanceDay.findMany({
            where: {
              staffId: { in: staffIds },
              date: { gte: fromStart, lte: toEnd }
            },
            select: { staffId: true, status: true }
          })
        : Promise.resolve([]),
      staffIds.length
        ? prisma.leaveApplication.findMany({
            where: {
              staffId: { in: staffIds },
              status: 'approved',
              fromDate: { lte: toEnd },
              toDate: { gte: fromStart }
            },
            select: { staffId: true, days: true }
          })
        : Promise.resolve([]),
      staffIds.length
        ? prisma.overtimeRequest.findMany({
            where: {
              staffId: { in: staffIds },
              status: 'approved',
              otDate: { gte: fromStart, lte: toEnd }
            },
            select: { staffId: true, hours: true }
          })
        : Promise.resolve([])
    ]);

  const staffByDept = new Map<
    string,
    { total: number; active: number; inactive: number }
  >();
  const staffDeptLookup = new Map<string, string>();

  for (const deptId of departmentIds) {
    staffByDept.set(deptId, { total: 0, active: 0, inactive: 0 });
  }

  for (const staff of staffRows) {
    const dept = staff.employmentDetails?.employment?.department?.trim() ?? '';
    if (!dept || !staffByDept.has(dept)) continue;
    const bucket = staffByDept.get(dept)!;
    bucket.total += 1;
    if (staff.status === 1) bucket.active += 1;
    else bucket.inactive += 1;
    staffDeptLookup.set(staff.id, dept);
  }

  const vacanciesByDept = new Map<string, number>();
  for (const row of vacancyRows) {
    vacanciesByDept.set(
      row.departmentId,
      (vacanciesByDept.get(row.departmentId) ?? 0) + (row.vacancies || 0)
    );
  }

  const payrollByDept = new Map<string, number>();
  for (const line of payrollLines) {
    if (!line.departmentId) continue;
    payrollByDept.set(
      line.departmentId,
      (payrollByDept.get(line.departmentId) ?? 0) + (line.net || 0)
    );
  }

  const presentByDept = new Map<string, Set<string>>();
  const absentByDept = new Map<string, Set<string>>();
  for (const day of attendanceDays) {
    const deptId = staffDeptLookup.get(day.staffId);
    if (!deptId) continue;
    if (day.status === 'present' || day.status === 'late') {
      if (!presentByDept.has(deptId)) presentByDept.set(deptId, new Set());
      presentByDept.get(deptId)!.add(day.staffId);
    }
    if (day.status === 'absent' || day.status === 'missing_punch') {
      if (!absentByDept.has(deptId)) absentByDept.set(deptId, new Set());
      absentByDept.get(deptId)!.add(day.staffId);
    }
  }

  const leaveByDept = new Map<string, number>();
  for (const app of leaveApps) {
    const deptId = staffDeptLookup.get(app.staffId);
    if (!deptId) continue;
    leaveByDept.set(deptId, (leaveByDept.get(deptId) ?? 0) + (app.days || 0));
  }

  const otByDept = new Map<string, number>();
  for (const ot of otRows) {
    const deptId = staffDeptLookup.get(ot.staffId);
    if (!deptId) continue;
    otByDept.set(deptId, (otByDept.get(deptId) ?? 0) + (ot.hours || 0));
  }

  let rows: DepartmentReportRow[] = departments.map((dept, index) => {
    const staff = staffByDept.get(dept.id) ?? {
      total: 0,
      active: 0,
      inactive: 0
    };
    return {
      id: dept.id,
      code: displayCode(index),
      name: dept.name,
      institution: getInstitutionName(dept.institution),
      institutionId: dept.institution,
      departmentHead: '—',
      totalStaff: staff.total,
      activeStaff: staff.active,
      inactiveStaff: staff.inactive,
      vacancies: vacanciesByDept.get(dept.id) ?? 0,
      presentStaff: presentByDept.get(dept.id)?.size ?? 0,
      absentStaff: absentByDept.get(dept.id)?.size ?? 0,
      leaveCount: Math.round((leaveByDept.get(dept.id) ?? 0) * 10) / 10,
      totalOtHours: Math.round((otByDept.get(dept.id) ?? 0) * 10) / 10,
      payrollExpenditure: Math.round(payrollByDept.get(dept.id) ?? 0),
      status: dept.status === 1 ? 'active' : 'inactive'
    };
  });

  if (keyword) {
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(keyword) ||
        row.code.toLowerCase().includes(keyword) ||
        row.institution.toLowerCase().includes(keyword)
    );
  }

  const totalStaff = rows.reduce((sum, row) => sum + row.totalStaff, 0);
  const activeDepartments = rows.filter((r) => r.status === 'active').length;
  const departmentsWithVacancies = rows.filter((r) => r.vacancies > 0).length;
  const totalDepartmentPayroll = rows.reduce(
    (sum, row) => sum + row.payrollExpenditure,
    0
  );

  const cards: DepartmentReportCards = rows.length
    ? {
        totalDepartments: rows.length,
        totalStaff,
        activeDepartments,
        averageStaffPerDepartment:
          rows.length > 0
            ? Math.round((totalStaff / rows.length) * 10) / 10
            : 0,
        departmentsWithVacancies,
        totalDepartmentPayroll
      }
    : EMPTY_DEPARTMENT_REPORT_CARDS;

  const staffByDepartment: ReportChartPoint[] = rows
    .filter((r) => r.totalStaff > 0)
    .map((r) => ({ name: r.name, value: r.totalStaff }))
    .sort((a, b) => b.value - a.value);

  const payrollByDepartment: ReportChartPoint[] = rows
    .filter((r) => r.payrollExpenditure > 0)
    .map((r) => ({ name: r.name, value: r.payrollExpenditure }))
    .sort((a, b) => b.value - a.value);

  const totalRecords = rows.length;
  const start = (options.page - 1) * options.limit;
  const pagedRows = rows.slice(start, start + options.limit);

  const filterOptions = {
    institutions: [
      { id: '__all__', name: 'All Institutions' },
      ...INSTITUTION_OPTIONS
    ],
    departments: await loadDepartmentOptions(institutionFilter || undefined)
  };

  return {
    fromDate,
    toDate,
    periodLabel: `${fromDate} → ${toDate}`,
    cards,
    staffByDepartment,
    payrollByDepartment,
    rows: pagedRows,
    totalRecords,
    filterOptions
  };
}

export async function getDepartmentReport(
  params: GetDepartmentReportParams = {}
): Promise<{
  success: boolean;
  data?: DepartmentReportResult;
  error?: { message?: string };
}> {
  try {
    const data = await buildDepartmentReport(params, {
      page: parsePage(params.page),
      limit: parseLimit(params.limit, 10)
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('getDepartmentReport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load department report' }
    };
  }
}

export async function getDepartmentReportForExport(
  params: GetDepartmentReportParams = {}
): Promise<{
  success: boolean;
  data?: DepartmentReportExportRow[];
  totalRecords?: number;
  message?: string;
}> {
  try {
    const data = await buildDepartmentReport(params, {
      page: 1,
      limit: 10_000
    });

    if (!data.rows.length) {
      return { success: false, message: 'No department report found' };
    }

    return {
      success: true,
      totalRecords: data.rows.length,
      data: data.rows.map((row) => ({
        departmentCode: row.code,
        departmentName: row.name,
        institution: row.institution,
        departmentHead: row.departmentHead,
        totalStaff: row.totalStaff,
        activeStaff: row.activeStaff,
        inactiveStaff: row.inactiveStaff,
        vacancies: row.vacancies,
        presentStaff: row.presentStaff,
        absentStaff: row.absentStaff,
        leaveCount: row.leaveCount,
        totalOtHours: row.totalOtHours,
        payrollExpenditure: formatLkr(row.payrollExpenditure),
        status: row.status === 'active' ? 'Active' : 'Inactive'
      }))
    };
  } catch (error: any) {
    console.error('getDepartmentReportForExport error:', error);
    return {
      success: false,
      message: error.message || 'Failed to export department report'
    };
  }
}
