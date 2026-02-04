import api from "./apiClient";

// Fee Management
export async function getAllFees(params = {}) {
  const { data } = await api.get("/api/v1/fees", { params });
  return data;
}

export async function getFeeById(id) {
  const { data } = await api.get(`/api/v1/fees/${id}`);
  return data;
}

export async function createFee(feeData) {
  const { data } = await api.post("/api/v1/fees", feeData);
  return data;
}

export async function updateFee(id, feeData) {
  const { data } = await api.patch(`/api/v1/fees/${id}`, feeData);
  return data;
}

export async function deleteFee(id) {
  const { data } = await api.delete(`/api/v1/fees/${id}`);
  return data;
}

export async function getFeesByCategory(category, academicYear) {
  const { data } = await api.get(`/api/v1/fees/category/${category}`, {
    params: { academicYear },
  });
  return data;
}

export async function getFeeStatistics(academicYear) {
  const { data } = await api.get("/api/v1/fees/statistics", {
    params: { academicYear },
  });
  return data;
}

export async function assignFeesToStudents(assignmentData) {
  const { data } = await api.post("/api/v1/fees/assign", assignmentData);
  return data;
}

export default {
  getAllFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  getFeesByCategory,
  getFeeStatistics,
  assignFeesToStudents,
};
