// ==== IN-ROOM REQUESTS (patients ask through in-room Ayu; GROs handle them) ==== //
// The management app keeps a copy in apps/management/types/room-stays.ts.

export const ROOM_REQUEST_CATEGORIES = ['towels', 'cleaning', 'food', 'wifi', 'tv', 'maintenance', 'other'] as const;
export type RoomRequestCategory = (typeof ROOM_REQUEST_CATEGORIES)[number];

export const ROOM_REQUEST_CATEGORY_LABEL: Record<RoomRequestCategory, string> = {
  towels: 'Towels / linen',
  cleaning: 'Cleaning',
  food: 'Food',
  wifi: 'Wi-Fi',
  tv: 'TV',
  maintenance: 'Something broken',
  other: 'Other',
};

export const ROOM_REQUEST_STATUSES = ['new', 'in_progress', 'done', 'cancelled'] as const;
export type RoomRequestStatus = (typeof ROOM_REQUEST_STATUSES)[number];

export const ROOM_REQUEST_STATUS_LABEL: Record<RoomRequestStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export type RoomRequestRow = {
  id: string;
  category: RoomRequestCategory;
  details: string | null;
  status: RoomRequestStatus;
  requestedByName: string | null;
  requestedByRole: 'patient' | 'contact' | null;
  note: string | null;
  handledByName: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ==== CONCERNS AND FEEDBACK ==== //

export const ROOM_CONCERN_KINDS = [
  'unhappy',
  'complaint',
  'pain',
  'family_worry',
  'waiting',
  'repeat_request',
  'late_request',
  'low_rating',
  'safety',
  'other',
] as const;
export type RoomConcernKind = (typeof ROOM_CONCERN_KINDS)[number];

export const ROOM_CONCERN_KIND_LABEL: Record<RoomConcernKind, string> = {
  unhappy: 'Unhappy',
  complaint: 'Complaint',
  pain: 'Pain or discomfort',
  family_worry: 'Family worried',
  waiting: 'Still waiting',
  repeat_request: 'Asked again',
  late_request: 'Request overdue',
  low_rating: 'Low rating',
  safety: 'Safety',
  other: 'Concern',
};

export type RoomConcernLevel = 'serious' | 'attention';
export type RoomConcernStatus = 'open' | 'looking' | 'resolved';
export type RoomConcernSource = 'ayu' | 'rule' | 'feedback' | 'scan';

export const ROOM_CONCERN_SOURCE_LABEL: Record<RoomConcernSource, string> = {
  ayu: 'Ayu noticed in the chat',
  rule: 'Raised automatically',
  feedback: 'From their rating',
  scan: 'Found reviewing the chat',
};

export type RoomConcernRow = {
  id: string;
  level: RoomConcernLevel;
  kind: RoomConcernKind;
  source: RoomConcernSource;
  summary: string;
  quote: string | null;
  raisedByName: string | null;
  raisedByRole: 'patient' | 'contact' | null;
  count: number;
  status: RoomConcernStatus;
  note: string | null;
  handledByName: string | null;
  handledAt: string | null;
  createdAt: string;
  lastAt: string;
};

export type RoomFeedbackRow = {
  id: string;
  rating: number;
  comment: string | null;
  byName: string | null;
  byRole: 'patient' | 'contact' | null;
  createdAt: string;
};

// ==== IN-ROOM CONVERSATIONS (Inward Ayu, one stay) ==== //

export type RoomChatMessage = { from: 'person' | 'ayu'; text: string; time: string | null };

export type RoomConversation = {
  id: string;
  who: { name: string | null; role: 'patient' | 'contact' | null; phoneEnding: string | null };
  room: string | null;
  startedAt: string | null;
  lastAt: string | null;
  messages: RoomChatMessage[];
};
