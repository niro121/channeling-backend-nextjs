"use client"

import React from "react"
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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
}

export default function CustomTable<TData, TValue>({
  heading,
  subheading,
  columns,
  data,
  rowCount,
}: CustomTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    rowCount,
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <Card className="rounded-sm">
      <CardHeader>
        {heading &&  <CardTitle>{heading}</CardTitle>}
        {subheading &&  <CardDescription>{subheading}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-5 px-0">
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
                      className="font-semibold py-5 px-0"
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
        </Table>
      </CardContent>
      <CardFooter>
        <p className="inline-block text-sm text-muted-foreground font-medium whitespace-nowrap">
          Showing 1 to 2 of 2 entries
        </p>
      </CardFooter>
    </Card>
  )
}
