'use client';

import React, { useMemo, useState } from 'react';
import { DoctorSession, DAY_TYPES, INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import { DoctorSessionRecordActions } from './record-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';

type SessionRecord = DoctorSession & {
  doctor?: { id?: string; name?: string } | null;
  location?: { name?: string } | null;
  department?: { name?: string } | null;
  createdUser?: { name?: string } | null;
  updatedUser?: { name?: string } | null;
};

function DoctorSessionRow({
  row,
  rowSelection,
  toggleRow,
  getInstitutionName
}: {
  row: SessionRecord;
  rowSelection: Record<string, boolean>;
  toggleRow: (id: string) => void;
  getInstitutionName: (institution: number) => string;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  return (
    <TableRow data-state={rowSelection[row.id!] && 'selected'}>
      <TableCell>
        <Checkbox
          checked={!!row.id && !!rowSelection[row.id]}
          onCheckedChange={() => row.id && toggleRow(row.id)}
          aria-label="Select row"
        />
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={() => setEditDialogOpen(true)}
          className="font-medium text-primary hover:underline underline-offset-2 text-left cursor-pointer"
        >
          {row.name}
        </button>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {row.startTime ? moment(row.startTime).format('hh.mm A') : '-'}
        {' – '}
        {row.endTime ? moment(row.endTime).format('hh.mm A') : '-'}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <div><span className="text-muted-foreground">Local:</span> {formatFee(row.amountLocal)}</div>
        <div><span className="text-muted-foreground">Foreign:</span> {formatFee(row.amountForeign)}</div>
      </TableCell>
      <TableCell className="text-right">
        {row.startingPatientNumber} - {row.maxPatientNumber}
      </TableCell>
      <TableCell className="min-w-[220px] max-w-[320px]">
        {row.location?.name ?? '-'} / {row.department?.name ?? '-'} / {getInstitutionName(row.institution)}
      </TableCell>
      <TableCell>
        <div>
          <span className="text-muted-foreground">Created:</span> {row.createdUser?.name ?? '-'}
          {row.createdAt != null && (
            <span className="block text-muted-foreground">{moment(row.createdAt).format('DD/MM/YYYY hh.mm A')}</span>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Updated:</span> {row.updatedUser?.name ?? '-'}
          {row.updatedAt != null && (
            <span className="block text-muted-foreground">{moment(row.updatedAt).format('DD/MM/YYYY hh.mm A')}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge
          variant={row.status === 1 ? 'default' : 'secondary'}
          className={
            row.status === 1
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {row.status === 1 ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {row.status === 1 ? 'Published' : 'Unpublished'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <DoctorSessionRecordActions
          row={{ original: row } as any}
          controlledEditOpen={editDialogOpen}
          onControlledEditOpenChange={setEditDialogOpen}
        />
      </TableCell>
    </TableRow>
  );
}

function getInstitutionName(institution: number): string {
  const opt = INSTITUTION_OPTIONS[institution];
  return opt?.name ?? '';
}

function formatFee(value: number | string | null | undefined): string {
  if (value == null || value === '') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  return formatLKR(n);
}

export default function DoctorSessionsGroupedList({
  sessions,
  bulkDeleteAction
}: {
  sessions: SessionRecord[];
  bulkDeleteAction: (ids: string[]) => Promise<boolean>;
}) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const grouped = useMemo(() => {
    const map = new Map<number, SessionRecord[]>();
    for (let i = 1; i <= 8; i++) map.set(i, []);
    sessions.forEach((s) => {
      const dt = s.dayType ?? 1;
      if (!map.has(dt)) map.set(dt, []);
      map.get(dt)!.push(s);
    });
    return map;
  }, [sessions]);

  const dayTypeOrder = [1, 2, 3, 4, 5, 6, 7, 8]; // Sunday to Saturday, then Specific

  const selectedIds = useMemo(
    () => Object.entries(rowSelection).filter(([, v]) => v).map(([id]) => id),
    [rowSelection]
  );

  const onBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      const ok = await bulkDeleteAction(selectedIds);
      setShowBulkDeleteConfirm(false);
      setRowSelection({});
      if (ok) {
        toast({ variant: 'success', title: 'Success', description: 'Records were deleted successfully' });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Records could not be deleted.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message ?? 'Delete failed.' });
    } finally {
      setLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const toggleRow = (id: string) => {
    setRowSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const all: Record<string, boolean> = {};
      sessions.forEach((s) => {
        if (s.id) all[s.id] = true;
      });
      setRowSelection(all);
    } else {
      setRowSelection({});
    }
  };

  const someSelected = selectedIds.length > 0;

  return (
    <>
      {someSelected && (
        <div className="flex items-center justify-end gap-2 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Bulk delete
          </Button>
        </div>
      )}
      <div className="space-y-6">
        {dayTypeOrder.map((dayType) => {
          const list = grouped.get(dayType) ?? [];
          if (list.length === 0) return null;

          const dayLabel = DAY_TYPES[dayType - 1]?.name ?? `Day ${dayType}`;

          return (
            <div key={dayType} className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 font-semibold text-sm">
                {dayLabel}
              </div>
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          list.length > 0 &&
                          list.every((s) => s.id && rowSelection[s.id])
                        }
                        onCheckedChange={(v) => {
                          const ids = list.map((s) => s.id).filter(Boolean) as string[];
                          if (v) ids.forEach((id) => setRowSelection((p) => ({ ...p, [id]: true })));
                          else ids.forEach((id) => setRowSelection((p) => ({ ...p, [id]: false })));
                        }}
                        aria-label="Select all in group"
                      />
                    </TableHead>
                    <TableHead>Doctor Session</TableHead>
                    <TableHead>Start – End Time</TableHead>
                    <TableHead className="text-right">Session Value</TableHead>
                    <TableHead className="text-right">Patient Number</TableHead>
                    <TableHead className="min-w-[220px] max-w-[320px]">Location / Department / Institution</TableHead>
                    <TableHead>Created / Updated</TableHead>
                    <TableHead className="text-center">Published</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((row) => (
                    <DoctorSessionRow
                      key={row.id}
                      row={row}
                      rowSelection={rowSelection}
                      toggleRow={toggleRow}
                      getInstitutionName={getInstitutionName}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div className="rounded-lg border border-border flex items-center justify-center py-12 text-muted-foreground">
          No sessions found for this institution and doctor.
        </div>
      )}

      <CustomAlertDialog
        open={showBulkDeleteConfirm}
        handleVisibilityChange={setShowBulkDeleteConfirm}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete the selected records."
        handleContinue={onBulkDeleteConfirm}
      />
    </>
  );
}
