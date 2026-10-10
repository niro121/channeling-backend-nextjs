'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getChannelingBanks } from '@/services/channeling/get-banks.service';

export async function getChannelingBanksAction() {
  await requirePermission('patient-bills', 'edit');
  return getChannelingBanks();
}
