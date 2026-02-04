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
import CustomAlertDialog from "./custom-alert-dialog"
import { DataTablePagination } from "./custom-data-table-pagination"
import { useToast } from "../hooks/use-toast"
import { Trash2 } from "lucide-react"

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
  /** Renders inside the card above the table (e.g. search + Add button), like shadcn tasks example */
  toolbar?: React.ReactNode
  /** Left side of toolbar (e.g. search). When used with toolbarRight, Add stays right and Bulk delete appears to its left when selected */
  toolbarLeft?: React.ReactNode
  /** Right side of toolbar (e.g. Add button). Rendered to the right of Bulk delete when rows selected */
  toolbarRight?: React.ReactNode
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
  toolbar,
  toolbarLeft,
  toolbarRight,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const [rowSelection, setRowSelection] = React.useState({})
  const [showDeleteConfirmation, setShowDelConfirmation] = React.useState(false)
  const [loading, setLoading] = React.useState(false)


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
      await deleteServerAction(idsToDelete)
      toast({
        variant: "success",
        title: "Success",
        description: "Records were deleted successfully",
      })

      setShowDelConfirmation(false)
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

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value)
  }

  // const downloadDataResults = async() => {
  //   console.log('rowse',rowSelection);

  // }

  useEffect(() => {
    if (limit) {
      table.setPageSize(Number(limit))
    }

    if (page) {
      table.setPageIndex(Number(page))
    }
  }, [table, limit, page])

  return (
    <>
      <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle className="text-lg font-semibold">{heading}</CardTitle>
            <CardDescription className="text-muted-foreground">{subHeading}</CardDescription>
          </div>
        </CardHeader>
        {(toolbar != null || toolbarLeft != null || toolbarRight != null || haveBulkDelete) ? (
          <div className={`flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-center ${(toolbar != null || toolbarLeft != null || toolbarRight != null) ? 'sm:justify-between' : 'sm:justify-end'}`}>
            {toolbarLeft != null || toolbarRight != null ? (
              <>
                {toolbarLeft ?? null}
                <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
                  {haveBulkDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 min-w-[7rem] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:invisible"
                      disabled={Object.keys(rowSelection).length === 0}
                      onClick={() => setShowDelConfirmation(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Bulk delete</span>
                    </Button>
                  ) : null}
                  {toolbarRight ?? null}
                </div>
              </>
            ) : (
              <>
                {toolbar ?? null}
                {haveBulkDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:invisible"
                    disabled={Object.keys(rowSelection).length === 0}
                    onClick={() => setShowDelConfirmation(true)}
                  >
                    <Trash2 className="h-4 w-4" />
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
      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete these
            records and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />
    </>
  )
}
