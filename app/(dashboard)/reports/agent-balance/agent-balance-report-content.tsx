'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { getAgentBalanceReportData } from '@/app/actions/reports/agent-balance.report.action';
import { AgentBalanceReportContentProps, AgentBalanceReportData } from '@/types/reports/agent-balance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import Loading from '@/app/(dashboard)/loading';
import moment from 'moment';
import { format } from 'date-fns';
import { formatLKR } from '@/lib/format-money';

// Language translations
const translations = {
  en: {
    greeting: 'Dear Sir/s,',
    title: 'CERTIFICATE OF BALANCE',
    body: 'We hereby certify that the balance in the below mentioned Agent account maintained with us, as at close of business on {date} was as follows.',
    nameOfAgent: 'Name of Agent',
    agentCode: 'Agent Code',
    balanceAsAtDate: 'Balance as at date',
    yoursFaithfully: 'Yours faithfully,',
    accountant: 'Accountant.',
    companyName: 'Ruhunu Hospital (Pvt.) Ltd.'
  },
  si: {
    greeting: 'මහත්මයාණෙනි,',
    getTitle: (date: string) => `${date} දිනට ශේෂ සහතිකය.`,
    body: 'අප ආයතනයේ පවත්වා ගෙන යනු ලබන චැනල් නියෝජිත ආයතනයේ {date} දිනට ශේෂය පහත පරිදි වේ.',
    nameOfAgent: 'නියෝජිත නම',
    agentCode: 'නියෝජිත අංකය',
    balanceAsAtDate: 'ශේෂය',
    yoursFaithfully: 'ස්තුතියි.',
    accountant: 'ගණකාධිකාරී - රුහුණු රෝහල කරාපිටිය.',
    companyName: 'රුහුණු රෝහල (ප්‍රයිවට්) ලිමිටඩ්'
  }
};

function AgentBalanceReportContentInner({
  agentOptions
}: AgentBalanceReportContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AgentBalanceReportData | null>(null);

  const agentId = searchParams.get('agentId') || '__all__';
  const dateStr = searchParams.get('date');
  const language = searchParams.get('language') || 'en';
  const date = dateStr ? new Date(dateStr) : new Date();

  const lang = language === 'si' ? 'si' : 'en';
  const t = translations[lang];

  const fetchReportData = async () => {
    if (!agentId || agentId === '__all__' || !dateStr) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      const result = await getAgentBalanceReportData({
        agentId,
        date: dateStr,
        language
      });

      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setReportData(null);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch report data'
      });
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId && agentId !== '__all__' && dateStr) {
      fetchReportData();
    } else {
      setReportData(null);
    }
  }, [agentId, dateStr, language]);

  const languageOptions = [
    { id: 'en', name: 'English' },
    { id: 'si', name: 'Sinhala' }
  ];

  const exportData = async () => {
    if (!reportData) {
      return { success: false, data: [], message: 'No data available' };
    }

    const exportRow = {
      agentName: reportData.agentName,
      agentCode: reportData.agentCode,
      balance: reportData.balance.toFixed(2),
      date: reportData.date
    };

    return {
      success: true,
      data: [exportRow]
    };
  };

  const formatDate = (dateStr: string) => {
    return moment(dateStr).format('YYYY-MM-DD');
  };

  const formatBalance = (balance: number) => {
    return formatLKR(balance);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Agent Balance Confirmation Letter</CardTitle>
              <CardDescription>
                Generate a balance certificate letter for selected agent as at a specific date
              </CardDescription>
            </div>
            <ExportWrapper
              serverData={exportData}
              columns={['Agent Name', 'Agent Code', 'Balance', 'Date']}
              keys={['agentName', 'agentCode', 'balance', 'date'] as any}
              title="Agent Balance Confirmation Letter"
              fileName="agent-balance-confirmation-letter"
              showPrintButton={true}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 pb-4 border-b [&>div]:!flex-nowrap [&>div]:items-end">
            <FilterWrapper
              key={searchParams.toString()}
              initialValues={{
                agentId: agentId || '__all__',
                date: dateStr || undefined,
                language: language || 'en'
              }}
              buttonLabel="Search"
              onApplyClick={() => {
                setLoading(true);
              }}
              showClearButton
            >
              {({ values, setValue }) => (
                <>
                  <Combobox
                    label="Select Agent"
                    options={agentOptions}
                    value={values.agentId ?? '__all__'}
                    defaultValue="__all__"
                    onChange={(v) => setValue('agentId', v)}
                  />
                  <input
                    type="date"
                    value={values.date || format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setValue('date', e.target.value || undefined)}
                    className="h-10 px-3 border rounded-md w-60 flex-shrink-0"
                    aria-label="Date"
                  />
                  <Selector
                    label="Language"
                    options={languageOptions}
                    value={values.language ?? 'en'}
                    onChange={(v) => setValue('language', v)}
                    className={{
                      trigger: 'self-end!'
                    }}
                  />
                </>
              )}
            </FilterWrapper>
          </div>

          {loading ? (
            <Loading />
          ) : reportData ? (
            <div className="space-y-6 print:space-y-4">
              {/* Letter Content */}
              <div className="bg-white p-8 print:p-6 space-y-6 print:space-y-4 border rounded-lg print:border-0">
                {/* Address Section */}
                <div className="text-sm space-y-1">
                  <div>{reportData.agentName}</div>
                  {reportData.address && <div>{reportData.address}</div>}
                </div>

                {/* Date */}
                <div className="text-sm">
                  {formatDate(reportData.date)}
                </div>

                {/* Greeting */}
                <div className="text-sm">
                  {t.greeting}
                </div>

                {/* Title */}
                <div className="text-center font-bold text-lg print:text-base underline">
                  {lang === 'si' && typeof (t as any).getTitle === 'function' 
                    ? (t as any).getTitle(formatDate(reportData.date))
                    : (t as { title: string }).title}
                </div>

                {/* Body */}
                <div className="text-sm leading-relaxed">
                  {t.body.replace('{date}', formatDate(reportData.date))}
                </div>

                {/* Agent Details Table */}
                <div className="mt-6 print:mt-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-sm font-bold pb-2 border-b pr-4">{t.nameOfAgent}</th>
                        <th className="text-right text-sm font-bold pb-2 border-b px-4">{t.agentCode}</th>
                        <th className="text-right text-sm font-bold pb-2 border-b pl-4">{t.balanceAsAtDate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-sm py-2 pr-4">{reportData.agentName}</td>
                        <td className="text-sm py-2 text-right px-4">{reportData.agentCode}</td>
                        <td className="text-sm py-2 text-right pl-4">{formatBalance(reportData.balance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="mt-8 print:mt-6 space-y-4 print:space-y-2">
                  <div className="text-sm">{t.yoursFaithfully}</div>
                  <div className="border-t border-dashed border-gray-400 w-48 pt-2">
                    {/* Signature line */}
                  </div>
                  <div className="text-sm">{t.accountant}</div>
                  <div className="text-sm font-semibold">{t.companyName}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Please select an agent and date, then click Search to generate the certificate.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AgentBalanceReportContent(props: AgentBalanceReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <AgentBalanceReportContentInner {...props} />
    </Suspense>
  );
}
