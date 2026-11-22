// ==== ROOM CHECK-IN / CHECK-OUT CHECKLISTS ==== //
// Shapes returned by channeling /api/management/room-stays/*.
// Copied from apps/channeling/types/room-checklist.ts; keep the two in sync.

export const CHECKLIST_KINDS = ['check_in', 'check_out'] as const;
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number];

export const CHECKLIST_KIND_LABEL: Record<ChecklistKind, string> = {
  check_in: 'Check-in',
  check_out: 'Check-out',
};

export const TEMPLATE_STATUSES = ['draft', 'published', 'archived'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const STAY_STATUSES = ['occupied', 'closed', 'cancelled'] as const;
export type StayStatus = (typeof STAY_STATUSES)[number];

/**
 * Item types a form can hold.
 * - tick: a box to tick (required = must be ticked)
 * - pass_fail: Pass / Fail (Fail is an issue)
 * - number, text: free entry
 * - photo: one or more photos
 * - signature: drawn signature
 * - inventory: expands to every unit in the room; each is Present / Missing / Damaged
 * - handover: things given to the patient with a quantity; check-out asks for them back
 */
export const CHECKLIST_ITEM_TYPES = [
  'tick',
  'pass_fail',
  'number',
  'text',
  'photo',
  'signature',
  'inventory',
  'handover',
] as const;
export type ChecklistItemType = (typeof CHECKLIST_ITEM_TYPES)[number];

export const CHECKLIST_ITEM_TYPE_LABEL: Record<ChecklistItemType, string> = {
  tick: 'Tick box',
  pass_fail: 'Pass / Fail',
  number: 'Number',
  text: 'Text',
  photo: 'Photo',
  signature: 'Signature',
  inventory: 'Room inventory',
  handover: 'Handed to patient',
};

export type ChecklistItem = {
  id: string;
  type: ChecklistItemType;
  label: string;
  help?: string | null;
  required: boolean;
  /** pass_fail / tick / inventory: a failure blocks finishing unless someone with Override signs it off. */
  blocking?: boolean;
  /** pass_fail / inventory / handover: a failure needs a note or photo. */
  evidenceOnFail?: boolean;
  /** handover: quantity normally given. */
  defaultQty?: number | null;
};

export type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

// ==== FORM AS SENT TO THE PWA (inventory and returns already expanded) ==== //

export type InventoryRowState = 'present' | 'missing' | 'damaged';

/** One room unit listed under an inventory item. */
export type FormInventoryRow = {
  unitId: string;
  assetTag: string;
  itemName: string;
  itemIcon: string | null;
  /** Inventory condition before this checklist (0 available, 1 repair, 2 broken, 4 missing). */
  condition: number;
};

/** One thing handed over at check-in, to be returned at check-out. */
export type FormReturnRow = {
  key: string;
  label: string;
  givenQty: number;
};

/** An item ready to fill. inventory items carry `units`; the generated returns item carries `returns`. */
export type FormItem = ChecklistItem & {
  units?: FormInventoryRow[];
  returns?: FormReturnRow[];
};

export type FormSection = { id: string; title: string; items: FormItem[] };

export type ChecklistForm = {
  templateId: string | null;
  templateName: string;
  templateVersion: number;
  kind: ChecklistKind;
  room: { id: string; number: string };
  sections: FormSection[];
};

/** Id of the generated check-out section that asks for handed-over things back. */
export const RETURNS_SECTION_ID = '__returns';
export const RETURNS_ITEM_ID = '__returns_item';

// ==== ANSWERS ==== //

export type ChecklistAnswer = {
  itemId: string;
  /** tick: boolean; pass_fail: 'pass' | 'fail'; number: number; text: string; signature: photo key */
  value?: boolean | number | string | null;
  note?: string | null;
  /** S3 keys from the photo upload */
  photos?: string[];
  /** inventory: per unit */
  units?: { unitId: string; state: InventoryRowState; note?: string | null }[];
  /** handover at check-in: quantity given */
  qty?: number | null;
  /** returns at check-out: per handed-over thing */
  returns?: { key: string; returnedQty: number; note?: string | null }[];
};

// ==== ROWS ==== //

export type StayContactRow = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  isPrimary: boolean;
};

export type StayContactInput = {
  name: string;
  phone: string;
  relationship?: string | null;
  isPrimary?: boolean;
};

export type StayPatientInput = {
  patientName: string;
  bhtNumber: string;
  patientPhone?: string | null;
  primaryIsPatient: boolean;
  contacts: StayContactInput[];
};

export type StayRow = {
  id: string;
  roomId: string;
  roomNumber: string;
  zoneName: string | null;
  departmentName: string | null;
  patientName: string;
  bhtNumber: string;
  patientPhone: string | null;
  primaryIsPatient: boolean;
  status: StayStatus;
  checkedInAt: string;
  checkedInByName: string | null;
  checkedOutAt: string | null;
  checkedOutByName: string | null;
  hasIssues: boolean;
  contacts: StayContactRow[];
  /** Concerns not resolved yet, and whether any is serious */
  openConcerns: number;
  seriousConcern: boolean;
};

export type SubmissionIssue = {
  sectionTitle: string;
  itemLabel: string;
  detail: string;
  /** What went wrong, for grouping in statistics, e.g. "Television missing" (older issues: none, use itemLabel). */
  topic?: string;
};

export type SubmissionRow = {
  id: string;
  kind: ChecklistKind;
  templateName: string;
  templateVersion: number;
  sections: FormSection[];
  answers: ChecklistAnswer[];
  hasIssues: boolean;
  issues: SubmissionIssue[];
  overrideReason: string | null;
  overrideByName: string | null;
  submittedAt: string;
  submittedByName: string | null;
};

export type StayDetail = StayRow & {
  cancelReason: string | null;
  submissions: SubmissionRow[];
  requests: RoomRequestRow[];
  concerns: RoomConcernRow[];
  feedback: RoomFeedbackRow[];
};

/** A room on the PWA list: vacant or with its open stay. */
export type StayRoomRow = {
  id: string;
  number: string;
  description: string;
  zoneId: string | null;
  zoneName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  locationId: string | null;
  stay: {
    id: string;
    patientName: string;
    bhtNumber: string;
    checkedInAt: string;
    hasIssues: boolean;
    /** Patient requests not done yet (new or in progress) */
    openRequests: number;
    /** Concerns not resolved yet, and whether any is serious */
    openConcerns: number;
    seriousConcern: boolean;
  } | null;
};

// ==== MANAGEMENT APP RESULTS ==== //

export type StaysResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      errorCode: string;
      message: string;
      /** needs_override: { blocking: string[] }; invalid_input: { problems: string[] } */
      details?: { blocking?: string[]; problems?: string[] } | null;
    };

export type StaysCan = { view: boolean; checkIn: boolean; checkOut: boolean; contacts: boolean; override: boolean };

export type StayRoomsData = {
  locationId: string | null;
  locations: { id: string; name: string }[];
  rooms: StayRoomRow[];
  can: StaysCan;
};


export type StayDetailData = {
  stay: StayDetail;
  can: { checkOut: boolean; contacts: boolean; override: boolean };
};

/** Statistics panel on the PWA (one branch). */
export type StayStats = {
  days: number;
  now: { total: number; inRoom: number; free: number; occupancyPct: number; openIssues: number };
  period: {
    checkIns: number;
    checkOuts: number;
    /** Average days for stays checked out in the period; null when none. */
    avgStayDays: number | null;
    checklists: number;
    checklistsWithIssues: number;
    overrides: number;
  };
  byZone: { name: string; total: number; inRoom: number }[];
  topIssues: { label: string; count: number }[];
  longestStays: { stayId: string; roomNumber: string; patientName: string; bhtNumber: string; days: number }[];
};

// ==== IN-ROOM REQUESTS (patients ask through in-room Ayu; GROs handle them) ==== //


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

// ==== IN-ROOM CONVERSATIONS (from Inward Ayu, per stay) ==== //

export type RoomChatMessage = { from: 'person' | 'ayu'; text: string; time: string | null };

export type RoomConversation = {
  id: string;
  who: { name: string | null; role: 'patient' | 'contact' | null; phoneEnding: string | null };
  room: string | null;
  startedAt: string | null;
  lastAt: string | null;
  messages: RoomChatMessage[];
};
