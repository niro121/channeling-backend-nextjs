'use server';

import prisma from '@/lib/prisma';
import moment from 'moment';
import orderBy from 'lodash.orderby';
import { resolveUsersHelper } from './resolve-users.helper';
import { DoctorSession, DoctorSessionFormValues } from '@/types/doctor.session';

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
}

type SessionStatus = 'ACTIVE' | 'LEAVE';

type Fee = {
  id: string;
  name: string;
  feeType: string;
  localFee: number;
  foreignFee: number;
};

interface SessionInputData {
  institution: number;
  date: string;
  doctorSessionId: string;
  previousDoctorSession: string | null;
  startTime: Date;
  endTime: Date;
  durationMinutes: number | null;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number;
  fees: any;
  amountLocal: number | null;
  amountForeign: number | null;
  status: number // == 1: active, 0: leave == //;
  remarks: string;
  isScan: boolean;
  doctorId: string;
  departmentId: string | null;
  locationId: string | null;
  roomId: string | null;
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
        const timeString = moment(item.startTime).format('HH:mm'); // == SCHEDULE START TIME == //
        const endtimeString = moment(item.endTime).format('HH:mm'); // == SCHEDULE END TIME == //

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

        // == CALCULATE END DATE BASED ON ADVANCED BOOKING DAY COUNT == //
        const end = moment();
        end.add(item.advancedBookingDays, 'days');

        // == ITERATE THRU DATE RANGE == //
        for (
          let m = moment(inputs.fromDate);
          m.diff(inputs.toDate, 'days') <= 0;
          m.add(1, 'days')
        ) {
          if (item.applyTo) {
            // == CHECK SPECIFIC DATE: 8 = Specific day == //
            const applyToDate = moment(item.applyTo).format('YYYY-MM-DD');
            const compareToDate = m.format('YYYY-MM-DD');

            if (applyToDate === compareToDate && m.isSameOrBefore(end)) {
              const newStartTime = moment(
                m.format('YYYY-MM-DD') + ' ' + timeString,
                'YYYY-MM-DD HH:mm'
              );
              const newEndTime = moment(
                m.format('YYYY-MM-DD') + ' ' + endtimeString,
                'YYYY-MM-DD HH:mm'
              );

              inputData.push({
                date: m.format('YYYY-MM-DD'),
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
            // ==== FILTER BY DAY : CHECK DAY ==== //
            // == MOMENT.JS: 0 = SUNDAY, 1 = MONDAY, ..., 6 = SATURDAY == //
            // == dayType(doctorSession Model): 1 = Sunday, 2 = Monday, ..., 7 = Saturday, 8 = Specific day
            const dayOfWeek = m.day(); // == 0-6 == //
            const expectedDayType = dayOfWeek === 0 ? 1 : dayOfWeek + 1; // == CONVERT TO 1-7 == //

            if (item.dayType === expectedDayType && m.isSameOrBefore(end)) {
              const newStartTime = moment(
                m.format('YYYY-MM-DD') + ' ' + timeString,
                'YYYY-MM-DD HH:mm'
              ).unix();
              const newEndTime = moment(
                m.format('YYYY-MM-DD') + ' ' + endtimeString,
                'YYYY-MM-DD HH:mm'
              ).unix();

              inputData.push({
                date: m.format('YYYY-MM-DD'),
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
        const getStartTime = moment(inputs.fromDate);
        const endEndTime = moment(inputs.toDate).endOf('day');

        const sessiondata = await prisma.session.findMany({
          where: {,
            doctorId: inputs.doctorId,
            startTime: {
              gte: new Date(getStartTime * 1000),
              lte: new Date(endEndTime * 1000)
            }
          },
          include: {
            location: true,
            doctor: true
          }
        });

        const formattedData = sessiondata.map((item) => {
          const sessionDate = moment(item.startTime);
          const originalSession = schedule.find(
            (s) => s.id === item.doctorSessionId
          );

          return {
            ...item,
            start: item.startTime,
            end: item.endTime,
            startTime: moment(item.startTime).format('LT'),
            endTime: moment(item.endTime).format('LT'),
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
          data: resolvedData
        };
      }

      // ==== SORT THE DATA ==== //
      const sortedInputData = orderBy(inputData, ['startTime'], ['asc']);

      // ==== START OF SESSION CREATION ==== //
      if (inputs.update === false || !inputs.update) {
        // == CREATE OR FIND EXISTING SESSIONS == //
        for (const value of sortedInputData) {
          const sessionDate = moment(value.date).toDate();
          const startTimeDate = moment.unix(value.startTime).toDate();
          const endTimeDate = moment.unix(value.endTime).toDate();

          // == CHECK IF SESSION IS ALREADY EXISTS == //
          const existingSession = await prisma.session.findFirst({
            where: {
              date: sessionDate,
              doctorSessionId: value.doctorSessionId
            }
          });

          if (existingSession) {
            // == SESSION EXISTS FORMAT IT == //
            const formattedSession = {
              ...existingSession,
              new: false,
              start: existingSession.startTime,
              end: existingSession.endTime,
              startTime: moment(existingSession.startTime).format('LT'),
              endTime: moment(existingSession.endTime).format('LT')
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
                startTime: startTimeDate,
                endTime: endTimeDate,
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
              start: newSession.startTime,
              end: newSession.endTime,
              startTime: moment(newSession.startTime).format('LT'),
              endTime: moment(newSession.endTime).format('LT')
            };
            data.push(formattedSession);
          }
        }
      } else {
        // ==== UPDATE MODE ==== /
        for (const value of sortedInputData) {
          const sessionDate = moment(value.date).toDate();
          const startTimeDate = moment.unix(value.startTime).toDate();
          const endTimeDate = moment.unix(value.endTime).toDate();

          const updatedSession = await prisma.session.updateMany({
            where: {
              date: sessionDate,
              doctorSessionId: value.doctorSessionId
            },
            data: {
              institution: value.institution,
              previousDoctorSession: value.previousDoctorSession,
              startTime: startTimeDate,
              endTime: endTimeDate,
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
                start: session.startTime,
                end: session.endTime,
                startTime: moment(session.startTime).format('LT'),
                endTime: moment(session.endTime).format('LT')
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
            gte: new Date(getStartTime * 1000),
            lte: new Date(endEndTime * 1000)
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
          start: item.startTime,
          end: item.endTime,
          startTime: moment(item.startTime).format('LT'),
          endTime: moment(item.endTime).format('LT'),
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
        data: resolvedData
      };
    } else {
      // ==== NO SCHEDULED FOUND: RETURN EXISTING SESSIONS ==== //
      const getStartTime = moment(inputs.fromDate).unix();
      const endEndTime = moment(inputs.toDate).endOf('day').unix();

      const sessiondata = await prisma.session.findMany({
        where: {
          doctorId: inputs.doctorId,
          startTime: {
            gte: new Date(getStartTime * 1000),
            lte: new Date(endEndTime * 1000)
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
          start: item.startTime,
          end: item.endTime,
          startTime: moment(item.startTime).format('LT'),
          endTime: moment(item.endTime).format('LT'),
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
        data: resolvedData
      };
    }
  } catch (error: any) {
    console.error('analyseSessions error:', error);
    result.error = error.message || 'An error occurred';
    return result;
  }
}
