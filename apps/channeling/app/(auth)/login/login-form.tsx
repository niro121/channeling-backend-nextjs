'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Formik, Form, ErrorMessage, FormikHelpers } from 'formik';
import { signIn } from 'next-auth/react';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Smartphone, MessageSquare, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TWO_FACTOR_AUTH } from '@/types/2FA';
import { FirstLoginPasswordDialog } from '@/app/(auth)/login/first-login-password-dialog';

interface FormValues {
  email: string;
  password: string;
  twoFactorCode: string;
  invalidCredentials: string;
}

interface Pending2FA {
  email: string;
  password: string;
  allowedMethods: string[];
  selectedMethod?: string;
  twoFactorToken?: string | null;
  message?: string;
  needsSetup?: boolean;
  uri?: string;
  secret?: string;
}

// EMAIL ('3') currently unavailable in UI — icon commented out
const METHOD_ICONS: Record<string, React.ReactNode> = {
  '1': <Smartphone className="h-5 w-5" />,
  '2': <MessageSquare className="h-5 w-5" />,
  // '3': <Mail className="h-5 w-5" />,
};

const LoginForm = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending2FA, setPending2FA] = useState<Pending2FA | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordChangeEmail, setPasswordChangeEmail] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const initialValues: FormValues = {
    email: '',
    password: '',
    twoFactorCode: '',
    invalidCredentials: ''
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      if (pending2FA?.selectedMethod) {
        // SMS ('2') does not use twoFactorToken; only AUTH-APP ('1') does (EMAIL '3' currently unavailable in UI)
        const useToken = pending2FA.selectedMethod === '1' ? (pending2FA.twoFactorToken ?? undefined) : undefined;
        const result = await signIn('credentials', {
          redirect: false,
          username: pending2FA.email,
          password: pending2FA.password,
          twoFactorCode: values.twoFactorCode.trim(),
          twoFactorToken: useToken
        });
        if (result?.error) {
          setErrors({ invalidCredentials: 'Invalid or expired code. Try again or choose another method.' });
          return;
        }
        setIsRedirecting(true);
        router.replace('/welcome');
        return;
      }

      const checkRes = await fetch('/api/auth/check-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password })
      });
      const checkData = await checkRes.json().catch(() => ({}));

      if (checkRes.status === 401) {
        setErrors({ invalidCredentials: 'Invalid credentials' });
        return;
      }
      if (checkRes.status !== 200) {
        setErrors({ invalidCredentials: checkData?.error ?? 'Something went wrong' });
        return;
      }

      if (checkData.requiresPasswordChange === true) {
        setPasswordChangeEmail(values.email);
        setErrors({ invalidCredentials: '' });
        return;
      }

      if (checkData.requiresTwoFactor === true && Array.isArray(checkData.allowedMethods) && checkData.allowedMethods.length > 0) {
        setPending2FA({
          email: values.email,
          password: values.password,
          allowedMethods: checkData.allowedMethods
        });
        setErrors({ invalidCredentials: '' });
        return;
      }

      const result = await signIn('credentials', {
        redirect: false,
        username: values.email,
        password: values.password
      });

      if (result?.error) {
        setErrors({ invalidCredentials: 'Invalid credentials' });
        return;
      }

      setIsRedirecting(true);
      router.replace('/welcome');
    } catch (error: any) {
      console.error('auth-error', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message ?? 'Something went wrong.'
      });
    }
  };

  const handleSelectMethod = async (
    methodId: string,
    clearTwoFactorCode: () => void
  ) => {
    if (!pending2FA || requestingCode) return;
    clearTwoFactorCode();
    setRequestingCode(true);
    try {
      const res = await fetch('/api/auth/request-2fa-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pending2FA.email,
          password: pending2FA.password,
          method: methodId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data?.error ?? 'Could not send code. Try again.'
        });
        return;
      }
      setPending2FA((prev) =>
        prev
          ? {
              ...prev,
              selectedMethod: methodId,
              twoFactorToken: data.twoFactorToken ?? null,
              message: data.message ?? 'Enter your verification code below.',
              needsSetup: !!data.needsSetup,
              uri: data.uri,
              secret: data.secret
            }
          : null
      );
    } finally {
      setRequestingCode(false);
    }
  };

  const handleBackFrom2FA = (clearTwoFactorCode: () => void) => {
    clearTwoFactorCode();
    if (pending2FA?.selectedMethod) {
      setPending2FA((prev) =>
        prev
          ? { ...prev, selectedMethod: undefined, twoFactorToken: undefined, message: undefined, needsSetup: undefined, uri: undefined, secret: undefined }
          : null
      );
    } else {
      setPending2FA(null);
    }
  };

  const formatSecret = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim();
  const allowedMethodOptions = TWO_FACTOR_AUTH.filter((m) => pending2FA?.allowedMethods?.includes(m.id));

  return (
    <>
      <FirstLoginPasswordDialog
        open={!!passwordChangeEmail}
        email={passwordChangeEmail ?? ''}
        onClose={() => setPasswordChangeEmail(null)}
        onSuccess={async (email, newPassword) => {
          setPasswordChangeEmail(null);
          const result = await signIn('credentials', {
            redirect: false,
            username: email,
            password: newPassword
          });
          if (result?.error) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Invalid credentials'
            });
            return;
          }
          setIsRedirecting(true);
          router.replace('/welcome');
        }}
      />
      <div className="lg:hidden mb-6 text-center">
        <span className="text-xl font-semibold text-foreground">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'}</span>
      </div>
      <Card className="w-full border-0 shadow-none bg-transparent p-0">
        <CardHeader className="space-y-1 px-0 pt-0">
          <CardTitle className="text-2xl">
            {pending2FA
              ? pending2FA.selectedMethod
                ? pending2FA.needsSetup
                  ? 'Set up authenticator app'
                  : 'Enter verification code'
                : 'Choose verification method'
              : 'Login'}
          </CardTitle>
          <CardDescription>
            {pending2FA?.selectedMethod
              ? pending2FA.needsSetup
                ? 'Scan the QR code or enter the secret in your app, then enter the 6-digit code below.'
                : (pending2FA.message ?? 'Enter the code you received below.')
              : pending2FA
                ? 'Select how you want to receive your verification code.'
                : 'Enter your credentials to sign in to your account'}
          </CardDescription>
        </CardHeader>

        <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
          {(formik) => (
            <Form method="post" action="/login" className="w-full">
              <CardContent className="space-y-4 px-0 pb-0">
                {!pending2FA ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email or username</Label>
                      <Input
                        id="email"
                        name="email"
                        type="text"
                        autoComplete="username"
                        placeholder="Email or username"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="h-10"
                      />
                      <ErrorMessage name="email" component="div" className="text-sm text-destructive" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <ErrorMessage name="password" component="div" className="text-sm text-destructive" />
                      <ErrorMessage name="invalidCredentials" component="div" className="text-sm text-destructive" />
                    </div>
                  </>
                ) : pending2FA.selectedMethod ? (
                  <div className="space-y-4">
                    {pending2FA.needsSetup && pending2FA.uri && pending2FA.secret && (
                      <>
                        <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
                        <div className="flex justify-center rounded-lg border bg-white p-4 dark:bg-muted/30">
                          <QRCodeSVG value={pending2FA.uri} size={180} level="M" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Can&apos;t scan? Enter this code manually</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono tracking-wider break-all">
                              {formatSecret(pending2FA.secret)}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (pending2FA.secret) {
                                  navigator.clipboard.writeText(pending2FA.secret);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }
                              }}
                              aria-label="Copy secret"
                            >
                              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Add the account in your app, then enter the 6-digit code below.</p>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="twoFactorCode">Verification code</Label>
                      <Input
                        id="twoFactorCode"
                        name="twoFactorCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        value={formik.values.twoFactorCode}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="h-10 font-mono text-lg tracking-widest"
                      />
                      <ErrorMessage name="invalidCredentials" component="div" className="text-sm text-destructive" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select one of the options below to receive your code.</p>
                    <div className="grid gap-2">
                      {allowedMethodOptions.map((method) => (
                        <Button
                          key={method.id}
                          type="button"
                          variant="outline"
                          className="h-auto justify-start gap-3 py-3 px-4 text-left"
                          onClick={() =>
                            handleSelectMethod(method.id, () => {
                              formik.setFieldValue('twoFactorCode', '');
                              formik.setFieldError('invalidCredentials', undefined);
                            })
                          }
                          disabled={requestingCode}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
                            {METHOD_ICONS[method.id] ?? <Smartphone className="h-5 w-5" />}
                          </span>
                          <span className="font-medium">{method.option}</span>
                          {requestingCode && (
                            <span className="ml-auto text-muted-foreground text-sm">Sending…</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-4 px-0 pb-0 pt-6">
                {pending2FA && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() =>
                      handleBackFrom2FA(() => {
                        formik.setFieldValue('twoFactorCode', '');
                        formik.setFieldError('invalidCredentials', undefined);
                      })
                    }
                    disabled={formik.isSubmitting || requestingCode || isRedirecting}
                  >
                    {pending2FA.selectedMethod ? 'Choose another method' : 'Back to login'}
                  </Button>
                )}
                {pending2FA?.selectedMethod && (
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={formik.isSubmitting || isRedirecting || !formik.values.twoFactorCode.trim()}
                  >
                    {formik.isSubmitting || isRedirecting ? 'Signing in…' : 'Verify and sign in'}
                  </Button>
                )}
                {!pending2FA && (
                  <Button className="w-full" type="submit" disabled={formik.isSubmitting || isRedirecting}>
                    {formik.isSubmitting || isRedirecting ? 'Signing in…' : 'Sign in'}
                  </Button>
                )}
              </CardFooter>
            </Form>
          )}
        </Formik>
      </Card>
    </>
  );
};

export default LoginForm;
