import React from 'react';
import LoginForm from './login-form';
import { StripCredentialQuery } from './strip-credential-query';
import { fetchServerSession } from '@/lib/session';
import { redirect, RedirectType } from 'next/navigation';
import { getSafeInternalPath } from '@/lib/safe-internal-path';

const CREDENTIAL_QUERY_KEYS = ['email', 'username', 'password'] as const;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const page = async ({ searchParams }: PageProps) => {
  const params = (await searchParams) ?? {};
  const hasCredentialInUrl = CREDENTIAL_QUERY_KEYS.some((key) => {
    const value = params[key];
    if (value == null) return false;
    return Array.isArray(value) ? value.length > 0 : String(value).length > 0;
  });
  if (hasCredentialInUrl) {
    redirect('/login', RedirectType.replace);
  }

  const session = await fetchServerSession();

  if (session?.error === 'SessionInvalidated') {
    return redirect('/session-ended', RedirectType.replace);
  }

  if (session) {
    const callbackUrl = getSafeInternalPath(params.callbackUrl, '/welcome');
    return redirect(callbackUrl, RedirectType.replace);
  }
  return (
    <>
      <StripCredentialQuery />
      <LoginForm callbackUrl={getSafeInternalPath(params.callbackUrl, '/welcome')} />
    </>
  );
};

export default page;