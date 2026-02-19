"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
//ANCHOR -
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "../ui/button"
import CustomAlertDialogWithWarning from "./custom-alert-dialog-with-warning"
import { DataTablePagination } from "./custom-data-table-pagination"
import { useToast } from "../hooks/use-toast"
import { Loader2, Trash2 } from "lucide-react"

// Context for exposing table state and handlers
const DataTableContext = React.createContext<{
  rowSelection: Record<string, boolean>
  showHideDeleteModal: (value: boolean) => Promise<void>
  fetchingDescription: boolean
} | null>(null)

export const useDataTableContext = () => {
  const context = React.useContext(DataTableContext)
  if (!context) {
    throw new Error('useDataTableContext must be used within CustomDataTable')
  }
  return context
}

// Bulk Delete Button component that can be used in toolbarLeft
export const BulkDeleteButton = ({ className }: { className?: string }) => {
  const { rowSelection, showHideDeleteModal, fetchingDescription } = useDataTableContext()
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-9 min-w-[7rem] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:invisible cursor-pointer ${className || ''}`}
      disabled={Object.keys(rowSelection).length === 0}
      onClick={() => showHideDeleteModal(true)}
    >
      {fetchingDescription ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      <span>Bulk Delete</span>
    </Button>
  )
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  rowCount: number
  heading: string
  subHeading: string
  limit?: string
  page?: string
  haveBulkDelete?: boolean
  haveDataDownload?: boolean
  deleteServerAction?: (ids: string[]) => Promise<boolean>
  /** Optional function to get custom bulk delete description. Receives selected IDs and returns description string or Promise<string> */
  getBulkDeleteDescription?: (ids: string[]) => Promise<string> | string
  /** Renders inside the card above the table (e.g. search + Add button), like shadcn tasks example */
  toolbar?: React.ReactNode
  /** Left side of toolbar (e.g. search). When used with toolbarRight, Add stays right and Bulk delete appears to its left when selected */
  toolbarLeft?: React.ReactNode
  /** Right side of toolbar (e.g. Add button). Rendered to the right of Bulk delete when rows selected */
  toolbarRight?: React.ReactNode
  /** If true, hides the automatic bulk delete button (useful when you want to place it manually in toolbarLeft/toolbarRight) */
  hideAutoBulkDelete?: boolean
}

export function CustomDataTable<TData, TValue>({
  columns,
  data,
  rowCount,
  heading,
  subHeading,
  limit,
  page,
  haveBulkDelete = true,
  haveDataDownload = false,
  deleteServerAction,
  getBulkDeleteDescription,
  toolbar,
  toolbarLeft,
  toolbarRight,
  hideAutoBulkDelete = false,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const [rowSelection, setRowSelection] = React.useState({})
  const [showDeleteConfirmation, setShowDelConfirmation] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [fetchingDescription, setFetchingDescription] = React.useState(false)
  const [bulkDeleteDescription, setBulkDeleteDescription] = React.useState<string>(
    "This action cannot be undone. This will permanently delete these records and remove the data from our servers."
  )


  const table = useReactTable({
    data,
    columns,
    rowCount,
    enableRowSelection: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

  const getNewSearchParams = (value: number, filter: string) => {
    const params = new URLSearchParams()

    if (searchParams && searchParams.keys()) {
      Array.from(searchParams.keys()).forEach((key: string) => {
        if (key !== filter) {
          params.set(key, String(searchParams.get(key)))
        }
      })
    }

    //finally set page
    params.set(filter, String(value))

    if (filter === 'limit' && ((rowCount / value) < 1)) {
      params.delete('page')
    }

    return router.replace(`${pathname}/?${params.toString()}`)
  }

  const onLimitChange = (limit: number) => {
    getNewSearchParams(limit, "limit")
  }

  const onPageChange = (page: number) => {
    getNewSearchParams(page, "page")
  }

  const onDeleteConfirmation = async () => {
    const idsToDelete: string[] = []

    Object.keys(rowSelection).forEach((item) => {
      const row = table.getRow(item).original as { id: string }
      if (row.id) {
        idsToDelete.push(row.id)
      }
    })

    if (!deleteServerAction) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Bulk Delete not available.",
      })
      return
    }

    try {
      setLoading(true)
      const success = await deleteServerAction(idsToDelete)
      setShowDelConfirmation(false)

      if (!success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Records could not be deleted. Please try again.",
        })
        return
      }

      toast({
        variant: "success",
        title: "Success",
        description: "Records were deleted successfully",
      })
      setRowSelection({})
      router.refresh()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message ?? "Error deleting records. please try again later.",
      })
    } finally {
      setLoading(false)
      setShowDelConfirmation(false)
    }
  }

  const showHideDeleteModal = async (value: boolean) => {
    if (value) {
      // When opening the modal, fetch custom description if provided
      const idsToDelete: string[] = []
      Object.keys(rowSelection).forEach((item) => {
        const row = table.getRow(item).original as { id: string }
        if (row.id) {
          idsToDelete.push(row.id)
        }
      })

      if (getBulkDeleteDescription && idsToDelete.length > 0) {
        setFetchingDescription(true)
        try {
          const description = await getBulkDeleteDescription(idsToDelete)
          setBulkDeleteDescription(description)
          // Only show modal after description is fetched
          setShowDelConfirmation(true)
        } catch (error: any) {
          console.error('Error fetching bulk delete description:', error)
          // Fallback to default description on error
          setBulkDeleteDescription(
            "This action cannot be undone. This will permanently delete these records and remove the data from our servers."
          )
          setShowDelConfirmation(true)
        } finally {
          setFetchingDescription(false)
        }
      } else {
        // Use default description
        setBulkDeleteDescription(
          "This action cannot be undone. This will permanently delete these records and remove the data from our servers."
        )
        setShowDelConfirmation(true)
      }
    } else {
      // When closing, reset description
      setBulkDeleteDescription(
        "This action cannot be undone. This will permanently delete these records and remove the data from our servers."
      )
      setShowDelConfirmation(false)
    }
  }

  // const downloadDataResults = async() => {
  //   console.log('rowse',rowSelection);

  // }

  // Convert description string to component with bold doctor count
  const formatDescription = (text: string): React.ReactNode => {
    // Check if description contains doctor count (warning message)
    const doctorCountMatch = text.match(/(\d+)\s+doctor\(s\)/i)
    if (doctorCountMatch) {
      const parts = text.split(/(\d+\s+doctor\(s\))/i)
      return (
        <>
          {parts.map((part, index) => {
            if (part.match(/\d+\s+doctor\(s\)/i)) {
              return (
                <strong key={index} style={{ fontWeight: 700 }}>
                  {part}
                </strong>
              )
            }
            // Handle newlines by splitting and adding <br /> elements
            const lines = part.split('\n')
            return (
              <span key={index}>
                {lines.map((line, lineIndex) => (
                  <React.Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </span>
            )
          })}
        </>
      )
    }
    // For non-warning messages, handle newlines
    const lines = text.split('\n')
    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {index > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </>
    )
  }

  // Check if description has warning (contains doctor count or department warning)
  const hasWarning = bulkDeleteDescription.includes("doctor(s)") || 
                     bulkDeleteDescription.includes("linked to other system records")

  useEffect(() => {
    if (limit) {
      table.setPageSize(Number(limit))
    }

    if (page) {
      table.setPageIndex(Number(page))
    }
  }, [table, limit, page])

  const contextValue = React.useMemo(() => ({
    rowSelection,
    showHideDeleteModal,
    fetchingDescription,
  }), [rowSelection, fetchingDescription])

  return (
    <DataTableContext.Provider value={contextValue}>
      <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle className="text-lg font-semibold">{heading}</CardTitle>
            <CardDescription className="text-muted-foreground">{subHeading}</CardDescription>
          </div>
        </CardHeader>
        {(toolbar != null || toolbarLeft != null || toolbarRight != null || haveBulkDelete) ? (
          <div className={`flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-start ${(toolbar != null || toolbarLeft != null || toolbarRight != null) ? 'sm:justify-between' : 'sm:justify-end'}`}>
            {toolbarLeft != null || toolbarRight != null ? (
              <>
                <React.Fragment key="toolbar-left">{toolbarLeft ?? null}</React.Fragment>
                <div key="toolbar-right" className="flex flex-1 items-start justify-end gap-2 sm:flex-initial">
                  {haveBulkDelete && !hideAutoBulkDelete ? (
                    <Button
                      key="bulk-delete-btn"
                      variant="ghost"
                      size="sm"
                      className="h-9 min-w-[7rem] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:invisible cursor-pointer"
                      disabled={Object.keys(rowSelection).length === 0}
                      onClick={() => showHideDeleteModal(true)}
                    >

                      {fetchingDescription ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span>Bulk Delete</span>
                    </Button>
                  ) : null}
                  {toolbarRight != null ? (
                    <React.Fragment key="toolbar-right-slot">{toolbarRight}</React.Fragment>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                {toolbar ?? null}
                {haveBulkDelete ? (
                  <Button
                    key="bulk-delete"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:invisible"
                    disabled={Object.keys(rowSelection).length === 0}
                    onClick={() => setShowDelConfirmation(true)}
                  >
                    {fetchingDescription ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Bulk delete</span>
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        <CardContent className="px-0 pb-0">
          <div className="px-4 pb-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <DataTablePagination
              table={table}
              onLimitChange={onLimitChange}
              onPageChange={onPageChange}
            />
          </div>
        </CardFooter>
      </Card>
      <CustomAlertDialogWithWarning
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading || fetchingDescription}
        title="Are you absolutely sure?"
        description={fetchingDescription ? <span>Loading...</span> : formatDescription(bulkDeleteDescription)}
        handleContinue={onDeleteConfirmation}
        hasWarning={hasWarning}
      />
    </DataTableContext.Provider>
  )
}