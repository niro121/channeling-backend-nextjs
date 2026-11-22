'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Copy, FileCheck2, Loader2, MoreHorizontal, Pencil, Plus, Send, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/hooks/use-toast';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  deleteChecklistTemplateAction,
  duplicateChecklistTemplateAction,
  setChecklistTemplateStatusAction,
} from '@/app/actions/room-checklist.actions';
import {
  CHECKLIST_KIND_LABEL,
  describeScope,
  type ChecklistKind,
  type ChecklistScopeOptions,
  type TemplateRow,
  type TemplateStatus,
} from '@/types/room-checklist';

export const STATUS_BADGE: Record<TemplateStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300' },
  published: {
    label: 'Published',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  archived: { label: 'Archived', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300' },
};

export function ChecklistFormsList({ templates, scope }: { templates: TemplateRow[]; scope: ChecklistScopeOptions }) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const canEdit = has('room-checklist-forms', 'edit');
  const canPublish = has('room-checklist-forms', 'publish');
  const [kind, setKind] = useState<ChecklistKind>('check_in');
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<TemplateRow | null>(null);

  const rows = useMemo(
    () =>
      templates
        .filter((t) => t.kind === kind)
        .sort((a, b) => Number(a.status === 'archived') - Number(b.status === 'archived')),
    [templates, kind]
  );
  const count = (k: ChecklistKind) => templates.filter((t) => t.kind === k && t.status !== 'archived').length;

  const run = (fn: () => Promise<{ success: boolean; message?: string; data?: { id: string } }>, goTo?: boolean) =>
    startTransition(async () => {
      const res = await fn();
      toast({ variant: res.success ? 'default' : 'destructive', title: res.message ?? (res.success ? 'Done' : 'Failed') });
      if (res.success && goTo && res.data?.id) router.push(`/room-checklists/${res.data.id}`);
      else if (res.success) router.refresh();
    });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Room Checklists</CardTitle>
            <CardDescription>
              Forms the GRO fills on the Management app when a patient checks in or out. The most specific published
              form for a room is used: room, then department, then zone, then all rooms.
            </CardDescription>
          </div>
          {canEdit && (
            <Button asChild>
              <Link href={`/room-checklists/new?kind=${kind}`}>
                <Plus className="size-4" /> New {CHECKLIST_KIND_LABEL[kind].toLowerCase()} form
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as ChecklistKind)}>
            <TabsList>
              <TabsTrigger value="check_in">Check-in ({count('check_in')})</TabsTrigger>
              <TabsTrigger value="check_out">Check-out ({count('check_out')})</TabsTrigger>
            </TabsList>
          </Tabs>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              <FileCheck2 className="size-8" />
              No {CHECKLIST_KIND_LABEL[kind].toLowerCase()} forms yet.
              {kind === 'check_out' && (
                <span className="max-w-md">
                  Without one, check-out only asks for the things handed over at check-in.
                </span>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used for</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => {
                    const badge = STATUS_BADGE[t.status];
                    return (
                      <TableRow key={t.id} className={t.status === 'archived' ? 'opacity-60' : undefined}>
                        <TableCell>
                          <Link href={`/room-checklists/${t.id}`} className="font-medium hover:underline">
                            {t.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {t.sections.length} section{t.sections.length === 1 ? '' : 's'} · v{t.version}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs text-sm">{describeScope(t, scope)}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.itemCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          {t.updatedByName ? <div className="text-xs">{t.updatedByName}</div> : null}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" disabled={pending}>
                                {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/room-checklists/${t.id}`}>
                                  <Pencil className="size-4" /> {canEdit ? 'Edit' : 'View'}
                                </Link>
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => run(() => duplicateChecklistTemplateAction(t.id), true)}>
                                  <Copy className="size-4" /> Duplicate
                                </DropdownMenuItem>
                              )}
                              {canPublish && (
                                <>
                                  <DropdownMenuSeparator />
                                  {t.status !== 'published' && (
                                    <DropdownMenuItem onClick={() => run(() => setChecklistTemplateStatusAction(t.id, 'published'))}>
                                      <Send className="size-4" /> Publish
                                    </DropdownMenuItem>
                                  )}
                                  {t.status === 'published' && (
                                    <DropdownMenuItem onClick={() => run(() => setChecklistTemplateStatusAction(t.id, 'draft'))}>
                                      <Undo2 className="size-4" /> Unpublish
                                    </DropdownMenuItem>
                                  )}
                                  {t.status !== 'archived' && (
                                    <DropdownMenuItem onClick={() => run(() => setChecklistTemplateStatusAction(t.id, 'archived'))}>
                                      <Archive className="size-4" /> Archive
                                    </DropdownMenuItem>
                                  )}
                                  {t.status !== 'published' && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(t)}>
                                      <Trash2 className="size-4" /> Delete
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{confirmDelete?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Checklists already filled with this form keep their own copy and are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const t = confirmDelete;
                setConfirmDelete(null);
                if (t) run(() => deleteChecklistTemplateAction(t.id));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
