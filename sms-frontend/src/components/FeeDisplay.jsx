import React, { useState, useEffect } from "react";
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import feeAssignmentService from "../services/feeAssignmentService";
import paymentService from "../services/paymentService";
import authService from "../services/authService";
import { API_BASE_URL } from "../config";

const FeeDisplay = ({ studentId, userRole = "student" }) => {
  const [feeAssignments, setFeeAssignments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllFees, setShowAllFees] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadFeeData();
    }
  }, [studentId]);

  const loadFeeData = async () => {
    try {
      setLoading(true);
      console.log("FeeDisplay - Loading data for studentId:", studentId);

      const [assignmentsResponse, paymentsResponse] = await Promise.all([
        authService.authFetch(
          `${API_BASE_URL}/api/v1/fee-assignments/student/${studentId}`
        ),
        authService.authFetch(
          `${API_BASE_URL}/api/v1/payments/student/${studentId}?limit=10`
        ),
      ]);

      const [assignmentsData, paymentsData] = await Promise.all([
        assignmentsResponse.ok
          ? assignmentsResponse.json()
          : { data: { assignments: [] } },
        paymentsResponse.ok
          ? paymentsResponse.json()
          : { data: { payments: [] } },
      ]);

      console.log(
        "FeeDisplay - Assignments response:",
        assignmentsResponse.status,
        assignmentsData
      );
      console.log(
        "FeeDisplay - Payments response:",
        paymentsResponse.status,
        paymentsData
      );
      console.log(
        "FeeDisplay - Assignments count:",
        assignmentsData.data?.assignments?.length || 0
      );
      console.log(
        "FeeDisplay - Payments count:",
        paymentsData.data?.payments?.length || 0
      );

      setFeeAssignments(assignmentsData.data.assignments || []);
      setPayments(paymentsData.data.payments || []);
    } catch (err) {
      console.error("Error loading fee data:", err);
      setError(err.message || "Failed to load fee data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "overdue":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && new Date(dueDate) < new Date();
  };

  const calculateTotalOutstanding = () => {
    return feeAssignments
      .filter((assignment) => assignment.status !== "paid")
      .reduce((total, assignment) => total + assignment.remainingAmount, 0);
  };

  const calculateTotalPaid = () => {
    return payments
      .filter((payment) => payment.status === "completed")
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const getUpcomingFees = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return feeAssignments.filter((assignment) => {
      const dueDate = new Date(assignment.dueDate);
      return assignment.status === "pending" && dueDate <= nextWeek;
    });
  };

  const getOverdueFees = () => {
    return feeAssignments.filter(
      (assignment) =>
        assignment.status === "overdue" || isOverdue(assignment.dueDate)
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-700">
            Error loading fee information: {error}
          </span>
        </div>
      </div>
    );
  }

  const displayedFees = showAllFees
    ? feeAssignments
    : feeAssignments.slice(0, 3);
  const totalOutstanding = calculateTotalOutstanding();
  const totalPaid = calculateTotalPaid();
  const upcomingFees = getUpcomingFees();
  const overdueFees = getOverdueFees();

  return (
    <div className="space-y-6">
      {/* Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Paid</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-lg font-bold text-gray-900">
                {overdueFees.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdueFees.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                {overdueFees.length} Overdue Payment
                {overdueFees.length > 1 ? "s" : ""}
              </h4>
              <p className="text-sm text-red-700">
                Please make payment as soon as possible to avoid additional late
                fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {upcomingFees.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                {upcomingFees.length} Payment
                {upcomingFees.length > 1 ? "s" : ""} Due Soon
              </h4>
              <p className="text-sm text-yellow-700">
                You have payments due within the next week.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fee List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Fee Information
            </h3>
            {feeAssignments.length > 3 && (
              <button
                onClick={() => setShowAllFees(!showAllFees)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showAllFees ? "Show Less" : "View All"}
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {displayedFees.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No fee assignments found.
            </div>
          ) : (
            displayedFees.map((assignment) => (
              <div key={assignment._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(assignment.status)}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {assignment.fee?.name || "Fee"}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Due: {formatDate(assignment.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(assignment.remainingAmount)}
                    </p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        assignment.status
                      )}`}
                    >
                      {assignment.status}
                    </span>
                  </div>
                </div>

                {assignment.status === "paid" && (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Payment completed on{" "}
                    {formatDate(
                      assignment.paidAmount > 0
                        ? new Date()
                        : assignment.dueDate
                    )}
                  </div>
                )}

                {assignment.lateFeeAmount > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    Late fee: {formatCurrency(assignment.lateFeeAmount)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Payments
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.feeAssignment?.fee?.name || "Fee Payment"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.paymentMethod} •{" "}
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeDisplay;
