/**
 * In-app notification center types.
 * Used for float approvals/rejections, handover approvals/rejections, and future notification types.
 */

export const NOTIFICATION_TYPES = {
  FloatApproved: 'float_approved',
  FloatRejected: 'float_rejected',
  HandoverApproved: 'handover_approved',
  HandoverRejected: 'handover_rejected',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const REFERENCE_TYPES = {
  FloatRequest: 'FloatRequest',
  ShiftHandover: 'ShiftHandover',
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
