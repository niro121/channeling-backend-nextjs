"use client";

import { useEffect, useState } from "react";

export function DashboardLoadingUI() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, []);

  if (!show) {
    return <div className="flex min-h-[280px] items-center justify-center" aria-hidden><div className="h-8 w-8" /></div>;
  }

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4" role="status" aria-label="Loading">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
