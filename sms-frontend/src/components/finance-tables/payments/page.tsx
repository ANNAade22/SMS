"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { DataTable } from "./data-table";
import { createColumns, Payment } from "./columns";
import { API_BASE_URL } from "../../../config";
import authService from "../../../services/authService";

interface PaymentsPageProps {
  onAddPayment?: () => void;
  onExport?: () => void;
  onViewPayment?: (payment: Payment) => void;
  onEditPayment?: (payment: Payment) => void;
  onDeletePayment?: (payment: Payment) => void;
  onPrintInvoice?: (payment: Payment) => void;
  refreshTrigger?: number;
}

export function PaymentsPage({
  onAddPayment,
  onExport,
  onViewPayment,
  onEditPayment,
  onDeletePayment,
  onPrintInvoice,
  refreshTrigger,
}: PaymentsPageProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/payments?limit=100&sort=-paymentDate`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      const data = await response.json();
      const paymentsData = data.data?.data || data.data || [];

      // Transform the data to match our Payment type
      const transformedPayments: Payment[] = paymentsData.map(
        (payment: any) => ({
          _id: payment._id,
          student: {
            _id: payment.student?._id || "",
            name: payment.student?.name || "Unknown Student",
            studentId: payment.student?.studentId || "",
          },
          feeAssignment: {
            _id: payment.feeAssignment?._id || "",
            fee: {
              _id: payment.feeAssignment?.fee?._id || "",
              name: payment.feeAssignment?.fee?.name || "Unknown Fee",
            },
          },
          amount: payment.amount || 0,
          paymentMethod: payment.paymentMethod || "unknown",
          paymentDate: payment.paymentDate || new Date().toISOString(),
          referenceNumber: payment.referenceNumber || "",
          status: payment.status || "pending",
          notes: payment.notes || "",
          createdAt: payment.createdAt || new Date().toISOString(),
          updatedAt: payment.updatedAt || new Date().toISOString(),
        })
      );

      setPayments(transformedPayments);
    } catch (err) {
      console.error("Error loading payments:", err);
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
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
          "Amount",
          "Payment Method",
          "Date",
          "Status",
          "Reference",
        ],
        ...payments.map((payment) => [
          payment.student.name,
          payment.student.studentId,
          payment.feeAssignment.fee.name,
          payment.amount,
          payment.paymentMethod,
          new Date(payment.paymentDate).toLocaleDateString(),
          payment.status,
          payment.referenceNumber || "N/A",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">
            Error Loading Payments
          </div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadPayments}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const columnsWithHandlers = createColumns(
    onViewPayment,
    onEditPayment,
    onDeletePayment,
    onPrintInvoice
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">
            Manage and view all payment records
          </p>
        </div>
      </div>

      <DataTable
        columns={columnsWithHandlers}
        data={payments}
        onAddPayment={onAddPayment}
        onExport={handleExport}
        onViewPayment={onViewPayment}
        onEditPayment={onEditPayment}
        onDeletePayment={onDeletePayment}
        onPrintInvoice={onPrintInvoice}
        loading={loading}
      />
    </div>
  );
}
