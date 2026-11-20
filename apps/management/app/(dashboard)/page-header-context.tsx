'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

/**
 * Inner pages (anything below a main section, e.g. /stays/stats) show a back button and their
 * own title in the top bar instead of the ☰ menu, and hide the bottom tabs.
 */
export type InnerPageHeader = {
  title: string;
  subtitle?: string | null;
  /** Custom back (e.g. previous step of a form); default goes to the parent page. */
  onBack?: () => void;
};

type Ctx = { header: InnerPageHeader | null; set: (h: InnerPageHeader | null) => void };
const PageHeaderContext = createContext<Ctx>({ header: null, set: () => undefined });

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, set] = useState<InnerPageHeader | null>(null);
  return <PageHeaderContext.Provider value={{ header, set }}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderState() {
  return useContext(PageHeaderContext).header;
}

/** Call from an inner page to set the top bar's title (and optional custom back). */
export function useInnerPageHeader(header: InnerPageHeader) {
  const { set } = useContext(PageHeaderContext);
  const onBack = useRef(header.onBack);
  onBack.current = header.onBack;
  const hasBack = Boolean(header.onBack);
  useEffect(() => {
    set({ title: header.title, subtitle: header.subtitle, onBack: hasBack ? () => onBack.current?.() : undefined });
  }, [set, header.title, header.subtitle, hasBack]);
  useEffect(() => () => set(null), [set]);
}

/** True below a main section: /stays/stats, /stays/<id>, /stays/check-in … */
export function isInnerPath(pathname: string | null): boolean {
  return (pathname ?? '').split('/').filter(Boolean).length > 1;
}

/** Where back goes by default: one level up. */
export function parentPath(pathname: string | null): string {
  const parts = (pathname ?? '').split('/').filter(Boolean);
  return parts.length > 1 ? `/${parts.slice(0, -1).join('/')}` : '/dashboard';
}
