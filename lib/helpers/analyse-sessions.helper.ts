'use server';

import prisma from '@/lib/prisma';
import moment from 'moment';
import orderBy from 'lodash.orderby';
import { resolveUsersHelper } from './resolve-users.helper';

interface AnalyseSessionsInputs {
  from_date: string;
  toDate: string;
  doctorId: string;
  update?: boolean;
}

interface AnalyseSessionsResult {
  status: boolean;
  error: string;
  data: any[];
}

type SessionStatus = "ACTIVE" | "LEAVE"

interface SessionInputData {
  date: string;
  doctorSessionId: string;
  previousDoctorSession: string | null;
  institution: number;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  durationMinutes: number | null;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number;
  fees: any;
  amountLocal: number | null;
  amountForeign: number | null;
  status: SessionStatus;
  remarks: string;
  doctor: string;
  department: string | null;
  location: string | null;
  room: string | null;
  isScan: boolean;
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
    // Get all locations (branches)
    const branchList = await prisma.location.findMany({
      where: {
        status: 1 // Only active locations
      }
    });

    // Get Doctor Sessions (schedules)
    const schedule = await prisma.doctorSession.findMany({
      where: {
        doctorId: inputs.doctorId
      },
      orderBy: {
        dayType: 'asc'
      }
    });

    if (schedule && schedule.length > 0) {
      for (const item of schedule) {
        const timeString = moment(item.startTime).format('HH:mm');
        const endtimeString = moment(item.endTime).format('HH:mm');

        let isScan = false;

        // Check if scan fee exists (fee with id: 3)
        if (item.fees && Array.isArray(item.fees)) {
          const scanfee = (item.fees as any[]).find(
            (fee: any) => fee.id === '3' || fee.id === 3
          ); // {id: '3', name: 'Scan Fee', feeType: 'Service',}

          if (
            scanfee &&
            (scanfee.local_value > 0 || scanfee.foreign_value > 0)
          ) {
            isScan = true;
          }
        }

        // Calculate end date based on advanced booking days
        const end = moment();
        end.add(item.advancedBookingDays, 'days');

        // Iterate through date range
        for (
          let m = moment(inputs.from_date);
          m.diff(inputs.toDate, 'days') <= 0;
          m.add(1, 'days')
        ) {
          if (item.applyTo) {
            // CHECK SPECIFIC DATE
            const apply_to_date = moment(item.applyTo).format('YYYY-MM-DD');
            const compare_to_date = m.format('YYYY-MM-DD');

            if (apply_to_date === compare_to_date && m.isSameOrBefore(end)) {
              const newstarttime = moment(
                m.format('YYYY-MM-DD') + ' ' + timeString,
                'YYYY-MM-DD HH:mm'
              ).unix();
              const newendtime = moment(
                m.format('YYYY-MM-DD') + ' ' + endtimeString,
                'YYYY-MM-DD HH:mm'
              ).unix();

              inputData.push({
                date: m.format('YYYY-MM-DD'),
                doctorSessionId: item.id,
                previousDoctorSession: item.previousSessionId || null,
                institution: item.institution,
                startTime: newstarttime,
                endTime: newendtime,
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
                status: item.status === 1 ? "ACTIVE" : item.status === 0 ? "LEAVE" : "LEAVE",
                remarks: '',
                doctor: item.doctorId || '',
                department: item.departmentId || null,
                location: item.locationId || null,
                room: item.roomId || null,
                isScan: isScan
              });
            }
          } else {
            // FILTER BY DAY : CHECK DAY
            // moment.js: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            // dayType: 1 = Sunday, 2 = Monday, ..., 7 = Saturday, 8 = Specific day
            const dayOfWeek = m.day(); // 0-6
            const expectedDayType = dayOfWeek === 0 ? 1 : dayOfWeek + 1; // Convert to 1-7

            if (item.dayType === expectedDayType && m.isSameOrBefore(end)) {
              const newstarttime = moment(
                m.format('YYYY-MM-DD') + ' ' + timeString,
                'YYYY-MM-DD HH:mm'
              ).unix();
              const newendtime = moment(
                m.format('YYYY-MM-DD') + ' ' + endtimeString,
                'YYYY-MM-DD HH:mm'
              ).unix();

              inputData.push({
                date: m.format('YYYY-MM-DD'),
                doctorSessionId: item.id,
                previousDoctorSession: item.previousSessionId || null,
                institution: item.institution,
                startTime: newstarttime,
                endTime: newendtime,
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
                status: item.status === 1 ? "ACTIVE" : item.status === 0 ? "LEAVE" : "LEAVE",
                remarks: '',
                doctor: item.doctorId || '',
                department: item.departmentId || null,
                location: item.locationId || null,
                room: item.roomId || null,
                isScan: isScan
              });
            }
          }
        } // DATE BY DATE
      }

      // IF EMPTY INPUTS
      if (inputData.length === 0) {
        const getStartTime = moment(inputs.from_date).unix();
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
            original_name: originalSession
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

        // Resolve users
        const resolvedData = await resolveUsersHelper(sortedData);

        return {
          status: true,
          error: result.error,
          data: resolvedData
        };
      }

      // SORT THE DATA
      const sortedInputData = orderBy(inputData, ['startTime'], ['asc']);

      // START OF SESSION CREATE
      if (inputs.update === false || !inputs.update) {
        // Create or find existing sessions
        for (const value of sortedInputData) {
          const sessionDate = moment(value.date).toDate();
          const startTimeDate = moment.unix(value.startTime).toDate();
          const endTimeDate = moment.unix(value.endTime).toDate();

          // Check if session already exists
          const existingSession = await prisma.session.findFirst({
            where: {
              date: sessionDate,
              doctorSessionId: value.doctorSessionId
            }
          });

          if (existingSession) {
            // Session exists, format it
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
            // Create new session
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
                status: 'ACTIVE',
                remarks: value.remarks,
                isScan: value.isScan,
                doctorId: value.doctor,
                departmentId: value.department,
                locationId: value.location,
                roomId: value.room
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
        // UPDATE MODE
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
              doctorId: value.doctor,
              departmentId: value.department,
              locationId: value.location,
              roomId: value.room
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

      // After creating/updating, fetch all sessions in the date range
      const getStartTime = moment(inputs.from_date).unix();
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
          original_name: originalSession
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

      // Resolve users
      const resolvedData = await resolveUsersHelper(sortedData);

      return {
        status: true,
        error: result.error,
        data: resolvedData
      };
    } else {
      // No schedule found, return existing sessions
      const getStartTime = moment(inputs.from_date).unix();
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
          original_name: '*** ORIGINAL SESSION DELETED ***',
          branch: item.location?.name || 'N/A'
        };
      });

      const sortedData = orderBy(
        formattedData,
        ['date', 'startTime'],
        ['asc']
      );

      // Resolve users
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

