import api from "./apiClient";

// Fee Assignment Management
export async function getAllFeeAssignments(params = {}) {
  const { data } = await api.get("/api/v1/fee-assignments", { params });
  return data;
}

export async function getFeeAssignmentById(id) {
  const { data } = await api.get(`/api/v1/fee-assignments/${id}`);
  return data;
}

export async function createFeeAssignment(assignmentData) {
  const { data } = await api.post("/api/v1/fee-assignments", assignmentData);
  return data;
}

export async function updateFeeAssignment(id, assignmentData) {
  const { data } = await api.patch(
    `/api/v1/fee-assignments/${id}`,
    assignmentData
  );
  return data;
}

export async function deleteFeeAssignment(id) {
  const { data } = await api.delete(`/api/v1/fee-assignments/${id}`);
  return data;
}

export async function getFeeAssignmentsByStudent(studentId, params = {}) {
  const { data } = await api.get(
    `/api/v1/fee-assignments/student/${studentId}`,
    { params }
  );
  return data;
}

export async function getOverdueAssignments(params = {}) {
  const { data } = await api.get("/api/v1/fee-assignments/overdue", { params });
  return data;
}

export async function generatePaymentReminders(reminderData) {
  const { data } = await api.post(
    "/api/v1/fee-assignments/generate-reminders",
    reminderData
  );
  return data;
}

export default {
  getAllFeeAssignments,
  getFeeAssignmentById,
  createFeeAssignment,
  updateFeeAssignment,
  deleteFeeAssignment,
  getFeeAssignmentsByStudent,
  getOverdueAssignments,
  generatePaymentReminders,
};
