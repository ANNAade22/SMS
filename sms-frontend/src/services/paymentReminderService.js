import api from "./apiClient";

// Payment Reminder Management
export async function getAllPaymentReminders(params = {}) {
  const { data } = await api.get("/api/v1/payment-reminders", { params });
  return data;
}

export async function getPaymentReminderById(id) {
  const { data } = await api.get(`/api/v1/payment-reminders/${id}`);
  return data;
}

export async function getPaymentRemindersByStudent(studentId, params = {}) {
  const { data } = await api.get(
    `/api/v1/payment-reminders/student/${studentId}`,
    { params }
  );
  return data;
}

export async function getActiveReminders(studentId) {
  const { data } = await api.get(
    `/api/v1/payment-reminders/student/${studentId}/active`
  );
  return data;
}

export async function markReminderAsRead(id) {
  const { data } = await api.patch(`/api/v1/payment-reminders/${id}`);
  return data;
}

export async function dismissReminder(id) {
  const { data } = await api.patch(`/api/v1/payment-reminders/${id}/dismiss`);
  return data;
}

export async function markAllRemindersAsRead(studentId) {
  const { data } = await api.patch(
    `/api/v1/payment-reminders/student/${studentId}/mark-all-read`
  );
  return data;
}

export async function getReminderStatistics(params = {}) {
  const { data } = await api.get("/api/v1/payment-reminders/statistics", {
    params,
  });
  return data;
}

export default {
  getAllPaymentReminders,
  getPaymentReminderById,
  getPaymentRemindersByStudent,
  getActiveReminders,
  markReminderAsRead,
  dismissReminder,
  markAllRemindersAsRead,
  getReminderStatistics,
};
