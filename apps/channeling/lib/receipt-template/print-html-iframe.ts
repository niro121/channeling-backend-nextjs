/**
 * Print HTML through an off-screen iframe sized like a real page.
 * A 0×0 iframe makes Chrome shrink the job. The 8.5in × 11in default is the tractor
 * printable width; callers with a different page box (e.g. the A5 booking receipt) pass their own.
 */
export function printHtmlInIframe(
  html: string,
  options?: { title?: string; width?: string; height?: string }
) {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", options?.title ?? "Print receipt")
  const width = options?.width ?? "8.5in"
  const height = options?.height ?? "11in"
  iframe.setAttribute(
    "style",
    `position:fixed;left:-10000px;top:0;width:${width};height:${height};border:0`
  )
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document
  const win = iframe.contentWindow
  if (!doc || !win) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  const runPrint = () => {
    try {
      win.focus()
      win.print()
    } finally {
      window.setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 1500)
    }
  }
  if (doc.readyState === "complete") {
    window.setTimeout(runPrint, 250)
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 250)
  }
}
