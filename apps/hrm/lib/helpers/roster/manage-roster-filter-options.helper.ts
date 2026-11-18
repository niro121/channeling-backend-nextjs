import { getManageRosterOptions } from '@/services/hr-admin-services/manage-roster.service';

export type ManageRosterFilterOption = {
  id: string;
  name: string;
};

/**
 * INT-R3 / R7 — roster filter options from Manage Rosters (id = business code).
 * Legacy free-text / placeholder values still present on staff or allocations are
 * appended as orphan options so existing filters keep working during transition.
 */
export async function buildManageRosterFilterOptions(
  legacyValues: Array<string | null | undefined> = []
): Promise<ManageRosterFilterOption[]> {
  const result = await getManageRosterOptions();
  const master = result.success ? (result.data ?? []) : [];

  const byId = new Map<string, ManageRosterFilterOption>();
  for (const row of master) {
    const id = row.id.trim().toUpperCase();
    if (!id) continue;
    byId.set(id, { id, name: row.name });
  }

  for (const raw of legacyValues) {
    const key = (raw ?? '').trim();
    if (!key) continue;
    const upper = key.toUpperCase();
    if (byId.has(upper)) continue;
    // Keep original casing for non-code legacy placeholders (e.g. roster_a).
    byId.set(upper, { id: key, name: key });
  }

  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}
