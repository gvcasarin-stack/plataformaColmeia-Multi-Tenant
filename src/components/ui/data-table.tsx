"use client"

import * as React from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"
import { ChevronsUpDown } from "lucide-react"
import { DateRange } from "react-day-picker"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { FilterDropdown } from "./filter-dropdown"
import { DateRangeFilter } from "./date-range-filter"

interface FilterConfig {
  key: string
  label: string
  options: { label: string; value: string }[]
}

interface DateRangeFilterConfig {
  key: string
  label: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  searchable?: {
    key: string
    placeholder?: string
  }
  filters?: FilterConfig[]
  dateRangeFilter?: DateRangeFilterConfig
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  searchable,
  filters,
  dateRangeFilter,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [dateRange, setDateRange] = React.useState<DateRange>()

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  // Handle date range filtering
  React.useEffect(() => {
    if (dateRangeFilter && dateRange?.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      
      const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from)
      to.setHours(23, 59, 59, 999)

      table.getColumn(dateRangeFilter.key)?.setFilterValue([from, to])
    } else if (dateRangeFilter) {
      table.getColumn(dateRangeFilter.key)?.setFilterValue(null)
    }
  }, [dateRange, dateRangeFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {searchable && (
            <Input
              placeholder={searchable.placeholder || "Filtrar..."}
              value={(table.getColumn(searchable.key)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchable.key)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          )}
          {dateRangeFilter && (
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              label={dateRangeFilter.label}
            />
          )}
        </div>
        {filters && (
          <div className="flex items-center space-x-2">
            {filters.map((filter) => (
              <FilterDropdown
                key={filter.key}
                label={filter.label}
                options={filter.options}
                value={(table.getColumn(filter.key)?.getFilterValue() as string[]) ?? []}
                onChange={(value) => {
                  table.getColumn(filter.key)?.setFilterValue(value)
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            canSort && "cursor-pointer select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-mr-2 h-8 hover:bg-transparent"
                            >
                              <ChevronsUpDown className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
