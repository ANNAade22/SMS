"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { DataTable } from "./data-table";
import { createColumns, FeeAssignment } from "./columns";
import { API_BASE_URL } from "../../../config";
import authService from "../../../services/authService";

interface FeeAssignmentsPageProps {
  onAddAssignment?: () => void;
  onBulkAssign?: () => void;
  onExport?: () => void;
  onViewAssignment?: (assignment: FeeAssignment) => void;
  onEditAssignment?: (assignment: FeeAssignment) => void;
  onDeleteAssignment?: (assignment: FeeAssignment) => void;
  onRecordPayment?: (assignment: FeeAssignment) => void;
  refreshTrigger?: number;
}

export function FeeAssignmentsPage({
  onAddAssignment,
  onBulkAssign,
  onExport,
  onViewAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onRecordPayment,
  refreshTrigger,
}: FeeAssignmentsPageProps) {
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fee-assignments?limit=100&sort=-createdAt`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch fee assignments");
      }

      const data = await response.json();
      const assignmentsData = data.data?.data || data.data || [];

      // Transform the data to match our FeeAssignment type
      const transformedAssignments: FeeAssignment[] = assignmentsData.map(
        (assignment: any) => ({
          _id: assignment._id,
          student: {
            _id: assignment.student?._id || "",
            name: assignment.student?.name || "Unknown Student",
            studentId: assignment.student?.studentId || "",
          },
          fee: {
            _id: assignment.fee?._id || "",
            name: assignment.fee?.name || "Unknown Fee",
            amount: assignment.fee?.amount || 0,
          },
          totalAmount: assignment.totalAmount || 0,
          paidAmount: assignment.paidAmount || 0,
          remainingAmount: assignment.remainingAmount || 0,
          dueDate: assignment.dueDate || new Date().toISOString(),
          status: assignment.status || "pending",
          academicYear: assignment.academicYear || "",
          semester: assignment.semester || "",
          createdAt: assignment.createdAt || new Date().toISOString(),
          updatedAt: assignment.updatedAt || new Date().toISOString(),
        })
      );

      setAssignments(transformedAssignments);
    } catch (err) {
      console.error("Error loading fee assignments:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load fee assignments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [refreshTrigger]);

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export functionality
      const csvContent = [
        [
          "Student Name",
          "Student ID",
          "Fee Name",
          "Total Amount",
          "Paid Amount",
          "Remaining Amount",
          "Due Date",
          "Status",
          "Academic Year",
          "Semester",
        ],
        ...assignments.map((assignment) => [
          assignment.student.name,
          assignment.student.studentId,
          assignment.fee.name,
          assignment.totalAmount,
          assignment.paidAmount,
          assignment.remainingAmount,
          new Date(assignment.dueDate).toLocaleDateString(),
          assignment.status,
          assignment.academicYear,
          assignment.semester,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fee-assignments-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">
            Error Loading Fee Assignments
          </div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadAssignments}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fee Assignments</h2>
          <p className="text-muted-foreground">
            Manage student fee assignments and track payment progress
          </p>
        </div>
      </div>

      <DataTable
        columns={createColumns(
          onViewAssignment,
          onEditAssignment,
          onDeleteAssignment,
          onRecordPayment
        )}
        data={assignments}
        onAddAssignment={onAddAssignment}
        onBulkAssign={onBulkAssign}
        onExport={handleExport}
        onViewAssignment={onViewAssignment}
        onEditAssignment={onEditAssignment}
        onDeleteAssignment={onDeleteAssignment}
        onRecordPayment={onRecordPayment}
        loading={loading}
      />
    </div>
  );
}
