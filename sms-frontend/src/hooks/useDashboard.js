// src/hooks/useDashboard.js
import { useState, useEffect, useCallback } from "react";
import dashboardService from "../services/dashboardService";

export const useDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [classDistribution, setClassDistribution] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch composed stats + aggregation endpoints (stats now built from existing CRUD endpoints)
      const [
        statsData,
        activitiesData,
        userStatsData,
        classDistData,
        performanceData,
        attendanceData,
      ] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentActivities(),
        dashboardService.getUserStats(),
        dashboardService.getClassDistribution(),
        dashboardService.getPerformanceMetrics(),
        dashboardService.getAttendanceOverview(),
      ]);

      setStats(statsData);
      // activities endpoint may return wrapped object
      setActivities(
        Array.isArray(activitiesData)
          ? activitiesData
          : activitiesData.activities || []
      );
      setUserStats(userStatsData);
      setClassDistribution(classDistData);
      setPerformanceMetrics(performanceData);
      setAttendanceOverview(attendanceData);
      setLastUpdated(new Date());

      // Store current stats as previous for next comparison
      setPreviousStats(statsData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to calculate percentage change
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0)
      return { change: "0%", changeType: "neutral" };

    const change = ((current - previous) / previous) * 100;
    const roundedChange =
      Math.abs(change) < 0.1 ? 0 : Math.round(change * 10) / 10;

    if (roundedChange === 0) {
      return { change: "0%", changeType: "neutral" };
    } else if (roundedChange > 0) {
      return { change: `+${roundedChange}%`, changeType: "increase" };
    } else {
      return { change: `${roundedChange}%`, changeType: "decrease" };
    }
  };

  // Refresh data
  const refreshData = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Format stats for display
  const formattedStats = stats
    ? [
        {
          title: "Total Students",
          value: (
            stats.totalStudents?.value ||
            stats.totalStudents ||
            0
          ).toLocaleString(),
          icon: "/students.svg",
          color: "bg-blue-500",
          ...calculateChange(
            stats.totalStudents?.value || stats.totalStudents || 0,
            previousStats?.totalStudents?.value ||
              previousStats?.totalStudents ||
              0
          ),
        },
        {
          title: "Total Teachers",
          value: (
            stats.totalTeachers?.value ||
            stats.totalTeachers ||
            0
          ).toLocaleString(),
          icon: "/teachers.svg",
          color: "bg-green-500",
          ...calculateChange(
            stats.totalTeachers?.value || stats.totalTeachers || 0,
            previousStats?.totalTeachers?.value ||
              previousStats?.totalTeachers ||
              0
          ),
        },
        {
          title: "Active Classes",
          value: (
            stats.totalClasses?.value ||
            stats.totalClasses ||
            0
          ).toLocaleString(),
          icon: "/classes.svg",
          color: "bg-purple-500",
          ...calculateChange(
            stats.totalClasses?.value || stats.totalClasses || 0,
            previousStats?.totalClasses?.value ||
              previousStats?.totalClasses ||
              0
          ),
        },
        {
          title: "Pending Assignments",
          value: (
            stats.activeAssignments?.value ||
            stats.activeAssignments ||
            0
          ).toLocaleString(),
          icon: "📋",
          color: "bg-orange-500",
          ...calculateChange(
            stats.activeAssignments?.value || stats.activeAssignments || 0,
            previousStats?.activeAssignments?.value ||
              previousStats?.activeAssignments ||
              0
          ),
        },
        {
          title: "Total Subjects",
          value: (
            stats.totalSubjects?.value ||
            stats.totalSubjects ||
            0
          ).toLocaleString(),
          icon: "📚",
          color: "bg-indigo-500",
          ...calculateChange(
            stats.totalSubjects?.value || stats.totalSubjects || 0,
            previousStats?.totalSubjects?.value ||
              previousStats?.totalSubjects ||
              0
          ),
        },
        {
          title: "Active Events",
          value: (
            stats.totalEvents?.value ||
            stats.totalEvents ||
            0
          ).toLocaleString(),
          icon: "📅",
          color: "bg-pink-500",
          ...calculateChange(
            stats.totalEvents?.value || stats.totalEvents || 0,
            previousStats?.totalEvents?.value || previousStats?.totalEvents || 0
          ),
        },
        {
          title: "Total Parents",
          value: (
            stats.totalParents?.value ||
            stats.totalParents ||
            0
          ).toLocaleString(),
          icon: "👨‍👩‍👧‍👦",
          color: "bg-cyan-500",
          ...calculateChange(
            stats.totalParents?.value || stats.totalParents || 0,
            previousStats?.totalParents?.value ||
              previousStats?.totalParents ||
              0
          ),
        },
        {
          title: "Total Admins/Staff",
          value: (
            stats.totalAdmins?.value ||
            stats.totalAdmins ||
            0
          ).toLocaleString(),
          icon: "👔",
          color: "bg-teal-500",
          ...calculateChange(
            stats.totalAdmins?.value || stats.totalAdmins || 0,
            previousStats?.totalAdmins?.value || previousStats?.totalAdmins || 0
          ),
        },
      ]
    : [];

  // Format activities for display
  const formattedActivities = activities.map((activity) => ({
    id: activity.id || Math.random(),
    action: activity.action || activity.description || "Unknown action",
    time: activity.timestamp
      ? new Date(activity.timestamp).toLocaleString()
      : "Unknown time",
    user: activity.user || "Unknown user",
    type: activity.type || "info",
  }));

  return {
    // Data
    stats: formattedStats,
    activities: formattedActivities,
    userStats,
    classDistribution,
    performanceMetrics,
    attendanceOverview,

    // State
    loading,
    error,
    lastUpdated,

    // Actions
    refreshData,
    fetchDashboardData,
  };
};

export default useDashboard;
