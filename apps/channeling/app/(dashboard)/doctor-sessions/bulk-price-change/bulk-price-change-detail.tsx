'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FEE_TYPES } from '@/types/doctor.session';
import { type BulkPriceChangeRule, type BulkPriceChangePreviewRow, type BulkPriceChangeResultRow } from '@/types/bulk-price-change';
import {
  getBulkPriceChange,
  addBulkPriceChangeRule,
  deleteBulkPriceChangeRule,
  preprocessBulkPriceChange,
  processBulkPriceChange
} from '@/app/actions/bulk-price-change.action';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Play, CheckCircle, Trash2, Plus, X, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { AddRuleDialog } from './add-rule-dialog';
import { EditDoctorSessionDialog } from '../edit-doctor-session-dialog';

const OP_LABELS: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '=',
  range: '…'
};

function ruleConditionLabel(r: BulkPriceChangeRule): string {
  if (r.localFeeOp === 'range' && r.localFeeMin != null && r.localFeeMax != null) {
    return `${r.localFeeMin} – ${r.localFeeMax}`;
  }
  return `${OP_LABELS[r.localFeeOp] ?? r.localFeeOp} ${r.localFeeValue}`;
}

/** Group rows by doctor name for compact display (handles 20+ doctors, 10+ sessions each) */
function groupByDoctor<T extends { doctorName?: string | null }>(
  rows: T[]
): { doctorLabel: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.doctorName?.trim() || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([doctorLabel, rows]) => ({ doctorLabel, rows }));
}

type BulkPriceChangeDetailProps = {
  bulkId: string;
  onBack?: () => void;
  /** When set, show Close button and call on close (e.g. when embedded in a dialog) */
  onClose?: () => void;
};

export function BulkPriceChangeDetail({ bulkId, onBack, onClose }: BulkPriceChangeDetailProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push('/doctor-sessions/bulk-price-change'));
  const isEmbedded = onClose != null;
  const [bulk, setBulk] = useState<{
    id: string;
    name: string;
    feeTypeId: string;
    status: string;
    rules: BulkPriceChangeRule[];
    results?: BulkPriceChangeResultRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<BulkPriceChangePreviewRow[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [addRuleDialogOpen, setAddRuleDialogOpen] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleDoctor = (doctorLabel: string) => {
    setExpandedDoctors((prev) => {
      const next = new Set(prev);
      if (next.has(doctorLabel)) next.delete(doctorLabel);
      else next.add(doctorLabel);
      return next;
    });
  };

  const feeTypeName = FEE_TYPES.find((f) => f.id === bulk?.feeTypeId)?.name ?? bulk?.feeTypeId;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getBulkPriceChange(bulkId);
    setLoading(false);
    if (res.success && res.data) {
      setBulk(res.data);
      setPreview(null);
    } else {
      toast({ title: res.error?.message ?? 'Failed to load', variant: 'destructive' });
    }
  }, [bulkId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteRule = async (ruleId: string) => {
    const res = await deleteBulkPriceChangeRule(ruleId);
    if (res.success) load();
    else toast({ title: res.error?.message ?? 'Failed to delete rule', variant: 'destructive' });
  };

  const handlePreprocess = async () => {
    setPreprocessLoading(true);
    const res = await preprocessBulkPriceChange(bulkId);
    setPreprocessLoading(false);
    if (res.success) setPreview(res.data ?? []);
    else toast({ title: res.error?.message ?? 'Preprocess failed', variant: 'destructive' });
  };

  const handleProcess = async () => {
    setProcessing(true);
    const res = await processBulkPriceChange(bulkId);
    setProcessing(false);
    if (res.success) {
      toast({ title: `Updated ${res.data?.updated ?? 0} sessions` });
      load();
    } else {
      toast({ title: res.error?.message ?? 'Process failed', variant: 'destructive' });
    }
  };

  if (loading || !bulk) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isProcessed = bulk.status === 'PROCESSED';
  const results = bulk.results ?? [];
  const showPreview = preview !== null && !isProcessed;
  const showReport = isProcessed && results.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {!isEmbedded && (
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to list">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold">{bulk.name}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>Fee type: {feeTypeName}</span>
              {isProcessed && <Badge className="ml-0">Processed</Badge>}
            </div>
          </div>
        </div>
        {isEmbedded && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isProcessed && (
        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
            <CardDescription>
              Add rules: when local fee matches condition, it will be updated to the new local/foreign fee. First matching rule applies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bulk.rules.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condition (local fee)</TableHead>
                      <TableHead>New local fee</TableHead>
                      <TableHead>New foreign fee</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulk.rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{ruleConditionLabel(r)}</TableCell>
                        <TableCell>{r.newLocalFee}</TableCell>
                        <TableCell>{r.newForeignFee}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => r.id && handleDeleteRule(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Button onClick={() => setAddRuleDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add rule
            </Button>
          </CardContent>
        </Card>
      )}

      {!isProcessed && bulk.rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pre-process</CardTitle>
            <CardDescription>
              See which doctor sessions will be changed before applying.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handlePreprocess} disabled={preprocessLoading}>
              {preprocessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Pre-process
            </Button>
            {showPreview && (
              <div className="rounded-md border max-h-[min(50vh,24rem)] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-0" />
                      <TableHead>Session</TableHead>
                      <TableHead>Local fee</TableHead>
                      <TableHead>Foreign fee</TableHead>
                      <TableHead className="w-[4.5rem] text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupByDoctor(preview).map(({ doctorLabel, rows }) => {
                      const isExpanded = expandedDoctors.has(doctorLabel);
                      return (
                        <React.Fragment key={doctorLabel}>
                          <TableRow
                            className="bg-muted/60 hover:bg-muted/70 cursor-pointer"
                            onClick={() => toggleDoctor(doctorLabel)}
                          >
                            <TableCell className="w-0 py-1.5 pr-0">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell colSpan={5} className="font-medium py-1.5 text-foreground">
                              {doctorLabel} — {rows.length} session{rows.length !== 1 ? 's' : ''}
                            </TableCell>
                          </TableRow>
                          {isExpanded &&
                            rows.map((row) => (
                              <TableRow key={row.doctorSessionId}>
                                <TableCell className="w-0 py-1 pr-0" />
                                <TableCell className="py-1">
                                  <span className="font-medium">{row.sessionName ?? row.doctorSessionId}</span>
                                </TableCell>
                                <TableCell className="py-1 text-sm">
                                  <span className="text-muted-foreground">{row.currentLocalFee}</span>
                                  <span className="mx-1 text-muted-foreground">→</span>
                                  <span className="font-medium">{row.newLocalFee}</span>
                                </TableCell>
                                <TableCell className="py-1 text-sm">
                                  <span className="text-muted-foreground">{row.currentForeignFee}</span>
                                  <span className="mx-1 text-muted-foreground">→</span>
                                  <span className="font-medium">{row.newForeignFee}</span>
                                </TableCell>
                                <TableCell className="py-1 pr-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs text-primary hover:bg-primary/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewSessionId(row.doctorSessionId);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="p-3 text-sm text-muted-foreground border-t bg-muted/20">
                  {preview.length} session(s) across {groupByDoctor(preview).length} doctor(s) will be updated.
                </div>
              </div>
            )}
            {showPreview && preview.length > 0 && (
              <Button onClick={handleProcess} disabled={processing} className="gap-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Accept and process
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showReport && (
        <Card>
          <CardHeader>
            <CardTitle>Report (record set)</CardTitle>
            <CardDescription>Changes applied. This is the saved record of what was updated.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[min(50vh,24rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-0" />
                    <TableHead>Session</TableHead>
                    <TableHead>Local fee</TableHead>
                    <TableHead>Foreign fee</TableHead>
                    <TableHead className="w-[4.5rem] text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupByDoctor(results).map(({ doctorLabel, rows }) => {
                    const isExpanded = expandedDoctors.has(doctorLabel);
                    return (
                      <React.Fragment key={doctorLabel}>
                        <TableRow
                          className="bg-muted/60 hover:bg-muted/70 cursor-pointer"
                          onClick={() => toggleDoctor(doctorLabel)}
                        >
                          <TableCell className="w-0 py-1.5 pr-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell colSpan={5} className="font-medium py-1.5 text-foreground">
                            {doctorLabel} — {rows.length} session{rows.length !== 1 ? 's' : ''}
                          </TableCell>
                        </TableRow>
                        {isExpanded &&
                          rows.map((row) => (
                            <TableRow key={row.doctorSessionId}>
                              <TableCell className="w-0 py-1 pr-0" />
                              <TableCell className="py-1">
                                <span className="font-medium">{row.sessionName ?? row.doctorSessionId}</span>
                              </TableCell>
                              <TableCell className="py-1 text-sm">
                                <span className="text-muted-foreground">{row.oldLocalFee}</span>
                                <span className="mx-1 text-muted-foreground">→</span>
                                <span className="font-medium">{row.newLocalFee}</span>
                              </TableCell>
                              <TableCell className="py-1 text-sm">
                                <span className="text-muted-foreground">{row.oldForeignFee}</span>
                                <span className="mx-1 text-muted-foreground">→</span>
                                <span className="font-medium">{row.newForeignFee}</span>
                              </TableCell>
                              <TableCell className="py-1 pr-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewSessionId(row.doctorSessionId);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <EditDoctorSessionDialog
        open={!!viewSessionId}
        onOpenChange={(open) => !open && setViewSessionId(null)}
        sessionId={viewSessionId}
      />

      <AddRuleDialog
        open={addRuleDialogOpen}
        onOpenChange={setAddRuleDialogOpen}
        bulkPriceChangeId={bulkId}
        onAdded={load}
        addRuleAction={addBulkPriceChangeRule}
      />
    </div>
  );
}
