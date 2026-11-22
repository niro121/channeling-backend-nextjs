'use server';

import { getChannelingBanks } from '@/services/channeling/get-banks.service';

export async function getChannelingBanksAction() {
  return getChannelingBanks();
}
