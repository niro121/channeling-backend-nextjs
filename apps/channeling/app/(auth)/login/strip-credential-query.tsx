'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CREDENTIAL_QUERY_KEYS = ['email', 'username', 'password'] as const;

/** Remove credentials accidentally present in the URL (e.g. legacy GET form submit). */
export function StripCredentialQuery() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const hadCredential = CREDENTIAL_QUERY_KEYS.some((key) => url.searchParams.has(key));
    if (!hadCredential) return;

    CREDENTIAL_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
    const next = url.searchParams.toString();
    router.replace(next ? `/login?${next}` : '/login');
  }, [router]);

  return null;
}
