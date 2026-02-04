import apiClient from "./apiClient";

// Fetch audit logs filtered by action (e.g., FIRST_LOGIN_TOKEN_REGENERATED)
export async function fetchAuditLogs(params = {}) {
  const { action, limit = 50, page = 1, startDate, endDate } = params;
  const query = new URLSearchParams();
  if (action) query.append("action", action);
  query.append("limit", String(limit));
  query.append("page", String(page));
  if (startDate) query.append("startDate", startDate);
  if (endDate) query.append("endDate", endDate);
  const { data } = await apiClient.get(
    `/api/v1/audit/system?${query.toString()}`
  );
  return data?.data?.logs || [];
}
