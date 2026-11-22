import 'server-only';
import { getManagementMe } from '@/lib/management-access';
import { fetchServerSession } from '@/lib/session';
import { AdkError } from './adk';
import { canUseAi } from './constants';
import { AiError, type AiActor } from './service';

/** The signed-in person and their AI privileges (from channeling, this request). */
export async function getAiActor(): Promise<AiActor> {
  const [me, session] = await Promise.all([getManagementMe(), fetchServerSession()]);
  if (me.access !== 'allowed' || !me.userId) throw new AiError('You must be signed in.', 'forbidden');
  if (!canUseAi(me.ai)) throw new AiError("You don't have access to Ayu.", 'forbidden');
  return {
    userId: me.userId,
    name: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    isAdmin: me.isAdmin,
    perms: me.ai
  };
}

export function aiFailure(error: unknown): { success: false; errorCode: string; message: string } {
  if (error instanceof AiError) return { success: false, errorCode: error.code, message: error.message };
  if (error instanceof AdkError) return { success: false, errorCode: 'unavailable', message: error.message };
  console.error('[ai]', error);
  return { success: false, errorCode: 'server_error', message: 'Something went wrong. Please try again.' };
}
