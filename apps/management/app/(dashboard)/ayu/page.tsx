import { getManagementMe } from '@/lib/management-access';
import { canUseAi } from '@/lib/ai/constants';
import { AyuChat } from './ayu-chat';

export const dynamic = 'force-dynamic';

export default async function AyuPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const me = await getManagementMe();
  if (!canUseAi(me.ai)) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have access to Ayu. Ask an admin for Management App – Ayu → Chat with Ayu.
      </div>
    );
  }
  if (!process.env.AYU_ADK_URL || !process.env.ADK_SERVICE_KEY) {
    return (
      <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Ayu is not connected yet. Set AYU_ADK_URL and ADK_SERVICE_KEY.
      </div>
    );
  }
  const { c } = await searchParams;
  return <AyuChat initialChatId={c ?? null} />;
}
