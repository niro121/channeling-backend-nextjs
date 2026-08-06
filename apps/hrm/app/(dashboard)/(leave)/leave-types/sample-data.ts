import type { LeaveTypeRecord } from './columns';

/** Temporary sample rows until leave-type actions/services are wired. */
export const sampleLeaveTypes: LeaveTypeRecord[] = [
  {
    id: 'lt-1',
    code: 'AL',
    name: 'Annual Leave',
    description: 'Annual paid leave',
    status: 1,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    carryForwardAllowed: true,
    maxDaysPerYear: 14,
    maxCarryForwardDays: 5,
    createdAt: '2026-01-01T09:00:00',
    updatedAt: '2026-08-01T10:30:00',
    createdUser: { name: 'Admin' },
    updatedUser: { name: 'Admin' }
  },
  {
    id: 'lt-2',
    code: 'CL',
    name: 'Casual Leave',
    description: 'Casual leave',
    status: 1,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    carryForwardAllowed: false,
    maxDaysPerYear: 7,
    maxCarryForwardDays: 0,
    createdAt: '2026-01-03T09:00:00',
    updatedAt: '2026-07-20T13:15:00',
    createdUser: { name: 'N. Silva' },
    updatedUser: { name: 'K. Fernando' }
  },
  {
    id: 'lt-3',
    code: 'ML',
    name: 'Medical Leave',
    description: 'Medical leave',
    status: 1,
    isPaid: true,
    requiresApproval: false,
    allowHalfDay: false,
    carryForwardAllowed: false,
    maxDaysPerYear: 10,
    maxCarryForwardDays: 0,
    createdAt: '2026-01-05T09:30:00',
    updatedAt: '2026-06-30T16:05:00',
    createdUser: { name: 'Admin' },
    updatedUser: { name: 'N. Silva' }
  },
  {
    id: 'lt-4',
    code: 'UL',
    name: 'Unpaid Leave',
    description: 'No-pay leave',
    status: 1,
    isPaid: false,
    requiresApproval: true,
    allowHalfDay: false,
    carryForwardAllowed: false,
    maxDaysPerYear: 30,
    maxCarryForwardDays: 0,
    createdAt: '2026-02-10T11:20:00',
    updatedAt: '2026-08-03T09:10:00',
    createdUser: { name: 'Admin' },
    updatedUser: { name: 'Admin' }
  },
  {
    id: 'lt-5',
    code: 'SL',
    name: 'Special Leave',
    description: 'Special event leave',
    status: 0,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    carryForwardAllowed: true,
    maxDaysPerYear: 3,
    maxCarryForwardDays: 1,
    createdAt: '2026-03-15T08:45:00',
    updatedAt: '2026-04-25T14:30:00',
    createdUser: { name: 'K. Fernando' },
    updatedUser: { name: 'K. Fernando' }
  }
];

export function getSampleLeaveTypeById(id: string): LeaveTypeRecord | undefined {
  return sampleLeaveTypes.find((row) => row.id === id);
}
