'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { SearchInput } from '@/components/common/search';
import { Agency, AGENCY_VIOLATION_REASON_ALLOWED_AT_HARD_CAP } from '@/types/agency';
import { formatLKR } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import {
  getAgencyAllowedCreditLimitHistory,
  updateAgencyAllowedCreditLimit
} from '@/app/actions/agency.actions';
import { useRouter } from 'next/navigation';
import type { AgencyAllowedCreditLimitHistoryEntry } from '@/types/agency';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

function formatAllowedLimitHistorySource(sourceKey: string | null): string {
  if (!sourceKey) {
    return 'Legacy (source not recorded)';
  }
  const map: Record<string, string> = {
    agency_edit: 'Agency edit',
    agency_allowed_credit_limits_page: 'Allowed limits page',
    agency_created: 'Agency created',
    violation_cleared_manually: 'Violation cleared (manual)',
    agency_deposit_violation_auto_clear: 'Deposit (auto-clear)'
  };
  return map[sourceKey] ?? sourceKey.replace(/_/g, ' ');
}

function truncateMiddle(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const keep = maxLen - 1;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${s.slice(0, head)}…${s.slice(s.length - tail)}`;
}

function buildColumns(
  onEdit: (row: Agency) => void,
  onHistory: (row: Agency) => void
): ColumnDef<Agency>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => {
        const code = row.getValue('code') as string;
        return code || <span className="text-muted-foreground">-</span>;
      }
    },
    {
      accessorKey: 'name',
      header: 'Agency name',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        return name || <span className="text-muted-foreground">-</span>;
      }
    },
    {
      accessorKey: 'balance',
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => {
        const balance = row.getValue('balance') as number;
        return (
          <div className="text-right tabular-nums">
            {balance != null ? formatLKR(balance) : '0.00'}
          </div>
        );
      }
    },
    {
      id: 'agencyCreditLimit',
      header: () => <div className="text-right">Agency credit limit</div>,
      cell: ({ row }) => {
        const v = row.original.creditLimit;
        return (
          <div className="text-right tabular-nums">{formatLKR(Number(v ?? 0))}</div>
        );
      }
    },
    {
      id: 'hardLimit',
      header: () => <div className="text-right">Hard credit limit</div>,
      cell: ({ row }) => {
        const max = row.original.maxCreditLimit;
        if (max == null) {
          return (
            <div className="text-right text-muted-foreground text-sm">Not configured</div>
          );
        }
        return (
          <div className="text-right tabular-nums">{formatLKR(Number(max))}</div>
        );
      }
    },
    {
      accessorKey: 'allowedCreditLimit',
      header: () => (
        <div className="text-right font-semibold">
          Allowed credit limit
        </div>
      ),
      cell: ({ row }) => {
        const v = row.getValue('allowedCreditLimit') as number;
        return (
          <div className="text-right tabular-nums font-semibold">
            {formatLKR(Number(v ?? 0))}
          </div>
        );
      }
    },
    {
      id: 'violation',
      header: () => <div className="text-center">Violation</div>,
      cell: ({ row }) => {
        const v = !!row.original.isCreditLimitViolation;
        if (!v) {
          return (
            <div className="text-center">
              <span className="text-muted-foreground">-</span>
            </div>
          );
        }
        return (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Credit limit violation is active</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const agency = row.original;
        const noHardLimit = agency.maxCreditLimit == null;
        const changeBtn = (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onEdit(agency)}>
            Change Limit
          </Button>
        );
        const historyBtn = (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onHistory(agency)}
            disabled={!agency.id}
            title="Allowed credit limit history"
          >
            <Clock className="h-4 w-4" />
            <span className="sr-only">Allowed credit limit history</span>
          </Button>
        );
        return (
          <div className="flex flex-wrap items-center gap-1">
            {noHardLimit ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{changeBtn}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Hard credit limit is not configured. Ask an administrator to set up the linked
                      payable account and hard limit before changing the limit.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              changeBtn
            )}
            {historyBtn}
          </div>
        );
      }
    }
  ];
}

type Props = {
  data: Agency[];
  rowCount: number;
  page?: string;
  limit?: string;
};

export function AllowedCreditLimitsClient({ data, rowCount, page, limit }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [dialogAgency, setDialogAgency] = useState<Agency | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAgency, setHistoryAgency] = useState<Agency | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<AgencyAllowedCreditLimitHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const openEdit = useCallback((row: Agency) => {
    setDialogAgency(row);
    setInputValue(String(row.allowedCreditLimit ?? 0));
    setConfirmAcknowledged(false);
  }, []);

  const openHistory = useCallback(async (agency: Agency) => {
    if (!agency.id) return;
    setHistoryAgency(agency);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryRows([]);
    try {
      const res = await getAgencyAllowedCreditLimitHistory(agency.id);
      if (!res.success) {
        setHistoryError(res.message || 'Failed to load history');
        return;
      }
      setHistoryRows(res.data ?? []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const columns = useMemo(() => buildColumns(openEdit, openHistory), [openEdit, openHistory]);

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryAgency(null);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(false);
  };

  const closeDialog = () => {
    setDialogAgency(null);
    setInputValue('');
    setSaving(false);
    setConfirmAcknowledged(false);
  };

  const hardCap = dialogAgency?.maxCreditLimit;
  const hardConfigured = hardCap != null;
  const parsedInput = Number.parseFloat(inputValue);
  const violation = !!dialogAgency?.isCreditLimitViolation;
  const overHard =
    hardConfigured && Number.isFinite(parsedInput) && parsedInput > Number(hardCap);
  const invalidNumber = inputValue.trim() === '' || !Number.isFinite(parsedInput) || parsedInput < 0;
  const canSave =
    !!dialogAgency &&
    hardConfigured &&
    !violation &&
    confirmAcknowledged &&
    !invalidNumber &&
    !overHard &&
    !saving;

  const onSave = async () => {
    if (!dialogAgency?.id || !canSave) return;
    setSaving(true);
    try {
      const res = await updateAgencyAllowedCreditLimit(
        dialogAgency.id,
        parsedInput,
        true
      );
      if (!res.success || res.isError) {
        toast({
          variant: 'destructive',
          title: 'Could not save',
          description: res.errors?.message || res.message || 'Update failed'
        });
        return;
      }
      toast({ title: 'Saved', description: res.message ?? 'Allowed credit limit updated.' });
      closeDialog();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <CustomDataTable
        heading="Agency allowed credit limits"
        subHeading="Update allowed credit limits only. Changes are audited. Editing requires a configured hard credit limit on the agency's linked payable account; ask an administrator if it shows as not configured."
        columns={columns}
        data={data}
        rowCount={rowCount}
        page={page}
        limit={limit}
        haveBulkDelete={false}
        toolbarLeft={
          <div className="relative w-full sm:max-w-sm">
            <SearchInput
              name="keyword"
              placeholder="Search by name, code, email, phone"
              className="pl-8 w-full h-9"
            />
          </div>
        }
      />

      <Dialog open={!!dialogAgency} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change allowed credit limit</DialogTitle>
            <DialogDescription>
              {dialogAgency?.name}
              {dialogAgency?.code ? ` · ${dialogAgency.code}` : ''}
            </DialogDescription>
          </DialogHeader>

          {violation && dialogAgency && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Credit violation active</AlertTitle>
              <AlertDescription className="text-sm">
                {dialogAgency.creditLimitViolationReason === AGENCY_VIOLATION_REASON_ALLOWED_AT_HARD_CAP ? (
                  <p>
                    The allowed credit limit reached the hard limit, which created a credit violation. The
                    agency should be asked to deposit until the balance is below the agency credit limit of{' '}
                    <span className="font-semibold tabular-nums">
                      {formatLKR(Number(dialogAgency.creditLimit ?? 0))}
                    </span>{' '}
                    so the violation can clear automatically. Until then, no edits are allowed on credit
                    limits.
                  </p>
                ) : (
                  <p>
                    A credit violation is active. The agency should deposit until the balance is below the
                    agency credit limit of{' '}
                    <span className="font-semibold tabular-nums">
                      {formatLKR(Number(dialogAgency.creditLimit ?? 0))}
                    </span>{' '}
                    so the violation can clear automatically. Until then, no edits are allowed on credit
                    limits.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!hardConfigured && !!dialogAgency && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Hard limit is not set yet. Ask an administrator to configure it before you can save.
            </p>
          )}

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Hard credit limit:{' '}
              {hardConfigured ? (
                <span className="font-medium text-foreground tabular-nums">
                  {formatLKR(Number(hardCap))}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Agency credit limit:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatLKR(Number(dialogAgency?.creditLimit ?? 0))}
              </span>
              <span className="text-muted-foreground">
                {' '}
                (balance must be at or below this amount to clear a violation)
              </span>
            </div>
            <Label htmlFor="allowedCreditLimitDialog">Allowed credit limit (LKR)</Label>
            <Input
              id="allowedCreditLimitDialog"
              type="number"
              min={0}
              max={hardConfigured ? Number(hardCap) : undefined}
              step="0.01"
              value={inputValue}
              disabled={violation || !hardConfigured}
              onChange={(e) => setInputValue(e.target.value)}
            />
            {overHard && (
              <p className="text-sm text-destructive">
                Cannot exceed hard credit limit ({formatLKR(Number(hardCap))}).
              </p>
            )}
            {invalidNumber && inputValue.trim() !== '' && (
              <p className="text-sm text-destructive">Enter a valid number (0 or greater).</p>
            )}
          </div>

          {hardConfigured && !violation && (
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
              <Checkbox
                id="limit-change-confirm"
                checked={confirmAcknowledged}
                onCheckedChange={(v) => setConfirmAcknowledged(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="limit-change-confirm" className="text-sm font-normal leading-snug cursor-pointer">
                I hereby confirm that the agency has formally requested this change; that the agency has
                confirmed it will remit deposits as necessary to maintain its balance below the credit limit;
                and that I accept responsibility for recording this update.
              </Label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={!canSave}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          if (!open) closeHistory();
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-[min(96vw,72rem)] flex-col">
          <DialogHeader>
            <DialogTitle>Allowed credit limit history</DialogTitle>
            <DialogDescription>
              {historyAgency?.name}
              {historyAgency?.code ? ` · ${historyAgency.code}` : ''}
              {' — '}
              recorded changes to allowed credit limit (newest first). Source and related fields come
              from the activity log; older entries may omit some fields.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : historyError ? (
              <p className="p-4 text-sm text-destructive">{historyError}</p>
            ) : historyRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No recorded changes yet. Entries appear when the allowed credit limit is updated and
                activity logging is enabled.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Changed by</TableHead>
                      <TableHead className="whitespace-nowrap">User ID</TableHead>
                      <TableHead className="text-right">From</TableHead>
                      <TableHead className="text-right">To</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="min-w-[9rem]">Agency (logged)</TableHead>
                      <TableHead className="whitespace-nowrap">IP</TableHead>
                      <TableHead className="text-center">Formal ack</TableHead>
                      <TableHead className="min-w-[8rem]">Other metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRows.map((r) => {
                      const sourceKey = r.sourceResolved ?? r.source;
                      const agencyLogged =
                        r.agencyNameFromMetadata || r.agencyCodeFromMetadata
                          ? [r.agencyNameFromMetadata, r.agencyCodeFromMetadata].filter(Boolean).join(' · ')
                          : '—';
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(r.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </TableCell>
                          <TableCell className="max-w-[10rem] truncate text-sm" title={r.changedByUserName}>
                            {r.changedByUserName}
                          </TableCell>
                          <TableCell
                            className="max-w-[7rem] truncate font-mono text-xs text-muted-foreground"
                            title={r.changedByUserId}
                          >
                            {truncateMiddle(r.changedByUserId, 14)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {r.oldValue != null ? formatLKR(r.oldValue) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {r.newValue != null ? formatLKR(r.newValue) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {r.delta != null ? formatLKR(r.delta) : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.field ?? '—'}
                          </TableCell>
                          <TableCell className="max-w-[11rem] text-sm text-muted-foreground">
                            {formatAllowedLimitHistorySource(sourceKey)}
                          </TableCell>
                          <TableCell className="max-w-[12rem] truncate text-sm" title={agencyLogged}>
                            {agencyLogged}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                            {r.ipAddress ?? '—'}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {r.formalDeclarationAcknowledged ? 'Yes' : '—'}
                          </TableCell>
                          <TableCell className="max-w-[14rem]">
                            {r.otherMetadataJson ? (
                              <span
                                className="block truncate font-mono text-[11px] leading-snug text-muted-foreground"
                                title={r.otherMetadataJson}
                              >
                                {r.otherMetadataJson}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeHistory}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
