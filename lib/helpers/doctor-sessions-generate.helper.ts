"use server"

import prisma from '@/lib/prisma';
import moment from 'moment';
import orderBy from 'lodash/orderBy';
import { resolveUsersHelper } from '@/lib/helpers/resolve-users.helper';
import { Fee, SessionInputData } from '@/types/sessions';

/** Parse "YYYY-MM-DD HH:mm" as Sri Lanka time and return unix seconds. */
function parseSriLankaToUnix(dateStr: string, timeStr: string): number {
  const iso = `${dateStr}T${timeStr}:00+05:30`;
  return Math.floor(new Date(iso).getTime() / 1000);
}

interface AnalyseSessionsInputs {
  fromDate: string;
  toDate: string;
  doctorId: string;
  update?: boolean;
}

interface AnalyseSessionsResult {
  status: boolean;
  error: string;
  data: any[];
  /** Number of DoctorSession (schedule) records found for this doctor */
  schedulesFound?: number;
  /** When data is empty, reason for scripts/diagnostics */
  emptyReason?: string;
}

export async function analyseSessionsHelper(
  inputs: AnalyseSessionsInputs
): Promise<AnalyseSessionsResult> {
  const result: AnalyseSessionsResult = {
    status: false,
    error: '',
    data: []
  };

  const data: any[] = [];
  const inputData: SessionInputData[] = [];

  try {
    // ==== GET ALL LOCATIONS(BRANCHES) ==== //
    const branchList = await prisma.location.findMany({
      where: {
        status: 1
      }
    });

    // ==== GET ALL DOCTOR SESSIONS(SCHEDULES) ==== //
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
        // Template times are stored as UTC; interpret as Sri Lanka clock time for generation
        const timeString = moment(item.startTime).utcOffset(330).format('HH:mm');
        const endtimeString = moment(item.endTime).utcOffset(330).format('HH:mm');

        let isScan = false; // == SCAN FEE STATUS == //

        // == CHECK IF SCAN FEE EXITS (FEE WITH id: 3) == //
        if (item.fees && Array.isArray(item.fees)) {

          const scanfee = (item.fees as Fee[]).find(
            (fee: Fee) => fee.id === '3' || Number(fee.id) === 3
          ); // == {id: '3', name: 'Scan Fee', feeType: 'Service',} == //

          if (scanfee && (scanfee.localFee > 0 || scanfee.foreignFee > 0)) {

            isScan = true;
          }
        }

        // == USE FULL DATE RANGE FOR GENERATION (toDate), NOT JUST advancedBookingDays == //
        const rangeEnd = moment(inputs.toDate).endOf('day');

        // == ITERATE THRU DATE RANGE (use UTC so dayType matches stored calendar date) == //
        for (
          let m = moment.utc(inputs.fromDate).startOf('day');
          m.isSameOrBefore(inputs.toDate, 'day');
          m.add(1, 'days')
        ) {
          if (item.applyTo) {
            // == CHECK SPECIFIC DATE: 8 = Specific day == //
            const applyToDate = moment(item.applyTo).format('YYYY-MM-DD');
            const compareToDate = m.format('YYYY-MM-DD');

            if (applyToDate === compareToDate && m.isSameOrBefore(rangeEnd)) {
              const dateStr = m.format('YYYY-MM-DD');
              const newStartTime = parseSriLankaToUnix(dateStr, timeString);
              const newEndTime = parseSriLankaToUnix(dateStr, endtimeString);

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
                amountLocal: item.amountLocal
                  ? Math.round(item.amountLocal)
                  : null,
                amountForeign: item.amountForeign
                  ? Math.round(item.amountForeign)
                  : null,
                status: item.status ,
                remarks: '',
                doctorId: item.doctorId || '',
                departmentId: item.departmentId || null,
                locationId: item.locationId || null,
                roomId: item.roomId || null,
                isScan: isScan
              });
            }
          } else {
            // ==== FILTER BY DAY : CHECK DAY (m is UTC so day matches stored date) ==== //
            // == MOMENT.JS: 0 = SUNDAY, 1 = MONDAY, ..., 6 = SATURDAY == //
            // == dayType(doctorSession Model): 1 = Sunday, 2 = Monday, ..., 7 = Saturday, 8 = Specific day
            const dayOfWeek = m.utc().day(); // == 0-6 in UTC == //
            const expectedDayType = dayOfWeek === 0 ? 1 : dayOfWeek + 1; // == CONVERT TO 1-7 == //

            if (item.dayType === expectedDayType && m.isSameOrBefore(rangeEnd)) {
              const dateStr = m.format('YYYY-MM-DD');
              const newStartTime = parseSriLankaToUnix(dateStr, timeString);
              const newEndTime = parseSriLankaToUnix(dateStr, endtimeString);

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
                amountLocal: item.amountLocal
                  ? Math.round(item.amountLocal)
                  : null,
                amountForeign: item.amountForeign
                  ? Math.round(item.amountForeign)
                  : null,
                status: item.status ,
                remarks: '',
                doctorId: item.doctorId || '',
                departmentId: item.departmentId || null,
                locationId: item.locationId || null,
                roomId: item.roomId || null,
                isScan: isScan
              });
            }
          }
        } // == DATE BY DATE == //
      }

      // ==== IF EMPTY INPUTS ==== //
      if (inputData.length === 0) {
        const getStartTime = moment(inputs.fromDate).unix();
        const endEndTime = moment(inputs.toDate).endOf('day').unix();

        const sessiondata = await prisma.session.findMany({
          where: {
            doctorId: inputs.doctorId,
            startTime: {
              gte: getStartTime,
              lte: endEndTime
            }
          },
          include: {
            location: true,
            doctor: true
          }
        });

      const formattedData = sessiondata.map((item) => {
        const originalSession = schedule.find(
          (s) => s.id === item.doctorSessionId
        );

        return {
          ...item,
          start: moment.unix(item.startTime).toDate(),
          end: moment.unix(item.endTime).toDate(),
          startTime: moment.unix(item.startTime).format('LT'),
          endTime: moment.unix(item.endTime).format('LT'),
          originalName: originalSession
            ? originalSession.name
            : '*** ORIGINAL SESSION DELETED ***',
          branch: item.location?.name || 'N/A'
        };
      });

        const sortedData = orderBy(
          formattedData,
          ['date', 'startTime'],
          ['asc']
        );

        // == RESOLVE USERS == //
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

      // ==== SORT THE DATA ==== //
      const sortedInputData = orderBy(inputData, ['startTime'], ['asc']);

      // ==== START OF SESSION CREATION ==== //
      if (inputs.update === false || !inputs.update) {
        // == CREATE OR FIND EXISTING SESSIONS == //
        for (const value of sortedInputData) {
          // == USE UTC MIDNIGHT SO STORED DATE MATCHES CALENDAR DAY (e.g. MONDAY = 2026-02-09T00:00:00.000Z) == //
          const sessionDate = moment.utc(value.date, 'YYYY-MM-DD').startOf('day').toDate();

          // == CHECK IF ACTIVE SESSION ALREADY EXISTS (status: 1) SO RE-RUN AFTER DELETE CREATES NEW ONES == //
          const existingSession = await prisma.session.findFirst({
            where: {
              date: sessionDate,
              doctorSessionId: value.doctorSessionId,
              status: 1
            }
          });

          if (existingSession) {
            // == SESSION EXISTS FORMAT IT == //
            const formattedSession = {
              ...existingSession,
              new: false,
              start: moment.unix(existingSession.startTime).toDate(),
              end: moment.unix(existingSession.endTime).toDate(),
              startTime: moment.unix(existingSession.startTime).format('LT'),
              endTime: moment.unix(existingSession.endTime).format('LT')
            };
            data.push(formattedSession);
          } else {
            // == CREATE NEW SESSION == //
            const newSession = await prisma.session.create({
              data: {
                institution: value.institution,
                date: sessionDate,
                doctorSessionId: value.doctorSessionId,
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
                status: value.status ?? 1,
                remarks: value.remarks,
                isScan: value.isScan,
                doctorId: value.doctorId,
                departmentId: value.departmentId,
                locationId: value.locationId,
                roomId: value.roomId
              },
              include: {
                location: true,
                doctor: true
              }
            });

            const formattedSession = {
              ...newSession,
              new: true,
              start: moment.unix(newSession.startTime).toDate(),
              end: moment.unix(newSession.endTime).toDate(),
              startTime: moment.unix(newSession.startTime).format('LT'),
              endTime: moment.unix(newSession.endTime).format('LT')
            };
            data.push(formattedSession);
          }
        }
      } else {
        // ==== UPDATE MODE ==== /
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
              roomId: value.roomId
            }
          });

          if (updatedSession.count > 0) {
            const session = await prisma.session.findFirst({
              where: {
                date: sessionDate,
                doctorSessionId: value.doctorSessionId
              },
              include: {
                location: true,
                doctor: true
              }
            });

            if (session) {
              const formattedSession = {
                ...session,
                new: false,
                start: moment.unix(session.startTime).toDate(),
                end: moment.unix(session.endTime).toDate(),
                startTime: moment.unix(session.startTime).format('LT'),
                endTime: moment.unix(session.endTime).format('LT')
              };
              data.push(formattedSession);
            }
          }
        }
      }

      // ==== AFTER CREATING AND UPDATING: FETCH ALL THE SESSIONS IN DATE RANGE ==== //
      const getStartTime = moment(inputs.fromDate).unix();
      const endEndTime = moment(inputs.toDate).endOf('day').unix();

      const sessiondata = await prisma.session.findMany({
        where: {
          doctorId: inputs.doctorId,
          startTime: {
            gte: getStartTime,
            lte: endEndTime
          }
        },
        include: {
          location: true,
          doctor: true
        }
      });

      const formattedData = sessiondata.map((item) => {
        const originalSession = schedule.find(
          (s) => s.id === item.doctorSessionId
        );

        return {
          ...item,
          start: moment.unix(item.startTime).toDate(),
          end: moment.unix(item.endTime).toDate(),
          startTime: moment.unix(item.startTime).format('LT'),
          endTime: moment.unix(item.endTime).format('LT'),
          originalName: originalSession
            ? originalSession.name
            : '*** ORIGINAL SESSION DELETED ***',
          branch: item.location?.name || 'N/A'
        };
      });

      const sortedData = orderBy(formattedData, ['date', 'startTime'], ['asc']);

      // == RESOLVE USERS == //
      const resolvedData = await resolveUsersHelper(sortedData);

      return {
        status: true,
        error: result.error,
        data: resolvedData,
        schedulesFound: schedule.length
      };
    } else {
      // ==== NO SCHEDULED FOUND: RETURN EXISTING SESSIONS ==== //
      const getStartTime = moment(inputs.fromDate).unix();
      const endEndTime = moment(inputs.toDate).endOf('day').unix();

      const sessiondata = await prisma.session.findMany({
        where: {
          doctorId: inputs.doctorId,
          startTime: {
            gte: getStartTime,
            lte: endEndTime
          }
        },
        include: {
          location: true,
          doctor: true
        }
      });

      const formattedData = sessiondata.map((item) => {
        return {
          ...item,
          start: moment.unix(item.startTime).toDate(),
          end: moment.unix(item.endTime).toDate(),
          startTime: moment.unix(item.startTime).format('LT'),
          endTime: moment.unix(item.endTime).format('LT'),
          originalName: '*** ORIGINAL SESSION DELETED ***',
          branch: item.location?.name || 'N/A'
        };
      });

      const sortedData = orderBy(formattedData, ['date', 'startTime'], ['asc']);

      // == RESOLVE USERS == //
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
    console.error('analyseSessions error:', error);
    result.error = error.message || 'An error occurred';
    return result;
  }
}