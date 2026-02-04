"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Printer,
} from "lucide-react";

import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

export type Payment = {
  _id: string;
  student: {
    _id: string;
    name: string;
    studentId: string;
  };
  feeAssignment: {
    _id: string;
    fee: {
      _id: string;
      name: string;
    };
  };
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  status: "pending" | "completed" | "failed" | "refunded";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const createColumns = (
  onViewPayment?: (payment: Payment) => void,
  onEditPayment?: (payment: Payment) => void,
  onDeletePayment?: (payment: Payment) => void,
  onPrintInvoice?: (payment: Payment) => void
): ColumnDef<Payment>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "student.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Student
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const student = row.original.student;
      return (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {student?.name || "Unknown Student"}
          </div>
          <div className="text-sm text-gray-500">
            {student?.studentId || ""}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "feeAssignment.fee.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Fee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const fee = row.original.feeAssignment?.fee;
      return (
        <div className="font-medium text-gray-900">
          {fee?.name || "Unknown Fee"}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="font-medium text-gray-900">{formatted}</div>;
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as string;
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {method}
        </span>
      );
    },
  },
  {
    accessorKey: "paymentDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("paymentDate"));
      return (
        <div className="text-sm text-gray-900">
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusColors = {
        pending: "bg-yellow-100 text-yellow-800",
        completed: "bg-green-100 text-green-800",
        failed: "bg-red-100 text-red-800",
        refunded: "bg-gray-100 text-gray-800",
      };
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            statusColors[status as keyof typeof statusColors] ||
            "bg-gray-100 text-gray-800"
          } capitalize`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "referenceNumber",
    header: "Reference",
    cell: ({ row }) => {
      const ref = row.getValue("referenceNumber") as string;
      return (
        <div className="text-sm text-gray-900 font-mono">{ref || "N/A"}</div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-amber-100">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-amber-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white border border-amber-200 shadow-xl"
          >
            <DropdownMenuLabel className="text-amber-900 font-semibold">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment._id)}
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-amber-200" />
            <DropdownMenuItem
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
              onClick={() => onViewPayment?.(payment)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
              onClick={() => onPrintInvoice?.(payment)}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Invoice
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
              onClick={() => onEditPayment?.(payment)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit payment
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-amber-200" />
            <DropdownMenuItem
              className="text-red-600 hover:bg-red-50 cursor-pointer"
              onClick={() => onDeletePayment?.(payment)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Default export for backward compatibility
export const columns = createColumns();
