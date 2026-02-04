import authService from "./authService";
import { API_BASE_URL } from "../config";

class MonitoringService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get finance admin user data
  async getFinanceAdminData() {
    try {
      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/users?role=finance_admin`
      );
      const data = await response.json();
      return data.data?.data?.[0] || null;
    } catch (error) {
      console.error("Error fetching finance admin data:", error);
      throw error;
    }
  }

  // Get audit logs for a specific user
  async getAuditLogs(userId, options = {}) {
    try {
      const { limit = 10, page = 1, startDate, endDate, action } = options;
      const queryParams = new URLSearchParams({
        userId,
        limit: limit.toString(),
        page: page.toString(),
      });

      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (action) queryParams.append("action", action);

      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/audit/system?${queryParams.toString()}`
      );
      const data = await response.json();
      return data.data?.logs || [];
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
  }

  // Get active sessions for a user
  async getUserSessions(userId) {
    try {
      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/sessions?userId=${userId}`
      );
      const data = await response.json();
      return data.data?.sessions || [];
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      throw error;
    }
  }

  // Get user activities
  async getUserActivities(userId, options = {}) {
    try {
      const { limit = 5 } = options;
      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/users/${userId}/activities?limit=${limit}`
      );
      const data = await response.json();
      return data.data?.activities || [];
    } catch (error) {
      console.error("Error fetching user activities:", error);
      throw error;
    }
  }

  // Get system statistics
  async getSystemStats() {
    try {
      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/dashboard/stats`
      );
      const data = await response.json();
      return data.data || {};
    } catch (error) {
      console.error("Error fetching system stats:", error);
      throw error;
    }
  }

  // Get real-time monitoring data
  async getMonitoringData() {
    try {
      const financeAdmin = await this.getFinanceAdminData();

      if (!financeAdmin) {
        return {
          financeAdmin: null,
          auditLogs: [],
          sessions: [],
          activities: [],
          error: "No finance admin found",
        };
      }

      // Try to fetch all data, but don't fail if some endpoints don't work
      const [auditLogs, sessions, activities] = await Promise.allSettled([
        this.getAuditLogs(financeAdmin._id, { limit: 10 }),
        this.getUserSessions(financeAdmin._id),
        this.getUserActivities(financeAdmin._id, { limit: 5 }),
      ]);

      return {
        financeAdmin,
        auditLogs: auditLogs.status === "fulfilled" ? auditLogs.value : [],
        sessions: sessions.status === "fulfilled" ? sessions.value : [],
        activities: activities.status === "fulfilled" ? activities.value : [],
        error: null,
      };
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
      return {
        financeAdmin: null,
        auditLogs: [],
        sessions: [],
        activities: [],
        error: error.message,
      };
    }
  }

  // Get permission changes for a user
  async getPermissionChanges(userId) {
    try {
      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/audit/system?userId=${userId}&action=PERMISSION_CHANGE&limit=20`
      );
      const data = await response.json();
      return data.data?.logs || [];
    } catch (error) {
      console.error("Error fetching permission changes:", error);
      throw error;
    }
  }

  // Get data access logs
  async getDataAccessLogs(userId, dataType = null) {
    try {
      const queryParams = new URLSearchParams({
        userId,
        limit: "20",
      });

      if (dataType) {
        queryParams.append("action", `DATA_ACCESS_${dataType.toUpperCase()}`);
      }

      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/audit/system?${queryParams.toString()}`
      );
      const data = await response.json();
      return data.data?.logs || [];
    } catch (error) {
      console.error("Error fetching data access logs:", error);
      throw error;
    }
  }

  // Get system events
  async getSystemEvents(userId = null) {
    try {
      const queryParams = new URLSearchParams({
        limit: "15",
      });

      if (userId) {
        queryParams.append("userId", userId);
      }

      const response = await authService.authFetch(
        `${this.baseURL}/api/v1/audit/system?${queryParams.toString()}`
      );
      const data = await response.json();
      return data.data?.logs || [];
    } catch (error) {
      console.error("Error fetching system events:", error);
      throw error;
    }
  }
}

export default new MonitoringService();
