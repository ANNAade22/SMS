// src/services/dashboardService.js
import { API_BASE_URL } from "../config";
import api from "./apiClient";

class DashboardService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Compose simple count stats from existing resource endpoints instead of dedicated /dashboard/stats
  async getDashboardStats() {
    try {
      // Use new lightweight /count endpoints (returns { total } and X-Total-Count header)
      const endpoints = [
        { key: "totalStudents", url: `${this.baseURL}/api/v1/students/count` },
        { key: "totalTeachers", url: `${this.baseURL}/api/v1/teachers/count` },
        { key: "totalClasses", url: `${this.baseURL}/api/v1/classes/count` },
        { key: "totalSubjects", url: `${this.baseURL}/api/v1/subjects/count` },
        {
          key: "totalParents",
          url: `${this.baseURL}/api/v1/users/count?role=parent`,
        },
        {
          key: "totalAdmins",
          url: `${this.baseURL}/api/v1/users/count?role=super_admin&role=school_admin&role=academic_admin&role=exam_admin&role=finance_admin&role=student_affairs_admin&role=it_admin`,
        },
      ];

      const responses = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const res = await api.get(ep.url.replace(this.baseURL, ""));
            let total = 0;
            const headerTotal =
              res.headers?.["x-total-count"] ||
              res.headers?.get?.("X-Total-Count");
            if (headerTotal) total = parseInt(headerTotal, 10) || 0;
            else total = res.data.total || 0;
            return { key: ep.key, total };
          } catch (e) {
            console.warn("Dashboard stat fetch failed for", ep.key, e.message);
            return { key: ep.key, total: 0, error: true };
          }
        })
      );

      const stats = responses.reduce((acc, cur) => {
        acc[cur.key] = { value: cur.total };
        return acc;
      }, {});

      return { ...this.getFallbackStats(), ...stats };
    } catch (error) {
      console.error("Error composing dashboard stats:", error);
      return this.getFallbackStats();
    }
  }

  // Get recent activities
  async getRecentActivities(limit = 10) {
    try {
      const res = await api.get(`/api/v1/dashboard/activities?limit=${limit}`);
      const json = res.data;
      return json.data?.activities || json.data || json;
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      return this.getFallbackActivities();
    }
  }

  // Get user statistics by role
  async getUserStats() {
    try {
      const res = await api.get(`/api/v1/dashboard/user-stats`);
      const json = res.data;
      return json.data?.userStats || json.data || json;
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return this.getFallbackUserStats();
    }
  }

  // Get class distribution data
  async getClassDistribution() {
    try {
      const res = await api.get(`/api/v1/dashboard/class-distribution`);
      const json = res.data;
      return json.data?.classDistribution
        ? {
            classDistribution: json.data.classDistribution,
            classDetails: json.data.classDetails,
          }
        : json.data || json;
    } catch (error) {
      console.error("Error fetching class distribution:", error);
      return this.getFallbackClassDistribution();
    }
  }

  // Get performance metrics
  async getPerformanceMetrics() {
    try {
      const res = await api.get(`/api/v1/dashboard/performance`);
      const json = res.data;
      return json.data?.performanceMetrics || json.data || json;
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      return this.getFallbackPerformanceMetrics();
    }
  }

  // Get attendance overview
  async getAttendanceOverview() {
    try {
      const res = await api.get(`/api/v1/dashboard/attendance-overview`);
      const json = res.data;
      return json.data?.attendanceOverview || json.data || json;
    } catch (error) {
      console.error("Error fetching attendance overview:", error);
      return this.getFallbackAttendanceOverview();
    }
  }

  // Fallback data methods for when API is not available
  getFallbackStats() {
    return {
      totalStudents: { value: 0 },
      totalTeachers: { value: 0 },
      totalClasses: { value: 0 },
      totalSubjects: { value: 0 },
      todayAttendance: { value: "0/0", change: "0%", changeType: "neutral" },
      averageGrade: { value: "0.0", change: "0", changeType: "neutral" },
    };
  }

  getFallbackActivities() {
    return {
      activities: [
        {
          id: 1,
          action: "SYSTEM",
          description: "Dashboard is loading data...",
          timestamp: new Date().toISOString(),
          user: "System",
          type: "system",
        },
      ],
    };
  }

  getFallbackUserStats() {
    return {
      labels: ["Admins", "Teachers", "Students", "Parents"],
      datasets: [{ data: [0, 0, 0, 0] }],
    };
  }

  getFallbackClassDistribution() {
    return {
      classDistribution: {
        labels: ["Class 1", "Class 2"],
        datasets: [{ data: [0, 0] }],
      },
      classDetails: [],
    };
  }

  getFallbackPerformanceMetrics() {
    return {
      labels: ["90-100", "80-89", "70-79", "60-69", "0-59"],
      datasets: [{ data: [0, 0, 0, 0, 0] }],
    };
  }

  getFallbackAttendanceOverview() {
    return {
      labels: ["Mon", "Tue"],
      datasets: [
        { label: "Present", data: [0, 0] },
        { label: "Absent", data: [0, 0] },
      ],
    };
  }
}

export default new DashboardService();
