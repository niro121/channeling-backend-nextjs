export function formatUserDisplayName(
  name: string | null | undefined,
  userId?: string | null,
  staffCode?: string | null
): string {
  const baseName = (name || '').trim() || (userId || '').trim() || 'Unknown user';
  const code = (staffCode || '').trim();
  return code ? `${baseName} (${code})` : baseName;
}
