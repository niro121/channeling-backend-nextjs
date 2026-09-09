/**
 * In-app notification center types.
 * Used for float and handover submit/approve/reject, and reconciliation assignment.
 */

export const NOTIFICATION_TYPES = {
  FloatRequested: 'float_requested',
  FloatApproved: 'float_approved',
  FloatRejected: 'float_rejected',
  FloatCancelled: 'float_cancelled',
  HandoverSubmitted: 'handover_submitted',
  HandoverApproved: 'handover_approved',
  HandoverRejected: 'handover_rejected',
  HandoverCancelled: 'handover_cancelled',
  ReconciliationAssigned: 'reconciliation_assigned',
  ApprovalRequested: 'approval_requested',
  ApprovalApproved: 'approval_approved',
  ApprovalRejected: 'approval_rejected',
  ApprovalWithdrawn: 'approval_withdrawn',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const REFERENCE_TYPES = {
  FloatRequest: 'FloatRequest',
  ShiftHandover: 'ShiftHandover',
  ApprovalRequest: 'ApprovalRequest',
} as const;

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  referenceType: string | null;
  referenceId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationCreateInput = {
  userId: string;
  type: string;
  title: string;
  message?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
};
