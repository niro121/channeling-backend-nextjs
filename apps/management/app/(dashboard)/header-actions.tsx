'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const HEADER_ACTIONS_ID = 'app-header-actions';

/** Renders a page's buttons into the top bar (next to the avatar / profile menu). */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(HEADER_ACTIONS_ID));
  }, []);
  return target ? createPortal(children, target) : null;
}
