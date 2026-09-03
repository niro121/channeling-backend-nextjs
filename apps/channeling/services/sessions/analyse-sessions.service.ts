'use server';

import prisma from '@/lib/prisma';
import { normalizeSessionTime, parseSessionDateTime } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import orderBy from 'lodash/orderBy';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { resolveUsersHelper } from '@/lib/helpers/resolve-users.helper';
import { Fee, SessionInputData } from '@/types/sessions';


export interface AnalyseSessionsInput {
  fromDate: string;
  toDate: string;
  doctorId: string;
  update?: boolean;
  /** Logged-in user id for createdBy/updatedBy */
  userId?: string;
}

export interface AnalyseSessionsResult {
  status: boolean;
  error: string;
  data: any[];
  schedulesFound?: number;
  emptyReason?: string;
}

/**
 * Analyse doctor schedules for a date range and either create missing Session records
 * or update existing ones. Used by Analyse & Create, Update Only, and scripts.
 */
export async function analyseSessionsService(
  inputs: AnalyseSessionsInput
): Promise<AnalyseSessionsResult> {
  const result: AnalyseSessionsResult = {
    status: false,
    error: '',
    data: []
  };

  const data: any[] = [];
  const inputData: SessionInputData[] = [];

  try {
    const todayStr = moment().format('YYYY-MM-DD');
    if (inputs.fromDate < todayStr) {
      result.error = 'From date cannot be in the past.';
      return result;
    }
    if (inputs.toDate < todayStr) {
      result.error = 'To date cannot be in the past.';
      return result;
    }
    if (inputs.toDate < inputs.fromDate) {
      result.error = 'To date must be on or after from date.';
      return result;
    }

    const schedule = await prisma.doctorSession.findMany({
      where: {
        status: 1,
        doctorId: inputs.doctorId
      },
      orderBy: {
        dayType: 'asc'
      }
    });

    if (schedule && schedule.length > 0) {
      for (const item of schedule) {
        const timeString = moment(item.startTime).utcOffset(330).format('HH:mm');
        const endtimeString = moment(item.endTime).utcOffset(330).format('HH:mm');

        let isScan = false;
        if (item.fees && Array.isArray(item.fees)) {
          const scanfee = (item.fees as Fee[]).find(
            (fee: Fee) => fee.id === '3' || Number(fee.id) === 3
          );
          if (scanfee && (scanfee.localFee > 0 || scanfee.foreignFee > 0)) {
            isScan = true;
          }
        }

        // toDate is inclusive: use end of day so the full last day is included.
        // Parse as UTC date-only so the loop includes the last day in all server timezones.
        const rangeEnd = moment.utc(inputs.toDate, 'YYYY-MM-DD').endOf('day');
        const rangeEndDay = moment.utc(inputs.toDate, 'YYYY-MM-DD');

        for (
          let m = moment.utc(inputs.fromDate, 'YYYY-MM-DD').startOf('day');
          m.isSameOrBefore(rangeEndDay, 'day');
          m.add(1, 'days')
        ) {
          const compareToDate = m.format('YYYY-MM-DD');
          if (item.applyTo) {
            const applyToDate = moment(item.applyTo).format('YYYY-MM-DD');

            if (applyToDate === compareToDate && m.isSameOrBefore(rangeEnd)) {
              const dateStr = m.format('YYYY-MM-DD');
              const newStartTime = parseSessionDateTime(dateStr, timeString);
              const newEndTime = parseSessionDateTime(dateStr, endtimeString);

              inputData.push({
                date: dateStr,
                doctorSessionId: item.id,
                previousDoctorSession: item.previousSessionId || null,
                institution: item.institution,
                startTime: newStartTime,
                endTime: newEndTime,
                durationMinutes: item.durationMinutes,
                startingPatientNumber: item.startingPatientNumber,
                maxPatientNumber: item.maxPatientNumber,
                refundable: item.refundable,
                fees: item.fees,
                amountLocal: item.amountLocal ? Math.round(item.amountLocal) : null,
                amountForeign: item.amountForeign ? Math.round(item.amountForeign) : null,
                status: item.status,
                remarks: '',
                doctorId: item.doctorId || '',
                departmentId: item.departmentId || null,
                locationId: item.locationId || null,
                roomId: item.roomId || null,
                isScan
              });
            }
          } else {
            const dayOfWeek = m.utc().day();
            const expectedDayType = dayOfWeek === 0 ? 1 : dayOfWeek + 1;

            if (item.dayType === expectedDayType && m.isSameOrBefore(rangeEnd)) {
              const dateStr = m.format('YYYY-MM-DD');
              const newStartTime = parseSessionDateTime(dateStr, timeString);
              const newEndTime = parseSessionDateTime(dateStr, endtimeString);

              inputData.push({
                date: dateStr,
                doctorSessionId: item.id,
                previousDoctorSession: item.previousSessionId || null,
                institution: item.institution,
                startTime: newStartTime,
                endTime: newEndTime,
                durationMinutes: item.durationMinutes,
                startingPatientNumber: item.startingPatientNumber,
                maxPatientNumber: item.maxPatientNumber,
                refundable: item.refundable,
                fees: item.fees,
                amountLocal: item.amountLocal ? Math.round(item.amountLocal) : null,
                amountForeign: item.amountForeign ? Math.round(item.amountForeign) : null,
                status: item.status,
                remarks: '',
                doctorId: item.doctorId || '',
                departmentId: item.departmentId || null,
                locationId: item.locationId || null,
                roomId: item.roomId || null,
                isScan
              });
            }
          }
        }
      }

      if (inputData.length === 0) {
        const rangeStart = moment.utc(inputs.fromDate, 'YYYY-MM-DD').startOf('day').toDate();
        const rangeEnd = moment.utc(inputs.toDate, 'YYYY-MM-DD').endOf('day').toDate();

        const sessiondata = await prisma.session.findMany({
          where: {
            doctorId: inputs.doctorId,
            date: { gte: rangeStart, lte: rangeEnd }
          },
          include: { location: true, doctor: true }
        });

        const formattedData = sessiondata.map((item) => {
          const originalSession = schedule.find((s) => s.id === item.doctorSessionId);
          const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
          const startDate = normalizeSessionTime(item.startTime as Date | number, itemDate);
          const endDate = normalizeSessionTime(item.endTime as Date | number, itemDate);
          return {
            ...item,
            start: startDate,
            end: endDate,
            startTime: moment(startDate).format('LT'),
            endTime: moment(endDate).format('LT'),
            originalName: originalSession ? originalSession.name : '*** ORIGINAL SESSION DELETED ***',
            branch: item.location?.name || 'N/A'
          };
        });

        const sortedData = orderBy(formattedData, ['date', 'startTime'], ['asc']);
        const resolvedData = await resolveUsersHelper(sortedData);

        return {
          status: true,
          error: result.error,
          data: resolvedData,
          schedulesFound: schedule.length,
          emptyReason:
            resolvedData.length === 0
              ? 'Schedules found but no dates in range matched (check dayType and advancedBookingDays).'
              : undefined
        };
      }

      const sortedInputData = orderBy(inputData, [(v) => v.startTime.getTime()], ['asc']);

      // previousDoctorSession stores the previous DoctorSession (schedule) id, not a Session id,
      // so there is no Session→Session creation order dependency; batch create (e.g. createMany) is safe.
      if (inputs.update === false || !inputs.update) {
        const rangeStart = moment.utc(inputs.fromDate, 'YYYY-MM-DD').startOf('day').toDate();
        const rangeEnd = moment.utc(inputs.toDate, 'YYYY-MM-DD').endOf('day').toDate();

        const existingSessions = await prisma.session.findMany({
          where: {
            doctorId: inputs.doctorId,
            status: 1,
            date: { gte: rangeStart, lte: rangeEnd }
          },
          select: { date: true, doctorSessionId: true }
        });

        const existingKeySet = new Set(
          existingSessions.map((s) => `${moment(s.date).utc().format('YYYY-MM-DD')}_${s.doctorSessionId}`)
        );

        const toCreate = sortedInputData.filter(
          (v) => !existingKeySet.has(`${v.date}_${v.doctorSessionId}`)
        );

        if (toCreate.length > 0) {
          const createManyData: Prisma.SessionCreateManyInput[] = toCreate.map((v) => ({
            institution: v.institution,
            date: moment.utc(v.date, 'YYYY-MM-DD').startOf('day').toDate(),
            doctorSessionId: v.doctorSessionId,
            previousDoctorSession: v.previousDoctorSession,
            startTime: v.startTime instanceof Date ? v.startTime : new Date(v.startTime),
            endTime: v.endTime instanceof Date ? v.endTime : new Date(v.endTime),
            durationMinutes: v.durationMinutes,
            startingPatientNumber: v.startingPatientNumber,
            maxPatientNumber: v.maxPatientNumber,
            refundable: v.refundable,
            fees: (v.fees ?? {}) as Prisma.InputJsonValue,
            amountLocal: v.amountLocal ?? undefined,
            amountForeign: v.amountForeign ?? undefined,
            status: v.status ?? 1,
            remarks: v.remarks,
            isScan: v.isScan,
            doctorId: v.doctorId,
            departmentId: v.departmentId,
            locationId: v.locationId,
            roomId: v.roomId,
            ...(inputs.userId ? { createdBy: inputs.userId, updatedBy: inputs.userId } : {})
          }));

          await prisma.session.createMany({
            data: createManyData
          });

          if (inputs.userId) {
            logActivityNonBlocking({
              userId: inputs.userId,
              action: 'session.created.bulk',
              entityType: 'Session',
              entityId: inputs.doctorId,
              metadata: {
                doctorId: inputs.doctorId,
                fromDate: inputs.fromDate,
                toDate: inputs.toDate,
                count: toCreate.length,
              },
            });
          }
        }
      } else {
        for (const value of sortedInputData) {
          const sessionDate = moment.utc(value.date, 'YYYY-MM-DD').startOf('day').toDate();

          const updatedSession = await prisma.session.updateMany({
            where: {
              date: sessionDate,
              doctorSessionId: value.doctorSessionId
            },
            data: {
              institution: value.institution,
              previousDoctorSession: value.previousDoctorSession,
              startTime: value.startTime,
              endTime: value.endTime,
              durationMinutes: value.durationMinutes,
              startingPatientNumber: value.startingPatientNumber,
              maxPatientNumber: value.maxPatientNumber,
              refundable: value.refundable,
              fees: value.fees,
              amountLocal: value.amountLocal,
              amountForeign: value.amountForeign,
              remarks: value.remarks,
              isScan: value.isScan,
              doctorId: value.doctorId,
              departmentId: value.departmentId,
              locationId: value.locationId,
              roomId: value.roomId,
              ...(inputs.userId ? { updatedBy: inputs.userId } : {})
            }
          });

          if (updatedSession.count > 0) {
            const session = await prisma.session.findFirst({
              where: { date: sessionDate, doctorSessionId: value.doctorSessionId },
              include: { location: true, doctor: true }
            });

            if (session) {
              if (inputs.userId) {
                logActivityNonBlocking({
                  userId: inputs.userId,
                  action: 'session.updated',
                  entityType: 'Session',
                  entityId: session.id,
                  metadata: {
                    sessionId: session.id,
                    doctorId: session.doctorId,
                    doctorName: session.doctor?.name ?? null,
                    sessionDate: session.date instanceof Date ? session.date.toISOString() : String(session.date),
                    locationName: session.location?.name ?? null,
                  },
                });
              }
              const sessionDateObj = session.date instanceof Date ? session.date : new Date(session.date);
              const startDate = normalizeSessionTime(session.startTime as Date | number, sessionDateObj);
              const endDate = normalizeSessionTime(session.endTime as Date | number, sessionDateObj);
              const formattedSession = {
                ...session,
                new: false,
                start: startDate,
                end: endDate,
                startTime: moment(startDate).format('LT'),
                endTime: moment(endDate).format('LT')
              };
              data.push(formattedSession);
            }
          }
        }
      }

      const rangeStart = moment.utc(inputs.fromDate, 'YYYY-MM-DD').startOf('day').toDate();
      const rangeEnd = moment.utc(inputs.toDate, 'YYYY-MM-DD').endOf('day').toDate();

      const sessiondata = await prisma.session.findMany({
        where: {
          doctorId: inputs.doctorId,
          date: { gte: rangeStart, lte: rangeEnd }
        },
        include: { location: true, doctor: true }
      });

      const formattedData = sessiondata.map((item) => {
        const originalSession = schedule.find((s) => s.id === item.doctorSessionId);
        const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
        const startDate = normalizeSessionTime(item.startTime as Date | number, itemDate);
        const endDate = normalizeSessionTime(item.endTime as Date | number, itemDate);
        return {
          ...item,
          start: startDate,
          end: endDate,
          startTime: moment(startDate).format('LT'),
          endTime: moment(endDate).format('LT'),
          originalName: originalSession ? originalSession.name : '*** ORIGINAL SESSION DELETED ***',
          branch: item.location?.name || 'N/A'
        };
      });

      const sortedData = orderBy(formattedData, ['date', 'startTime'], ['asc']);
      const resolvedData = await resolveUsersHelper(sortedData);

      return {
        status: true,
        error: result.error,
        data: resolvedData,
        schedulesFound: schedule.length
      };
    } else {
      const rangeStart = moment.utc(inputs.fromDate, 'YYYY-MM-DD').startOf('day').toDate();
      const rangeEnd = moment.utc(inputs.toDate, 'YYYY-MM-DD').endOf('day').toDate();

      const sessiondata = await prisma.session.findMany({
        where: {
          doctorId: inputs.doctorId,
          date: { gte: rangeStart, lte: rangeEnd }
        },
        include: { location: true, doctor: true }
      });

      const formattedData = sessiondata.map((item) => {
        const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
        const startDate = normalizeSessionTime(item.startTime as Date | number, itemDate);
        const endDate = normalizeSessionTime(item.endTime as Date | number, itemDate);
        return {
          ...item,
          start: startDate,
          end: endDate,
          startTime: moment(startDate).format('LT'),
          endTime: moment(endDate).format('LT'),
          originalName: '*** ORIGINAL SESSION DELETED ***',
          branch: item.location?.name || 'N/A'
        };
      });

      const sortedData = orderBy(formattedData, ['date', 'startTime'], ['asc']);
      const resolvedData = await resolveUsersHelper(sortedData);

      return {
        status: true,
        error: result.error,
        data: resolvedData,
        schedulesFound: 0,
        emptyReason:
          resolvedData.length === 0
            ? 'No doctor schedules (DoctorSession) found. Add schedules for this doctor first.'
            : undefined
      };
    }
  } catch (error: any) {
    console.error('analyseSessionsService error:', error);
    result.error = error.message || 'An error occurred';
    return result;
  }
}
