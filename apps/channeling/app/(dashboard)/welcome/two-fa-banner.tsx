'use client';

import { useEffect, useState } from 'react';

const EVENT_2FA_STATUS_CHANGED = '2fa-status-changed';

export function twoFADispatchStatusChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_2FA_STATUS_CHANGED));
  }
}

export function TwoFABanner() {
  const [showBanner, setShowBanner] = useState<boolean | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa-status', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        // Show banner only when authenticator is NOT set up (2FA not activated)
        setShowBanner(!data.userPreference2FA);
      } else {
        setShowBanner(false);
      }
    } catch {
      setShowBanner(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const handleChange = () => fetchStatus();
    window.addEventListener(EVENT_2FA_STATUS_CHANGED, handleChange);
    return () => window.removeEventListener(EVENT_2FA_STATUS_CHANGED, handleChange);
  }, []);

  if (showBanner === null || !showBanner) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4">
      <p className="font-medium text-red-600 dark:text-red-400">
        Two Factor Authentication (2FA) is not activated.
      </p>
    </div>
  );
}
