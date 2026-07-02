import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "../ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  onLimitChange: (value: number) => void
  onPageChange: (value: number) => void
  /** Rendered next to selection count (e.g. Bulk delete when rows selected) */
  leftActions?: React.ReactNode
}

export function DataTablePagination<TData>({
  table,
  onLimitChange,
  onPageChange,
  leftActions,
}: DataTablePaginationProps<TData>) {
  const setFirstPage = () => {
    table.setPageIndex(0)
    table.setRowSelection({})
    onPageChange(0)
  }

  const setLastPage = () => {
    table.setPageIndex(table.getPageCount() - 1)
    table.setRowSelection({})
    onPageChange(table.getPageCount() - 1)
  }

  const setNextPage = () => {
    table.nextPage()
    table.setRowSelection({})
    onPageChange(table.getState().pagination.pageIndex + 1)
  }

  const setPrevPage = () => {
    table.previousPage()
    table.setRowSelection({})
    onPageChange(table.getState().pagination.pageIndex - 1)
  }
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full py-2">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </span>
        {leftActions}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-x-4">
          <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
              onLimitChange(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-16 ml-2 focus-visible:outline-0!">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[1, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-x-4">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center gap-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={setFirstPage}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={setPrevPage}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={setNextPage}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={setLastPage}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

//NOTE - 
/* className="flex items-center space-x-6 lg:space-x-8" */
/* className="flex items-center justify-between px-2" */
/* className="flex-1 text-sm text-muted-foreground" */