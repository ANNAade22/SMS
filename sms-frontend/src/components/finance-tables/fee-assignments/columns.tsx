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
  DollarSign,
  Copy,
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

export type FeeAssignment = {
  _id: string;
  student: {
    _id: string;
    name: string;
    studentId: string;
  };
  fee: {
    _id: string;
    name: string;
    amount: number;
  };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: "pending" | "partial" | "paid" | "overdue";
  academicYear: string;
  semester: string;
  createdAt: string;
  updatedAt: string;
};

export const createColumns = (
  onViewAssignment?: (assignment: FeeAssignment) => void,
  onEditAssignment?: (assignment: FeeAssignment) => void,
  onDeleteAssignment?: (assignment: FeeAssignment) => void,
  onRecordPayment?: (assignment: FeeAssignment) => void
): ColumnDef<FeeAssignment>[] => [
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
    accessorKey: "fee.name",
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
      const fee = row.original.fee;
      return (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">
            {fee?.name || "Unknown Fee"}
          </div>
          <div className="text-sm text-gray-500">
            {fee?.academicYear || ""} - {fee?.semester || ""}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Total Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="font-medium text-gray-900">{formatted}</div>;
    },
  },
  {
    accessorKey: "paidAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Paid
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("paidAmount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return <div className="font-medium text-green-600">{formatted}</div>;
    },
  },
  {
    accessorKey: "remainingAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Remaining
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("remainingAmount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      const isOverdue =
        amount > 0 && new Date(row.original.dueDate) < new Date();
      return (
        <div
          className={`font-medium ${
            isOverdue
              ? "text-red-600"
              : amount > 0
              ? "text-yellow-600"
              : "text-green-600"
          }`}
        >
          {formatted}
        </div>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("dueDate"));
      const isOverdue = date < new Date() && row.original.remainingAmount > 0;
      return (
        <div
          className={`text-sm ${
            isOverdue ? "text-red-600 font-medium" : "text-gray-900"
          }`}
        >
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {isOverdue && <div className="text-xs text-red-500">Overdue</div>}
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
        partial: "bg-blue-100 text-blue-800",
        paid: "bg-green-100 text-green-800",
        overdue: "bg-red-100 text-red-800",
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
    accessorKey: "academicYear",
    header: "Academic Year",
    cell: ({ row }) => {
      const year = row.getValue("academicYear") as string;
      return <div className="text-sm text-gray-900">{year || "N/A"}</div>;
    },
  },
  {
    accessorKey: "semester",
    header: "Semester",
    cell: ({ row }) => {
      const semester = row.getValue("semester") as string;
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
          {semester || "N/A"}
        </span>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const assignment = row.original;

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
              onClick={() => navigator.clipboard.writeText(assignment._id)}
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy assignment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-amber-200" />
            <DropdownMenuItem
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
              onClick={() => onViewAssignment?.(assignment)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
              onClick={() => onEditAssignment?.(assignment)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit assignment
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-amber-800 hover:bg-amber-50 cursor-pointer"
              onClick={() => onRecordPayment?.(assignment)}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Record payment
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-amber-200" />
            <DropdownMenuItem
              className="text-red-600 hover:bg-red-50 cursor-pointer"
              onClick={() => onDeleteAssignment?.(assignment)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete assignment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
