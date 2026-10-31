'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, KeyRound, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  CustomAlertDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast
} from '@archmage/ui';
import {
  deleteApiClientAction,
  rotateApiClientSecretAction
} from '@/app/actions/api-client.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { ApiClientRecord } from '@/types/api-client';

type Props = {
  record: ApiClientRecord;
};

export default function ApiClientRecordActions({ record }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const canEdit = has('users', 'edit');
  const canDelete = has('users', 'delete');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secretReveal, setSecretReveal] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  if (!canEdit && !canDelete) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteApiClientAction(record.id);
      toast({
        variant: 'success',
        title: 'Deleted',
        description: `${record.name} was deleted.`
      });
      setDeleteOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description:
          error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRotate = async () => {
    setLoading(true);
    const result = await rotateApiClientSecretAction(record.id);
    setLoading(false);
    if (result.isError || !result.data?.clientSecret) {
      toast({
        variant: 'destructive',
        title: 'Could not rotate secret',
        description:
          (result.errors as { message?: string })?.message ??
          'Please try again.'
      });
      return;
    }
    setRotateOpen(false);
    setSecretReveal({
      clientId: result.data.clientId,
      clientSecret: result.data.clientSecret
    });
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-end gap-1">
        {canEdit ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${record.name}`}
              onClick={() => router.push(`/api-clients/${record.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={`Rotate secret for ${record.name}`}
              onClick={() => setRotateOpen(true)}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
          </>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${record.name}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        loading={loading}
        title="Delete API client?"
        description={`This permanently deletes “${record.name}”. The website will no longer be able to obtain tokens with these credentials.`}
        handleContinue={() => void handleDelete()}
      />

      <CustomAlertDialog
        open={rotateOpen}
        handleVisibilityChange={setRotateOpen}
        loading={loading}
        title="Rotate client secret?"
        description={`A new secret will be generated for “${record.name}”. The current secret stops working immediately. Copy the new secret once.`}
        handleContinue={() => void handleRotate()}
      />

      <Dialog
        open={!!secretReveal}
        onOpenChange={(open) => {
          if (!open) setSecretReveal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New client secret</DialogTitle>
            <DialogDescription>
              Save the client secret now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {secretReveal ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2 rounded-md bg-muted p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm">
                    Client ID
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void navigator.clipboard.writeText(secretReveal.clientId)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all font-mono text-sm">
                  {secretReveal.clientId}
                </p>
              </div>
              <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                    Client secret (show once)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        secretReveal.clientSecret
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all font-mono text-sm">
                  {secretReveal.clientSecret}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setSecretReveal(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
