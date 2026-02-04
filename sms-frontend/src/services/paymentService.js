import api from "./apiClient";

// Payment Management
export async function getAllPayments(params = {}) {
  const { data } = await api.get("/api/v1/payments", { params });
  return data;
}

export async function getPaymentById(id) {
  const { data } = await api.get(`/api/v1/payments/${id}`);
  return data;
}

export async function createPayment(paymentData) {
  const { data } = await api.post("/api/v1/payments", paymentData);
  return data;
}

export async function updatePayment(id, paymentData) {
  const { data } = await api.patch(`/api/v1/payments/${id}`, paymentData);
  return data;
}

export async function deletePayment(id) {
  const { data } = await api.delete(`/api/v1/payments/${id}`);
  return data;
}

export async function getPaymentsByStudent(studentId, params = {}) {
  const { data } = await api.get(`/api/v1/payments/student/${studentId}`, {
    params,
  });
  return data;
}

export async function getPaymentStatistics(params = {}) {
  const { data } = await api.get("/api/v1/payments/statistics", { params });
  return data;
}

export default {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentsByStudent,
  getPaymentStatistics,
};
