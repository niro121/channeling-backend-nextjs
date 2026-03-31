'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AgentBalanceConfirmationLetterRow } from '@/types/reports/agent.balance.confirmation.letter';

function labelByLanguage(language: 'en' | 'si') {
  if (language === 'si') {
    return {
      greetingNameFallback: 'කුලමනාකාරතුමනි,',
      greeting: 'මහත්මයාණනි,',
      title: 'ශේෂ තහවුරු සහතිකය',
      body: 'අප ආයතනයේ පවත්වාගෙන යනු ලබන පහත සඳහන් නියෝජිත ගිණුමේ  දිනට ශේෂය පහත පරිදි වේ.',
      nameOfAgent: 'නියෝජිත නාමය',
      agentCode: 'නියෝජිත අංකය',
      balanceAsAtDate: 'ශේෂය',
      footer1: 'ස්තුතියි.',
      footer2: 'මෙයට,',
      footer3: 'විශ්වාසී,',
      footer4: 'ගණකාධිකාරී - රුහුණු රෝහල් කාර්යාලය.',
    };
  }

  return {
    greetingNameFallback: '',
    greeting: 'Dear Sir/s,',
    title: 'CERTIFICATE OF BALANCE',
    body: 'We hereby certify that the balance in the below mentioned Agent account maintained with us, as at close of business on was as follows.',
    nameOfAgent: 'Name of Agent',
    agentCode: 'Agent Code',
    balanceAsAtDate: 'Balance as at date',
    footer1: 'Yours faithfully,',
    footer2: '................',
    footer3: 'Accountant.',
    footer4: 'Ruhunu Hospital (Pvt.) Ltd.',
  };
}

export const AgentBalanceConfirmationLetterColumns: ColumnDef<AgentBalanceConfirmationLetterRow>[] = [
  {
    id: 'letter',
    header: '',
    cell: ({ row }) => {
      const r = row.original;
      const t = labelByLanguage(r.language);
      const greetingName = r.agentName?.trim() || t.greetingNameFallback;
      const asAtDate = r.asAtDate?.trim() || '';
      const bodyDateFragment = asAtDate ? ` ${asAtDate}` : '';
      return (
        <div className="w-full px-3 py-6 text-[14px] leading-8">
          <div className="min-h-[700px] space-y-6">
            <p>{greetingName}</p>
            <p>,</p>
            <p>{asAtDate}</p>

            <p>{t.greeting}</p>

            <p className="text-center underline font-semibold">{t.title}</p>

            <p className="text-center">
              {t.body.replace(' on was ', ` on${bodyDateFragment} was `)}
            </p>

            <div className="mt-6 grid grid-cols-[2fr_1fr_1fr] gap-2 font-semibold">
              <p>{t.nameOfAgent}</p>
              <p className="text-center">{t.agentCode}</p>
              <p className="text-right">{t.balanceAsAtDate}</p>
            </div>

            <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
              <p>{r.agentName || '-'}</p>
              <p className="text-center">{r.agentCode || '-'}</p>
              <p className="text-right">{Number(r.balance ?? 0).toFixed(2)}</p>
            </div>

            <div className="pt-8 space-y-4">
              <p>{t.footer1}</p>
              <p>{t.footer2}</p>
              <p>{t.footer3}</p>
              <p>{t.footer4}</p>
            </div>
          </div>
        </div>
      );
    },
  },
];
