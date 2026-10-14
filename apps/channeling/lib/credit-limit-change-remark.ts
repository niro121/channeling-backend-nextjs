/**
 * Human-readable remark for a credit-limit activity.
 * The activity log has no remark column; the marker is `metadata.source`.
 */

const SOURCE_LABELS: Record<string, string> = {
  agency_edit: 'Agency edit',
  agency_allowed_credit_limits_page: 'Allowed limits page',
  agency_created: 'Agency created',
  violation_cleared_manually: 'Violation cleared (manual)',
  agency_deposit_violation_auto_clear: 'Deposit (auto-clear)',
};

export function resolveCreditLimitChangeSource(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata) return null;
  const raw = metadata.source;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  if (metadata.formalAcknowledgementAgencyRequestDepositBelowCreditLimitResponsibility === true) {
    return 'agency_allowed_credit_limits_page';
  }
  return null;
}

/** Label for a stored source key. Returns null when no source was recorded. */
export function formatCreditLimitChangeSource(sourceKey: string | null | undefined): string | null {
  if (!sourceKey) return null;
  return SOURCE_LABELS[sourceKey] ?? sourceKey.replace(/_/g, ' ');
}

export function creditLimitChangeRemark(
  metadata: Record<string, unknown> | null | undefined,
  empty = '—'
): string {
  return formatCreditLimitChangeSource(resolveCreditLimitChangeSource(metadata)) ?? empty;
}
