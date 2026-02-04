"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, Download, Plus } from "lucide-react";

import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Input } from "../../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onAddPayment?: () => void;
  onExport?: () => void;
  onViewPayment?: (payment: any) => void;
  onEditPayment?: (payment: any) => void;
  onDeletePayment?: (payment: any) => void;
  onPrintInvoice?: (payment: any) => void;
  loading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onAddPayment,
  onExport,
  onViewPayment,
  onEditPayment,
  onDeletePayment,
  onPrintInvoice,
  loading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Check if columns are properly defined
  if (!columns || columns.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600">No columns defined</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if table is properly initialized
  if (!table || !table.getAllColumns || table.getAllColumns().length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600">Table not initialized</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-900 rounded-lg p-6 border border-amber-700 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-amber-50">
              Payment Records
            </h3>
            <p className="text-sm text-amber-100 mt-1">
              Manage and track all payment transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-amber-800/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-amber-600/50 shadow-lg">
              <span className="text-sm font-medium text-amber-100">
                Total: {data.length} payments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex items-center justify-between py-4 bg-amber-900/10 backdrop-blur-sm rounded-lg border border-amber-700/30 px-6 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              placeholder="Search payments..."
              className="w-80 pl-10 bg-amber-50/90 border-amber-600/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-amber-900 placeholder-amber-600"
              disabled
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-amber-800/20 backdrop-blur-sm border-amber-600/50 hover:bg-amber-700/30 text-amber-100 hover:text-amber-50 shadow-lg"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-amber-900/95 backdrop-blur-sm border-amber-700/50 shadow-2xl"
            >
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-amber-100 hover:bg-amber-800/50 hover:text-amber-50"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              className="bg-amber-800/20 backdrop-blur-sm border-amber-600/50 hover:bg-amber-700/30 text-amber-100 hover:text-amber-50 shadow-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          {onAddPayment && (
            <Button
              onClick={onAddPayment}
              className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 hover:from-amber-700 hover:via-amber-800 hover:to-yellow-800 text-amber-50 shadow-xl hover:shadow-2xl transition-all duration-300 border border-amber-500/30"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          )}
        </div>
      </div>
      {/* Table Section */}
      <div className="bg-amber-900/5 backdrop-blur-sm rounded-lg border border-amber-700/30 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-gradient-to-r from-amber-800/20 to-amber-900/20 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-amber-700/30 hover:bg-amber-800/10 transition-all duration-200"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-amber-100 font-bold py-4 px-6 text-sm tracking-wide"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`border-amber-700/20 hover:bg-amber-800/10 transition-all duration-200 ${
                    index % 2 === 0 ? "bg-amber-900/5" : "bg-amber-800/5"
                  } ${
                    row.getIsSelected() ? "bg-amber-700/20 shadow-inner" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-4 px-6 text-sm text-amber-900 font-medium"
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
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-amber-600"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg
                      className="h-12 w-12 text-amber-500/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-lg font-medium text-amber-800">
                      No payment records found
                    </p>
                    <p className="text-sm text-amber-600">
                      Start by adding your first payment record
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Section */}
      <div className="flex items-center justify-between space-x-2 py-4 bg-amber-900/10 backdrop-blur-sm rounded-lg border border-amber-700/30 px-6 shadow-lg">
        <div className="flex-1 text-sm text-amber-800">
          <span className="font-bold text-amber-900">
            {table.getFilteredSelectedRowModel().rows.length}
          </span>{" "}
          of{" "}
          <span className="font-bold text-amber-900">
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          row(s) selected
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-amber-800">
            <span>Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-16 rounded border border-amber-600/50 bg-amber-50/90 text-amber-900 text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 mr-4">
              <span className="text-sm text-amber-800 font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="bg-amber-800/20 backdrop-blur-sm border-amber-600/50 hover:bg-amber-700/30 text-amber-100 hover:text-amber-50 disabled:opacity-50 shadow-lg"
            >
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="bg-amber-800/20 backdrop-blur-sm border-amber-600/50 hover:bg-amber-700/30 text-amber-100 hover:text-amber-50 disabled:opacity-50 shadow-lg"
            >
              Next
              <svg
                className="ml-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
