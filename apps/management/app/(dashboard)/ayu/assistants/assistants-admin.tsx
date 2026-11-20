'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Switch, Textarea, useToast } from '@archmage/ui';
import { Bot, CheckCircle2, Loader2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUDIENCES, AUDIENCE_HINT, AUDIENCE_LABEL, type Audience } from '@/lib/ai/constants';
import {
  createAssistantAction,
  deleteAssistantAction,
  listAssistantsAdminAction,
  testConnectionAction,
  updateAssistantAction
} from '@/app/actions/ai.actions';
import type { AssistantAdminItem, AssistantInput } from '@/types/ai';
import { useInnerPageHeader } from '../../page-header-context';

const EMPTY: AssistantInput = { name: '', description: '', adkBaseUrl: '', adkAppName: '', audience: 'STAFF', greeting: '', active: true, sortOrder: 0 };

/** After a test: `ok` when the server answered and the app name is on it; otherwise `apps` to pick from. */
type TestState = { status: 'idle' | 'testing' } | { status: 'done'; ok: boolean; message: string; apps?: string[] };

/** Set up the assistants people can chat with in "Ask Ayu" (management-ai.manage). */
export function AssistantsAdmin() {
  useInnerPageHeader({ title: 'Set up assistants' });
  const { toast } = useToast();
  const [items, setItems] = useState<AssistantAdminItem[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: AssistantInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  const load = async () => {
    const result = await listAssistantsAdminAction();
    if (result.success) setItems(result.data);
    else {
      setItems([]);
      toast({ variant: 'destructive', title: 'Could not load assistants', description: result.message });
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (item?: AssistantAdminItem) => {
    setTest({ status: 'idle' });
    setEditing(
      item
        ? {
            id: item.id,
            form: {
              name: item.name,
              description: item.description ?? '',
              adkBaseUrl: item.adkBaseUrl,
              adkAppName: item.adkAppName,
              audience: item.audience,
              greeting: item.greeting ?? '',
              active: item.active,
              sortOrder: item.sortOrder
            }
          }
        : { id: null, form: { ...EMPTY, sortOrder: (items?.length ?? 0) + 1 } }
    );
  };

  const set = <K extends keyof AssistantInput>(key: K, value: AssistantInput[K]) =>
    setEditing((prev) => (prev ? { ...prev, form: { ...prev.form, [key]: value } } : prev));

  const runTest = async () => {
    if (!editing) return;
    setTest({ status: 'testing' });
    const result = await testConnectionAction(editing.form.adkBaseUrl, editing.form.adkAppName);
    if (!result.success) {
      setTest({ status: 'done', ok: false, message: result.message });
      return;
    }
    const { apps, appFound } = result.data;
    const typed = editing.form.adkAppName.trim();
    setTest(
      appFound
        ? { status: 'done', ok: true, message: `Connected. “${typed}” is on this server.` }
        : { status: 'done', ok: !typed, message: typed ? `Connected, but there is no app “${typed}”. Pick one:` : 'Connected. Pick the app:', apps }
    );
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const result = editing.id ? await updateAssistantAction(editing.id, editing.form) : await createAssistantAction(editing.form);
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Not saved', description: result.message });
      return;
    }
    setEditing(null);
    toast({ title: editing.id ? 'Assistant updated' : 'Assistant added' });
    void load();
  };

  const remove = async (item: AssistantAdminItem) => {
    if (!window.confirm(`Delete “${item.name}”? Everyone’s chat list for it is removed too.`)) return;
    const result = await deleteAssistantAction(item.id);
    if (!result.success) toast({ variant: 'destructive', title: 'Not deleted', description: result.message });
    void load();
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Assistants</h2>
          <p className="text-sm text-muted-foreground">
            The AI assistants people can chat with in Ask Ayu. Who can use them is set in channeling user groups (Management App AI Assistants).
          </p>
        </div>
        <Button onClick={() => open()} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {items == null && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {items?.length === 0 && (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No assistants yet. Add Ayu and Ayu for Management.</div>
      )}

      <div className="space-y-2">
        {items?.map((a) => (
          <div key={a.id} className={cn('flex items-start gap-3 rounded-2xl border p-4', !a.active && 'opacity-60')}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{a.name}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{AUDIENCE_LABEL[a.audience]}</span>
                {!a.active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Off</span>}
              </div>
              {a.description && <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>}
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {a.adkAppName} · {a.adkBaseUrl}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.chatCount} {a.chatCount === 1 ? 'chat' : 'chats'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => open(a)} aria-label={`Edit ${a.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive" onClick={() => void remove(a)} aria-label={`Delete ${a.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 pt-safe sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle>{editing?.id ? 'Edit assistant' : 'Add assistant'}</SheetTitle>
            <SheetDescription className="text-xs">Chats go through this app; the assistant server is never reached directly.</SheetDescription>
          </SheetHeader>
          {editing && (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="as-name">Name</Label>
                  <Input id="as-name" value={editing.form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ayu for Management" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="as-desc">Description</Label>
                  <Input
                    id="as-desc"
                    value={editing.form.description ?? ''}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Helps management draft, summarise and plan"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Who it’s for</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUDIENCES.map((aud: Audience) => (
                      <button
                        key={aud}
                        type="button"
                        onClick={() => set('audience', aud)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-sm font-medium',
                          editing.form.audience === aud ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                        )}
                      >
                        {AUDIENCE_LABEL[aud]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{AUDIENCE_HINT[editing.form.audience]}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="as-url">Server address</Label>
                  <Input
                    id="as-url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={editing.form.adkBaseUrl}
                    onChange={(e) => set('adkBaseUrl', e.target.value)}
                    placeholder="https://ruhunuai-xxxx.run.app"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="as-app">App name on the server</Label>
                  <div className="flex gap-2">
                    <Input
                      id="as-app"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={editing.form.adkAppName}
                      onChange={(e) => set('adkAppName', e.target.value)}
                      placeholder="ayu_management"
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={runTest} disabled={!editing.form.adkBaseUrl.trim() || test.status === 'testing'} className="shrink-0">
                      {test.status === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                    </Button>
                  </div>
                  {test.status === 'done' && (
                    <div className={cn('rounded-xl px-3 py-2 text-xs', test.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}>
                      <p className="flex items-center gap-1.5">
                        {test.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {test.message}
                      </p>
                      {!!test.apps?.length && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {test.apps.map((app) => (
                            <button
                              key={app}
                              type="button"
                              onClick={() => {
                                set('adkAppName', app);
                                setTest({ status: 'idle' });
                              }}
                              className="rounded-full border border-border bg-background px-2.5 py-1 font-mono text-foreground"
                            >
                              {app}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="as-greet">Greeting (optional)</Label>
                  <Textarea
                    id="as-greet"
                    rows={2}
                    value={editing.form.greeting ?? ''}
                    onChange={(e) => set('greeting', e.target.value)}
                    placeholder="Shown at the start of a new chat"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 space-y-1.5">
                    <Label htmlFor="as-order">Order</Label>
                    <Input
                      id="as-order"
                      type="number"
                      inputMode="numeric"
                      value={editing.form.sortOrder}
                      onChange={(e) => set('sortOrder', Number(e.target.value) || 0)}
                    />
                  </div>
                  <label className="mt-6 flex flex-1 items-center justify-between gap-3 rounded-xl border px-3 py-2">
                    <span className="text-sm">On</span>
                    <Switch checked={editing.form.active !== false} onCheckedChange={(v) => set('active', v)} />
                  </label>
                </div>
              </div>
              <div className="flex gap-2 border-t px-4 py-3 pb-safe">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
