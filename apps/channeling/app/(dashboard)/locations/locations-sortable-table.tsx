"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  Row,
  useReactTable,
} from "@tanstack/react-table"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { GripVertical, Loader2, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { DataTablePagination } from "@/components/common/custom-data-table-pagination"
import CustomAlertDialogWithWarning from "@/components/common/custom-alert-dialog-with-warning"
import { useToast } from "@/components/hooks/use-toast"
import { Location } from "@/types/location"
import { LocationColumns } from "./columns"
import { reorderLocations } from "@/app/actions/location.action"
import { cn } from "@/lib/utils"

function SortableTableRow({
  row,
  canReorder,
  saving,
}: {
  row: Row<Location>
  canReorder: boolean
  saving: boolean
}) {
  const id = row.original.id!
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !canReorder || saving })

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      data-state={row.getIsSelected() && "selected"}
      className={cn(isDragging && "relative z-10 bg-background opacity-90 shadow-md")}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {cell.column.id === "drag" ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground",
                !canReorder || saving
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing"
              )}
              aria-label="Drag to reorder"
              disabled={!canReorder || saving}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

type LocationsSortableTableProps = {
  data: Location[]
  rowCount: number
  page?: string
  limit?: string
  canReorder: boolean
  toolbarLeft?: React.ReactNode
  toolbarRight?: React.ReactNode
  deleteServerAction: (ids: string[]) => Promise<boolean>
  getBulkDeleteDescription?: (ids: string[]) => Promise<string> | string
}

export function LocationsSortableTable({
  data,
  rowCount,
  page,
  limit,
  canReorder,
  toolbarLeft,
  toolbarRight,
  deleteServerAction,
  getBulkDeleteDescription,
}: LocationsSortableTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [items, setItems] = useState<Location[]>(data)
  const [saving, setSaving] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingDescription, setFetchingDescription] = useState(false)
  const [bulkDeleteDescription, setBulkDeleteDescription] = useState(
    "This action cannot be undone. This will permanently delete these records and remove the data from our servers."
  )

  useEffect(() => {
    setItems(data)
  }, [data])

  const columns = useMemo<ColumnDef<Location>[]>(() => {
    const dragCol: ColumnDef<Location> = {
      id: "drag",
      header: () => <span className="sr-only">Reorder</span>,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    }
    return [dragCol, ...LocationColumns]
  }, [])

  const pageIndex = Number(page ?? "0") || 0
  const pageSize =
    Number(limit ?? process.env.NEXT_PUBLIC_DEFAULT_PER_PAGE ?? "10") || 10

  const table = useReactTable({
    data: items,
    columns,
    rowCount,
    enableRowSelection: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id!,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
      pagination: { pageIndex, pageSize },
    },
  })

  useEffect(() => {
    table.setPageSize(pageSize)
    table.setPageIndex(pageIndex)
  }, [table, pageSize, pageIndex])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    mutate(params)
    const qs = params.toString()
    router.replace(qs ? `${pathname}/?${qs}` : pathname)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canReorder || saving) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const previous = items
    const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: pageIndex * pageSize + index,
    }))
    setItems(next)

    const orderedIds = next.map((i) => i.id!).filter(Boolean)
    setSaving(true)
    try {
      const result = await reorderLocations(orderedIds, pageIndex, pageSize)
      if (!result.success) {
        setItems(previous)
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error?.message || "Could not save order.",
        })
        return
      }
      toast({
        variant: "success",
        title: "Order saved",
        description: "Location list order was updated.",
      })
      router.refresh()
    } catch (error: any) {
      setItems(previous)
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message ?? "Could not save order.",
      })
    } finally {
      setSaving(false)
    }
  }

  const showHideDeleteModal = async (value: boolean) => {
    if (value) {
      const idsToDelete = Object.keys(rowSelection)
        .map((key) => table.getRow(key)?.original?.id)
        .filter(Boolean) as string[]
      if (getBulkDeleteDescription && idsToDelete.length > 0) {
        setFetchingDescription(true)
        try {
          setBulkDeleteDescription(await getBulkDeleteDescription(idsToDelete))
        } catch {
          setBulkDeleteDescription(
            "This action cannot be undone. This will permanently delete these records and remove the data from our servers."
          )
        } finally {
          setFetchingDescription(false)
        }
      }
      setShowDelConfirmation(true)
    } else {
      setShowDelConfirmation(false)
    }
  }

  const onDeleteConfirmation = async () => {
    const idsToDelete = Object.keys(rowSelection)
      .map((key) => table.getRow(key)?.original?.id)
      .filter(Boolean) as string[]
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
        description: error.message ?? "Error deleting records.",
      })
    } finally {
      setLoading(false)
    }
  }

  const ids = items.map((i) => i.id!).filter(Boolean)
  const hasWarning = bulkDeleteDescription.includes(
    "linked to other system records"
  )

  return (
    <>
      <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-lg font-semibold">Locations</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your locations here.
              {canReorder
                ? " Drag rows by the handle to set list order."
                : " Clear search/filters to drag-reorder."}
              {saving ? " Saving…" : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col gap-4 px-6 pb-4 sm:flex-row sm:items-start sm:justify-between">
          {toolbarLeft}
          <div className="flex items-start gap-2 shrink-0">
            <Button
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
            {toolbarRight}
          </div>
        </div>
        <CardContent className="px-0 pb-0">
          <div className="px-4 pb-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={header.column.id === "drag" ? "w-10" : undefined}
                          >
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
                      <SortableContext
                        items={ids}
                        strategy={verticalListSortingStrategy}
                        disabled={!canReorder || saving}
                      >
                        {table.getRowModel().rows.map((row) => (
                          <SortableTableRow
                            key={row.id}
                            row={row}
                            canReorder={canReorder}
                            saving={saving}
                          />
                        ))}
                      </SortableContext>
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <DataTablePagination
              table={table}
              onPageChange={(p) => {
                replaceParams((params) => {
                  if (p <= 0) params.delete("page")
                  else params.set("page", String(p))
                })
              }}
              onLimitChange={(l) => {
                replaceParams((params) => {
                  params.set("limit", String(l))
                  params.delete("page")
                })
              }}
            />
          </div>
        </CardFooter>
      </Card>

      <CustomAlertDialogWithWarning
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading || fetchingDescription}
        title="Are you absolutely sure?"
        description={
          fetchingDescription ? <span>Loading...</span> : bulkDeleteDescription
        }
        handleContinue={onDeleteConfirmation}
        hasWarning={hasWarning}
      />
    </>
  )
}
