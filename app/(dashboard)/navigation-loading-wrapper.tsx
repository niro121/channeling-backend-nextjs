"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createPortal } from "react-dom"

function getPathnameFromHref(href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return null
  try {
    const url = href.startsWith("http") ? new URL(href) : new URL(href, window.location.origin)
    return url.pathname
  } catch {
    return href.startsWith("/") ? href.split("?")[0] : null
  }
}

/** Internal same-origin navigation (sidebar, main content, add/edit, etc.). */
function isInternalNavigation(link: HTMLAnchorElement, path: string | null): boolean {
  if (!path || path === "/") return false
  if (link.target === "_blank" || link.hasAttribute("download")) return false
  try {
    const origin = link.href ? new URL(link.href).origin : ""
    if (origin && origin !== window.location.origin) return false
  } catch {
    return false
  }
  return true
}

const LOADING_OVERLAY = (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
    role="status"
    aria-label="Loading"
  >
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    <p className="text-sm text-muted-foreground">Loading…</p>
  </div>
)

/**
 * Intercepts clicks on internal links (sidebar, main content, add/edit) and shows
 * a full-page loading overlay immediately, then navigates. Listens on document so
 * sidebar and header links are included. Use normal <Link> everywhere.
 */
export function NavigationLoadingWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    setNavigating(false)
  }, [pathname])

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const link = (e.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!link) return

      const href = link.getAttribute("href")
      const path = getPathnameFromHref(href ?? "")
      if (!isInternalNavigation(link, path)) return

      // Skip if we're already on this path (e.g. same page link)
      if (path === pathname) return

      e.preventDefault()
      e.stopPropagation()
      setNavigating(true)
      router.push(href ?? path)
    },
    [router, pathname]
  )

  useEffect(() => {
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [handleClick])

  const overlay =
    typeof document !== "undefined" &&
    navigating &&
    createPortal(LOADING_OVERLAY, document.body)

  return (
    <>
      {children}
      {overlay}
    </>
  )
}
