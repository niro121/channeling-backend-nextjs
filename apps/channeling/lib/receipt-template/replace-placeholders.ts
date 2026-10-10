import type { ReceiptPlaceholderMap } from "@/types/receipt-template-db"

/** Replace {{key}} in content with values from map. Keys are case-sensitive. Safe for client. */
export function replacePlaceholders(
  content: string,
  placeholders: ReceiptPlaceholderMap
): string {
  let out = content
  for (const [key, value] of Object.entries(placeholders)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g")
    out = out.replace(re, value ?? "")
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
