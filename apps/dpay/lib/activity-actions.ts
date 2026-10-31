/**
 * Known DPAY activity actions for the User Activity report reference popover.
 */
export const KNOWN_ACTIVITY_ACTIONS: Array<{
  action: string;
  importance: 'low' | 'medium' | 'high';
  when: string;
}> = [
  {
    action: 'reports.visited',
    importance: 'low',
    when: 'User opens the reports catalog',
  },
  {
    action: 'reports.user-activity.exported',
    importance: 'medium',
    when: 'User exports the user activity report',
  },
  {
    action: 'patient-bills.patient-bills.visited',
    importance: 'low',
    when: 'User views the patient bills list',
  },
  {
    action: 'patient-bills.patient-bill.visited',
    importance: 'low',
    when: 'User opens a patient bill detail page',
  },
  {
    action: 'patient-bills.patient-bill.created',
    importance: 'high',
    when: 'User creates a patient bill',
  },
  {
    action: 'patient-bills.patient-bill.updated',
    importance: 'high',
    when: 'User updates a patient bill (legacy full update)',
  },
  {
    action: 'patient-bills.patient-bill.updated.details',
    importance: 'high',
    when: 'User updates admission/customer details on a bill',
  },
  {
    action: 'patient-bills.patient-bill.line-item.created',
    importance: 'high',
    when: 'User adds a doctor charge line item',
  },
  {
    action: 'patient-bills.patient-bill.line-item.deleted',
    importance: 'high',
    when: 'User soft-deletes a line item',
  },
  {
    action: 'patient-bills.patient-bill.payment.recorded',
    importance: 'high',
    when: 'User records a patient bill payment',
  },
  {
    action: 'patient-bills.patient-bill.cancelled',
    importance: 'high',
    when: 'User cancels a patient bill (including closed); active receipts are voided with refunds',
  },
  {
    action: 'patient-bills.patient-bill.closed',
    importance: 'high',
    when: 'User closes a fully paid patient bill',
  },
  {
    action: 'patient-bills.patient-bill.overpayment.refunded',
    importance: 'high',
    when: 'User refunds an over-payment and creates a dedicated refund receipt',
  },
];
