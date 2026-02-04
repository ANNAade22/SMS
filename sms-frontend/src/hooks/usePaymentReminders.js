import { useState, useEffect } from "react";
import paymentReminderService from "../services/paymentReminderService";
import authService from "../services/authService";
import { API_BASE_URL } from "../config";

export const usePaymentReminders = () => {
  const [showReminder, setShowReminder] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const checkForReminders = async () => {
    try {
      setLoading(true);

      // Get current user to determine if they're a student or parent
      const currentUser = authService.getUser();
      if (!currentUser) return;

      let studentId = null;

      // If user is a student, use their student profile
      if (currentUser.role === "student" && currentUser.studentProfile) {
        studentId = currentUser.studentProfile;
      }
      // If user is a parent, get their first child's ID
      else if (currentUser.role === "parent" && currentUser.parentProfile) {
        // Fetch the parent's children using the students endpoint
        const response = await authService.authFetch(
          `${API_BASE_URL}/api/v1/students/my-children`
        );
        const data = await response.json();
        if (data.data && data.data.data && data.data.data.length > 0) {
          studentId = data.data.data[0]._id; // Use first child
        }
      }

      if (!studentId) return;

      // Get active reminders for the student
      const remindersResponse = await authService.authFetch(
        `${API_BASE_URL}/api/v1/payment-reminders/student/${studentId}/active`
      );
      const remindersData = remindersResponse.ok
        ? await remindersResponse.json()
        : { data: { reminders: [] } };
      const activeReminders = remindersData.data.reminders || [];

      // Only show reminder if there are active reminders and user hasn't dismissed them recently
      const lastDismissed = localStorage.getItem("paymentRemindersDismissed");
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (activeReminders.length > 0) {
        // Check if user dismissed reminders more than 24 hours ago
        if (!lastDismissed || now - parseInt(lastDismissed) > oneDay) {
          setReminders(activeReminders);
          setShowReminder(true);
        }
      }
    } catch (error) {
      console.error("Error checking payment reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissReminder = () => {
    setShowReminder(false);
    setReminders([]);
    // Store dismissal timestamp
    localStorage.setItem("paymentRemindersDismissed", Date.now().toString());
  };

  const dismissReminderPermanently = async (reminderId) => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/payment-reminders/${reminderId}/dismiss`,
        { method: "PATCH" }
      );

      if (response.ok) {
        setReminders((prev) => prev.filter((r) => r._id !== reminderId));

        // If no more reminders, close popup
        if (reminders.length === 1) {
          dismissReminder();
        }
      }
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    }
  };

  // Check for reminders when component mounts
  useEffect(() => {
    checkForReminders();
  }, []);

  return {
    showReminder,
    reminders,
    loading,
    dismissReminder,
    dismissReminderPermanently,
    checkForReminders,
  };
};
