import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import paymentReminderService from "../services/paymentReminderService";

const PaymentReminderPopup = ({ studentId, isOpen, onClose }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && studentId) {
      loadActiveReminders();
    }
  }, [isOpen, studentId]);

  const loadActiveReminders = async () => {
    try {
      setLoading(true);
      const response = await paymentReminderService.getActiveReminders(
        studentId
      );
      setReminders(response.data.reminders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissReminder = async (reminderId) => {
    try {
      await paymentReminderService.dismissReminder(reminderId);
      setReminders((prev) => prev.filter((r) => r._id !== reminderId));

      // If no more reminders, close popup
      if (reminders.length === 1) {
        onClose();
      }
    } catch (err) {
      console.error("Error dismissing reminder:", err);
    }
  };

  const handleDismissAll = async () => {
    try {
      await paymentReminderService.markAllRemindersAsRead(studentId);
      setReminders([]);
      onClose();
    } catch (err) {
      console.error("Error dismissing all reminders:", err);
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

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200",
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "urgent":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case "high":
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Payment Reminders
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-700">
                  Error loading reminders: {error}
                </span>
              </div>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                All caught up!
              </h3>
              <p className="text-gray-500">No pending payment reminders.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-orange-500 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">
                      {reminders.length} Payment Reminder
                      {reminders.length > 1 ? "s" : ""}
                    </h4>
                    <p className="text-sm text-orange-700">
                      Please review and take action on the following payment
                      reminders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reminders List */}
              {reminders.map((reminder) => (
                <div
                  key={reminder._id}
                  className={`border rounded-lg p-4 ${getPriorityColor(
                    reminder.priority
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getPriorityIcon(reminder.priority)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                              reminder.priority
                            )}`}
                          >
                            {reminder.priority.toUpperCase()}
                          </span>
                          {reminder.daysOverdue > 0 && (
                            <span className="text-xs font-medium">
                              {reminder.daysOverdue} day
                              {reminder.daysOverdue > 1 ? "s" : ""} overdue
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-medium mb-1">
                          {reminder.feeAssignment?.fee?.name || "Fee Payment"}
                        </p>

                        <p className="text-sm mb-2">{reminder.message}</p>

                        {reminder.feeAssignment && (
                          <div className="text-sm">
                            <p>
                              <span className="font-medium">Amount:</span>{" "}
                              {formatCurrency(
                                reminder.feeAssignment.remainingAmount
                              )}
                            </p>
                            <p>
                              <span className="font-medium">Due Date:</span>{" "}
                              {formatDate(reminder.feeAssignment.dueDate)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDismissReminder(reminder._id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {reminders.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              Click the X to dismiss individual reminders
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDismissAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Dismiss All
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                I'll Review Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReminderPopup;
