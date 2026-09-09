"use client"

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"

type CustomTableProps<TData, TValue> = {
  heading?: string
  subheading?: string
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  rowCount: number
  /** Tighter padding and row height for dense tables (e.g. Session Fees) */
  compact?: boolean
  /** Show the "Showing x to y" footer. Default true. Set false for inline tables. */
  showFooter?: boolean
  /** When true with compact, render table only (no Card wrapper). Use for embedding in a custom container. */
  noCard?: boolean
  /** Optional footer row: one cell per column. Renders as a single row in tfoot so it aligns with columns. */
  footerCells?: React.ReactNode[]
}

export default function CustomTable<TData, TValue>({
  heading,
  subheading,
  columns,
  data,
  rowCount,
  compact = false,
  showFooter = true,
  noCard = false,
  footerCells,
}: CustomTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    rowCount,
    getCoreRowModel: getCoreRowModel(),
  })
  const headerCellClass = compact ? 'py-2 px-2 text-xs font-medium' : 'py-5 px-0'
  const bodyCellClass = compact ? 'py-1.5 px-2 text-sm' : 'font-semibold py-5 px-0'
  const tableEl = (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className={headerCellClass}>
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
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={bodyCellClass}
                >
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
      {footerCells != null && footerCells.length === columns.length && (
        <TableFooter>
          <TableRow className="border-t bg-muted font-semibold">
            {footerCells.map((cell, i) => (
              <TableCell
                key={i}
                className={compact ? 'py-2 px-2 text-xs' : 'py-5 px-0'}
              >
                {cell}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
  if (noCard && compact) {
    return <div className="px-4 py-2">{tableEl}</div>
  }
  return (
    <Card className={compact ? 'rounded-md border-border' : 'rounded-sm'}>
      {(heading || subheading) && (
        <CardHeader className={compact ? 'py-3 px-4' : undefined}>
          {heading && <CardTitle className={compact ? 'text-sm' : undefined}>{heading}</CardTitle>}
          {subheading && <CardDescription>{subheading}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={compact ? 'py-2 px-4' : undefined}>
        {tableEl}
      </CardContent>
      {showFooter && (
        <CardFooter className={compact ? 'py-2 px-4' : undefined}>
          <p className="inline-block text-sm text-muted-foreground font-medium whitespace-nowrap">
            Showing 1 to 2 of 2 entries
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
