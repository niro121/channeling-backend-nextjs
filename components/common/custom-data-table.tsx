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
import { BinIcon } from "../icons"
import { useToast } from "../hooks/use-toast"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  rowCount: number
  heading: string
  subHeading: string
  limit?: string,
  page?: string,
  haveBulkDelete?: boolean
  haveDataDownload?: boolean
  deleteServerAction?: (ids: string[]) => Promise<boolean>
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
  deleteServerAction
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
      <Card className="rounded-sm">
        <CardHeader className="flex flex-col sm:flex-row items-center sm:justify-between gap-y-4">
          <div className="w-full text-start">
            <CardTitle className="text-xl">{heading}</CardTitle>
            <CardDescription>{subHeading}</CardDescription>
          </div>
          <div className="flex gap-3">
            {
              haveBulkDelete &&
              <div className="w-full order-first sm:order-last text-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-red-500 text-red-500 px-8 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white h-[40px]"
                  disabled={Object.keys(rowSelection).length === 0}
                  onClick={() => setShowDelConfirmation(true)}
                >
                  <BinIcon />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Bulk Delete
                  </span>
                </Button>
              </div>
            }
            {/* {
              haveDataDownload &&
              <div className="w-full order-first sm:order-last text-end">
                <DownloadResults
                  disabled={Object.keys(rowSelection).length === 0 || loading}
                  data={data}
                  rowSelection={rowSelection}
                  table={table}
                />
              </div>
            } */}
          </div>

        </CardHeader>
        <CardContent>
          <Table className="border">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="py-5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
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
                      <TableCell key={cell.id} className="font-semibold py-5">
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
                  <TableCell colSpan={columns.length} className="text-center">
                    No Results Found !
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="w-full justify-between">
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
