"use client"

import { useState } from "react"
import { Loader2, Search } from "lucide-react"
import { searchHmisPatientsAction } from "@/app/actions/hmis/search-patients.action"
import type { HmisPatientSearchResult } from "@/types/hmis-patient"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type SearchMode = "name" | "phone" | "identifier"

type HmisPatientSearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (patient: HmisPatientSearchResult) => void
}

export function HmisPatientSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: HmisPatientSearchDialogProps) {
  const [mode, setMode] = useState<SearchMode>("name")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<HmisPatientSearchResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function resetResults() {
    setResults([])
    setSelectedId(null)
    setError(null)
  }

  async function handleSearch() {
    const q = keyword.trim()
    if (!q) {
      setError("Enter a search value")
      return
    }
    setLoading(true)
    setError(null)
    setSelectedId(null)
    try {
      const params =
        mode === "name"
          ? { name: q }
          : mode === "phone"
            ? { phone: q }
            : { identifier: q }
      const res = await searchHmisPatientsAction(params)
      if (!res.success) {
        setResults([])
        setError(res.message)
        return
      }
      setResults(res.data)
      if (res.data.length === 0) {
        setError("No patients found")
      }
    } catch (err) {
      setResults([])
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    const patient = results.find((r) => r.id === selectedId)
    if (!patient) return
    onSelect(patient)
    onOpenChange(false)
    setKeyword("")
    resetResults()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setKeyword("")
          resetResults()
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm">Search HMIS Patient</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-stretch">
          <Select
            value={mode}
            onValueChange={(v) => {
              setMode(v as SearchMode)
              resetResults()
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[130px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name" className="text-xs">
                Name
              </SelectItem>
              <SelectItem value="phone" className="text-xs">
                Phone
              </SelectItem>
              <SelectItem value="identifier" className="text-xs">
                NIC / PHN / MRN
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs flex-1"
            placeholder={
              mode === "name"
                ? "Patient name"
                : mode === "phone"
                  ? "Phone / mobile"
                  : "NIC, PHN, or MRN"
            }
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSearch()
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 gap-1.5"
            onClick={() => void handleSearch()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Search
          </Button>
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2 py-1 text-xs">Name</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs">Sex</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs">Mobile</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs">MRN / NIC</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs">DOB</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(
                    "cursor-pointer text-xs",
                    selectedId === p.id
                      ? "bg-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:hover:bg-emerald-900/50"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedId(p.id)}
                  onDoubleClick={() => {
                    onSelect(p)
                    onOpenChange(false)
                    setKeyword("")
                    resetResults()
                  }}
                >
                  <TableCell className="px-2 py-1.5">
                    {[p.title, p.name].filter(Boolean).join(" ")}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 capitalize">
                    {p.sex ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">{p.phone ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    {p.mrn ?? p.nic ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {p.birthDate ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && results.length === 0 && !error && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-2 py-6 text-center text-xs text-muted-foreground"
                  >
                    Search by name, phone, or identifier
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedId}
            onClick={handleConfirm}
          >
            Use selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
