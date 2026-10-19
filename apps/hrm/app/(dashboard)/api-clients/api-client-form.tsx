'use client';

import { useEffect, useState } from 'react';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import {
  Button,
  CustomFormField,
  CustomMultiSelect,
  CustomSelectField,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Switch,
  useToast
} from '@archmage/ui';
import {
  createApiClientAction,
  getApiClientUserOptionsAction,
  updateApiClientAction
} from '@/app/actions/api-client.actions';
import { CustomFormSubmitBtns } from '@/components/custom/custom-form-submit-btns';
import {
  DEFAULT_PUBLIC_API_SCOPES,
  PUBLIC_API_SCOPE_OPTIONS
} from '@/lib/permissions';
import type { ApiClientRecord } from '@/types/api-client';

type ApiClientFormProps = {
  apiClient: ApiClientRecord | null;
};

type FormValues = {
  name: string;
  actingUserId: string;
  isBlocked: boolean;
  scopes: string[];
};

const styleClasses = {
  parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'col-span-full sm:col-span-3'
};

export default function ApiClientForm({ apiClient }: ApiClientFormProps) {
  const isEdit = Boolean(apiClient?.id);
  const [loading, setLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>(
    []
  );
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setUserOptionsLoading(true);
      const res = await getApiClientUserOptionsAction();
      setUserOptionsLoading(false);
      if (!res.isError && res.data) setUserOptions(res.data);
    };
    void load();
  }, []);

  const initialValues: FormValues = {
    name: apiClient?.name ?? '',
    actingUserId: apiClient?.actingUserId ?? '',
    isBlocked: apiClient?.isBlocked ?? false,
    scopes:
      apiClient?.scopes?.length
        ? [...apiClient.scopes]
        : [...DEFAULT_PUBLIC_API_SCOPES]
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required('Name is required')
      .max(150, 'Must be less than 150 characters'),
    actingUserId: Yup.string().required('API User is required'),
    isBlocked: Yup.boolean().required(),
    scopes: Yup.array()
      .of(Yup.string())
      .min(1, 'Select at least one scope')
  });

  const handleSubmit = async (
    values: FormValues,
    helpers: FormikHelpers<FormValues>
  ) => {
    setLoading(true);
    try {
      if (isEdit && apiClient?.id) {
        const result = await updateApiClientAction(apiClient.id, {
          name: values.name.trim(),
          isBlocked: values.isBlocked,
          actingUserId: values.actingUserId.trim(),
          scopes: values.scopes
        });
        setLoading(false);
        if (result.isError) {
          toast({
            variant: 'destructive',
            title: 'Could not save',
            description:
              (result.errors as { message?: string })?.message ??
              'Please try again.'
          });
          return;
        }
        toast({
          variant: 'success',
          title: 'Saved',
          description: 'API client was updated successfully.'
        });
        router.push('/api-clients');
        router.refresh();
        return;
      }

      const result = await createApiClientAction({
        name: values.name.trim(),
        actingUserId: values.actingUserId.trim(),
        scopes: values.scopes
      });
      setLoading(false);

      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Could not create',
          description:
            (result.errors as { message?: string })?.message ??
            'Please try again.'
        });
        return;
      }

      if (result.data.clientSecret) {
        setCreatedSecret({
          clientId: result.data.clientId,
          clientSecret: result.data.clientSecret
        });
        helpers.resetForm();
      } else {
        toast({
          variant: 'success',
          title: 'Created',
          description: 'API client was created successfully.'
        });
        router.push('/api-clients');
      }
    } catch (error: unknown) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An error occurred.'
      });
    }
  };

  return (
    <>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize={isEdit}
        onSubmit={handleSubmit}
      >
        {(formik) => (
          <Form className="w-full space-y-4">
            <div className="grid gap-4 rounded-lg border p-6">
              <CustomFormField
                type="text"
                id="name"
                placeholder="Application name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
                styleClasses={styleClasses}
              />

              <CustomSelectField
                id="actingUserId"
                placeholder="API User"
                value={formik.values.actingUserId}
                onChange={(value) => {
                  formik.setFieldValue('actingUserId', value);
                  formik.setFieldTouched('actingUserId', true);
                }}
                required
                options={userOptions}
                styleClasses={styleClasses}
                loading={userOptionsLoading}
              />
              {!userOptionsLoading && userOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No API Users found. Create a user with type{' '}
                  <strong>API User</strong> under Users first.
                </p>
              ) : null}

              <CustomMultiSelect
                id="scopes"
                placeholder="Scopes"
                value={formik.values.scopes}
                onChange={(ids) => formik.setFieldValue('scopes', ids)}
                required
                options={PUBLIC_API_SCOPE_OPTIONS}
                styleClasses={styleClasses}
              />
              {formik.touched.scopes && formik.errors.scopes ? (
                <p className="text-destructive text-xs">
                  {formik.errors.scopes as string}
                </p>
              ) : null}

              {isEdit ? (
                <div className={styleClasses.parentDiv}>
                  <Label
                    className={styleClasses.labelClassName}
                    htmlFor="isBlocked"
                  >
                    Blocked
                  </Label>
                  <div className={styleClasses.inputClassName}>
                    <Switch
                      id="isBlocked"
                      checked={formik.values.isBlocked}
                      onCheckedChange={(checked) =>
                        formik.setFieldValue('isBlocked', !!checked)
                      }
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      When blocked, this client cannot obtain tokens or call the
                      public API.
                    </span>
                  </div>
                </div>
              ) : null}

              {isEdit && apiClient?.clientId ? (
                <div className={styleClasses.parentDiv}>
                  <Label className={styleClasses.labelClassName}>
                    Client ID
                  </Label>
                  <p className={`${styleClasses.inputClassName} font-mono text-sm break-all`}>
                    {apiClient.clientId}
                  </p>
                </div>
              ) : null}

              <CustomFormSubmitBtns
                loading={loading}
                onCancel={() => router.push('/api-clients')}
                onSave={() => void formik.submitForm()}
                onSaveAndClose={() => void formik.submitForm()}
              />
            </div>
          </Form>
        )}
      </Formik>

      <Dialog
        open={!!createdSecret}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedSecret(null);
            router.push('/api-clients');
            router.refresh();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API client created</DialogTitle>
            <DialogDescription>
              Save the client secret now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {createdSecret ? (
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
                      void navigator.clipboard.writeText(createdSecret.clientId)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all font-mono text-sm">
                  {createdSecret.clientId}
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
                        createdSecret.clientSecret
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="break-all font-mono text-sm">
                  {createdSecret.clientSecret}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setCreatedSecret(null);
                router.push('/api-clients');
                router.refresh();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
