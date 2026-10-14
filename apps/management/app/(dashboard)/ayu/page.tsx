import Link from 'next/link';
import { getManagementMe } from '@/lib/management-access';
import { canUseAi } from '@/lib/ai/constants';
import { getAiActor } from '@/lib/ai/actor';
import { listChatAssistants } from '@/lib/ai/service';
import { AyuChat } from './ayu-chat';

export const dynamic = 'force-dynamic';

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export default async function AyuPage({ searchParams }: { searchParams: Promise<{ a?: string; c?: string }> }) {
  const me = await getManagementMe();
  if (!canUseAi(me.ai)) {
    return (
      <Notice>
        You don&apos;t have access to chat with the AI assistants.
        {me.ai.manage && (
          <>
            {' '}
            <Link href="/ayu/assistants" className="font-medium text-primary underline-offset-4 hover:underline">
              Set up assistants
            </Link>
          </>
        )}
      </Notice>
    );
  }

  const assistants = await listChatAssistants(await getAiActor());
  if (assistants.length === 0) {
    return (
      <Notice>
        No assistants are available to you yet.
        {me.ai.manage && (
          <>
            {' '}
            <Link href="/ayu/assistants" className="font-medium text-primary underline-offset-4 hover:underline">
              Set one up
            </Link>
          </>
        )}
      </Notice>
    );
  }

  const { a, c } = await searchParams;
  const initialAssistantId = assistants.some((x) => x.id === a) ? a! : assistants[0].id;
  return <AyuChat assistants={assistants} initialAssistantId={initialAssistantId} initialChatId={c ?? null} canManage={me.ai.manage} />;
}
