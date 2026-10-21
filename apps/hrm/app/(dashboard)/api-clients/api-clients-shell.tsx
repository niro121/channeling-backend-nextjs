'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Button,
  CustomDataTable,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@archmage/ui';
import { KeyRound, Play, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ApiClientRecord } from '@/types/api-client';
import { CareersApiPlayground } from './playground/playground-client';

type ApiClientsShellProps = {
  columns: ColumnDef<ApiClientRecord>[];
  data: ApiClientRecord[];
  totalRecords: number;
  page?: string;
  canAdd: boolean;
  defaultTab: 'clients' | 'playground';
};

export function ApiClientsShell({
  columns,
  data,
  totalRecords,
  page,
  canAdd,
  defaultTab
}: ApiClientsShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'clients') {
      next.delete('tab');
    } else {
      next.set('tab', value);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Clients</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Register machine clients for the Public Careers API, then smoke-test
            token, jobs, and apply in the Playground.
          </p>
        </div>
        {canAdd ? (
          <Link href="/api-clients/add" className="shrink-0">
            <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Client
              </span>
            </Button>
          </Link>
        ) : null}
      </div>

      <Tabs
        defaultValue={defaultTab}
        onValueChange={onTabChange}
        className="w-full space-y-6!"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          <TabsTrigger
            value="clients"
            className="data-[state=active]:text-primary text-base"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Clients
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="playground"
            className="data-[state=active]:text-primary text-base"
          >
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Playground
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <CustomDataTable
            heading="Registered clients"
            subHeading="Create an API User under Users, then generate client ID and secret here. Assign scopes such as careers:read / careers:apply."
            columns={columns}
            data={data}
            rowCount={totalRecords}
            page={page}
          />
        </TabsContent>

        <TabsContent value="playground">
          <CareersApiPlayground />
        </TabsContent>
      </Tabs>
    </div>
  );
}
