import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import monitoringService from "../services/monitoringService";
import authService from "../services/authService";
import { API_BASE_URL } from "../config";
import {
  EyeIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const FinanceAdminMonitor = () => {
  const { user } = useAuth();
  const [financeAdminData, setFinanceAdminData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [studentCache, setStudentCache] = useState({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Only show for super admin
  if (user?.role !== "super_admin") {
    return null;
  }

  // Function to fetch student information
  const fetchStudentInfo = async (studentId) => {
    if (studentCache[studentId]) {
      return studentCache[studentId];
    }

    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/${studentId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check if student data exists (nested under data.data.data)
      const studentData = data.data?.data;
      if (!studentData) {
        throw new Error("No student data found");
      }

      const studentInfo = {
        username: studentData?.username || "Unknown",
        name:
          studentData?.name ||
          (studentData?.surname
            ? `${studentData.name} ${studentData.surname}`.trim()
            : studentData?.name) ||
          "Unknown Student",
      };

      // Check if we got meaningful data
      if (
        studentInfo.username === "Unknown" &&
        studentInfo.name === "Unknown Student"
      ) {
        // Student data appears to be empty or invalid
      }
      setStudentCache((prev) => ({ ...prev, [studentId]: studentInfo }));
      return studentInfo;
    } catch (error) {
      const fallbackInfo = {
        username: `Student ${studentId.slice(-8)}`,
        name: `Student ${studentId.slice(-8)}`,
      };
      setStudentCache((prev) => ({ ...prev, [studentId]: fallbackInfo }));
      return fallbackInfo;
    }
  };

  const fetchFinanceAdminData = async () => {
    try {
      setLoading(true);
      const data = await monitoringService.getMonitoringData();

      setFinanceAdminData(data.financeAdmin);
      setAuditLogs(data.auditLogs || []);
      setSessions(data.sessions || []);
      setError(data.error);

      // Pre-fetch student information for audit logs
      const studentIds = new Set();
      [...(data.auditLogs || [])].forEach((item) => {
        try {
          const details =
            typeof item.details === "string"
              ? JSON.parse(item.details)
              : item.details;

          // Check for studentId in various possible locations
          const studentId =
            details?.studentId || details?.student || details?.student_id;
          if (studentId) {
            studentIds.add(studentId);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });

      // Fetch student info for all unique student IDs
      if (studentIds.size > 0) {
        setIsLoadingStudents(true);
        const studentPromises = Array.from(studentIds).map((id) =>
          fetchStudentInfo(id)
        );
        await Promise.allSettled(studentPromises);
        setIsLoadingStudents(false);
      }
    } catch (err) {
      setError("Failed to load finance admin monitoring data");

      // For testing purposes, show some mock data if there's an error
      if (!financeAdminData) {
        setFinanceAdminData({
          _id: "mock-id",
          email: "finance@admin.com",
          profile: {
            firstName: "Finance",
            lastName: "Admin",
          },
        });
        setAuditLogs([
          {
            action: "LOGIN",
            details: "User logged in successfully",
            timestamp: new Date().toISOString(),
            success: true,
          },
          {
            action: "VIEW_FINANCE",
            details: "Viewed finance dashboard",
            timestamp: new Date(Date.now() - 300000).toISOString(),
            success: true,
          },
        ]);
        setSessions([
          {
            _id: "session-1",
            createdAt: new Date().toISOString(),
            ipAddress: "192.168.1.100",
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceAdminData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchFinanceAdminData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
        return "text-gray-600 bg-gray-100";
      case "suspended":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getActivityIcon = (action) => {
    const actionStr =
      typeof action === "string" ? action : String(action || "");

    // Specific action icons
    if (actionStr.includes("FEE_ASSIGNMENT"))
      return <ChartBarIcon className="w-4 h-4" />;
    if (actionStr.includes("PAYMENT"))
      return <ChartBarIcon className="w-4 h-4" />;
    if (actionStr.includes("STUDENT")) return <UserIcon className="w-4 h-4" />;
    if (actionStr.includes("LOGIN")) return <UserIcon className="w-4 h-4" />;
    if (actionStr.includes("LOGOUT")) return <UserIcon className="w-4 h-4" />;
    if (actionStr.includes("PASSWORD"))
      return <ShieldCheckIcon className="w-4 h-4" />;
    if (actionStr.includes("PROFILE")) return <UserIcon className="w-4 h-4" />;
    if (actionStr.includes("DATA_ACCESS"))
      return <EyeIcon className="w-4 h-4" />;
    if (actionStr.includes("SYSTEM_EVENT"))
      return <ShieldCheckIcon className="w-4 h-4" />;

    // Generic patterns
    if (actionStr.includes("login")) return <UserIcon className="w-4 h-4" />;
    if (actionStr.includes("finance") || actionStr.includes("payment"))
      return <ChartBarIcon className="w-4 h-4" />;
    if (actionStr.includes("view") || actionStr.includes("read"))
      return <EyeIcon className="w-4 h-4" />;
    if (actionStr.includes("update") || actionStr.includes("modify"))
      return <DocumentTextIcon className="w-4 h-4" />;
    if (actionStr.includes("permission") || actionStr.includes("role"))
      return <ShieldCheckIcon className="w-4 h-4" />;
    return <ClockIcon className="w-4 h-4" />;
  };

  const formatTime = (timestamp) => {
    try {
      if (!timestamp) return "Unknown time";
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return "Invalid time";
    }
  };

  const getTimeAgo = (timestamp) => {
    try {
      if (!timestamp) return "Unknown time";
      const now = new Date();
      const time = new Date(timestamp);
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch (error) {
      return "Unknown time";
    }
  };

  // Helper function to safely render data
  const safeRender = (data, fallback = "Unknown") => {
    if (typeof data === "string" || typeof data === "number") {
      return data;
    }
    if (typeof data === "object" && data !== null) {
      return JSON.stringify(data);
    }
    return fallback;
  };

  // Helper function to format audit log details
  const formatAuditDetails = (details) => {
    if (typeof details === "string") {
      try {
        const parsed = JSON.parse(details);
        return formatAuditObject(parsed);
      } catch {
        return details;
      }
    }
    if (typeof details === "object" && details !== null) {
      return formatAuditObject(details);
    }
    return details || "No details available";
  };

  // Helper function to format audit log objects
  const formatAuditObject = (obj) => {
    const formatted = [];

    // Handle common audit log fields with better formatting
    // Check for studentId in various possible locations
    const studentId = obj.studentId || obj.student || obj.student_id;

    if (studentId) {
      // Get student info from cache or use fallback
      const studentInfo = studentCache[studentId];
      let studentDisplay;

      if (studentInfo) {
        studentDisplay = `${studentInfo.username} (${studentInfo.name})`;
      } else if (isLoadingStudents) {
        studentDisplay = "Loading...";
      } else {
        // Try to fetch student info if not in cache
        fetchStudentInfo(studentId);
        studentDisplay = `Student ${studentId.slice(-8)}`;
      }

      formatted.push(`👤 Student: ${studentDisplay}`);
    }
    if (obj.feeId) {
      formatted.push(`💰 Fee: ${obj.feeId.slice(-8)}...`);
    }
    if (obj.assignedAmount) {
      formatted.push(`💵 Amount: $${obj.assignedAmount}`);
    }
    if (obj.dueDate) {
      const dueDate = new Date(obj.dueDate).toLocaleDateString();
      formatted.push(`📅 Due: ${dueDate}`);
    }
    if (obj.ipAddress) {
      formatted.push(`🌐 IP: ${obj.ipAddress}`);
    }
    if (obj.userAgent) {
      const browser = obj.userAgent.includes("Chrome")
        ? "Chrome"
        : obj.userAgent.includes("Firefox")
        ? "Firefox"
        : obj.userAgent.includes("Safari")
        ? "Safari"
        : obj.userAgent.includes("Edge")
        ? "Edge"
        : "Browser";
      formatted.push(`🔍 ${browser}`);
    }
    if (obj.timestamp) {
      const time = new Date(obj.timestamp).toLocaleTimeString();
      formatted.push(`⏰ ${time}`);
    }

    // Handle other fields with emojis
    Object.keys(obj).forEach((key) => {
      if (
        ![
          "studentId",
          "feeId",
          "assignedAmount",
          "dueDate",
          "ipAddress",
          "userAgent",
          "timestamp",
        ].includes(key)
      ) {
        const emoji = key.includes("status")
          ? "📊"
          : key.includes("type")
          ? "🏷️"
          : key.includes("name")
          ? "📝"
          : "📋";
        formatted.push(`${emoji} ${key}: ${obj[key]}`);
      }
    });

    return formatted.length > 0
      ? formatted.join(" • ")
      : "No details available";
  };

  // Helper function to get action description
  const getActionDescription = (action) => {
    const actionMap = {
      FEE_ASSIGNMENT_CREATE: "Fee Assignment Created",
      FEE_ASSIGNMENT_UPDATE: "Fee Assignment Updated",
      FEE_ASSIGNMENT_DELETE: "Fee Assignment Deleted",
      PAYMENT_CREATE: "Payment Recorded",
      PAYMENT_UPDATE: "Payment Updated",
      PAYMENT_DELETE: "Payment Deleted",
      STUDENT_CREATE: "Student Created",
      STUDENT_UPDATE: "Student Updated",
      STUDENT_DELETE: "Student Deleted",
      LOGIN: "User Login",
      LOGOUT: "User Logout",
      PASSWORD_CHANGE: "Password Changed",
      PROFILE_UPDATE: "Profile Updated",
      DATA_ACCESS: "Data Accessed",
      SYSTEM_EVENT: "System Event",
    };

    return (
      actionMap[action] ||
      action
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Loading Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="animate-pulse">
            <div className="h-8 bg-indigo-400 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-indigo-300 rounded w-1/2"></div>
          </div>
        </div>

        {/* Loading Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-8"
            >
              <div className="animate-pulse">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        {/* Error Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 mr-4" />
            <div>
              <h2 className="text-2xl font-bold">Monitoring Error</h2>
              <p className="text-red-100">
                Unable to load finance admin monitoring data
              </p>
            </div>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Connection Error
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchFinanceAdminData}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!financeAdminData) {
    return (
      <div className="space-y-8">
        {/* No Data Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 mr-4" />
            <div>
              <h2 className="text-2xl font-bold">No Finance Admin</h2>
              <p className="text-yellow-100">
                No finance administrator found in the system
              </p>
            </div>
          </div>
        </div>

        {/* No Data Details */}
        <div className="bg-white rounded-xl shadow-lg border border-yellow-200 p-8">
          <div className="text-center">
            <UserIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No Finance Admin Found
            </h3>
            <p className="text-gray-600 mb-4">
              There are currently no finance administrators in the system to
              monitor.
            </p>
            <p className="text-sm text-gray-500">
              Create a finance admin account to start monitoring activities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Add error boundary for the component
  try {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center mb-2">
                <UserIcon className="w-8 h-8 mr-3" />
                Finance Admin Monitoring
              </h2>
              <p className="text-indigo-100 text-lg">
                Real-time activity tracking and oversight dashboard
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-white/20 rounded-lg px-4 py-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live monitoring</span>
            </div>
          </div>
        </div>

        {/* Finance Admin Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <UserIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Finance Admin Details
              </h3>
              <p className="text-gray-600">
                Current user information and status
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Name
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {financeAdminData.profile?.firstName}{" "}
                {financeAdminData.profile?.lastName}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Email
                </p>
              </div>
              <p className="text-xl font-bold text-gray-900 break-all">
                {financeAdminData.email}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Status
                </p>
              </div>
              <span
                className={`inline-flex px-4 py-2 text-sm font-bold rounded-full ${getStatusColor(
                  "active"
                )}`}
              >
                ✓ Active
              </span>
            </div>
          </div>
        </div>

        {/* Current Session */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Current Session
              </h3>
              <p className="text-gray-600">
                Active login sessions and device information
              </p>
            </div>
          </div>
          {sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          Active Session
                        </p>
                        <p className="text-sm text-gray-600">
                          Started: {formatTime(session.createdAt)}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              IP:
                            </span>
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {safeRender(session.ipAddress, "Unknown")}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Device:
                            </span>
                            <span className="text-sm text-gray-700 max-w-xs truncate">
                              {safeRender(session.userAgent, "Unknown")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">
                        {getTimeAgo(session.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500 font-medium">
                No active sessions
              </p>
              <p className="text-sm text-gray-400">
                Finance admin is currently offline
              </p>
            </div>
          )}
        </div>

        {/* Audit Logs Summary */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <ShieldCheckIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Recent Audit Logs
                </h3>
                <p className="text-gray-600">
                  Latest system security and compliance events
                </p>
              </div>
            </div>
            <a
              href="/admin/audit-logs"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <EyeIcon className="w-4 h-4" />
              <span>See More</span>
            </a>
          </div>
          {auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.slice(0, 3).map((log, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        {getActivityIcon(log.action)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-lg font-semibold text-gray-900">
                          {getActionDescription(log.action)}
                        </p>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                          {getTimeAgo(log.timestamp)}
                        </span>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 mb-2">
                        <p className="text-sm text-gray-700 font-medium">
                          {formatAuditDetails(log.details)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {auditLogs.length > 3 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    Showing 3 of {auditLogs.length} recent audit logs
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShieldCheckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500 font-medium">No audit logs</p>
              <p className="text-sm text-gray-400">
                Security events will appear here
              </p>
            </div>
          )}
        </div>

        {/* Data Access Summary */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Data Access Summary
              </h3>
              <p className="text-gray-600">
                Activity statistics and access patterns
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">
                Finance Pages
              </p>
              <p className="text-3xl font-bold text-blue-900">
                {Array.isArray(auditLogs)
                  ? auditLogs.filter(
                      (log) =>
                        log && log.action && log.action.includes("finance")
                    ).length
                  : 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">access attempts</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
                Student Records
              </p>
              <p className="text-3xl font-bold text-green-900">
                {Array.isArray(auditLogs)
                  ? auditLogs.filter(
                      (log) =>
                        log && log.action && log.action.includes("student")
                    ).length
                  : 0}
              </p>
              <p className="text-xs text-green-600 mt-1">data views</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-2">
                Parent Records
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {Array.isArray(auditLogs)
                  ? auditLogs.filter(
                      (log) =>
                        log && log.action && log.action.includes("parent")
                    ).length
                  : 0}
              </p>
              <p className="text-xs text-purple-600 mt-1">data views</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-2">
                System Events
              </p>
              <p className="text-3xl font-bold text-yellow-900">
                {Array.isArray(auditLogs)
                  ? auditLogs.filter(
                      (log) =>
                        log && log.action && log.action.includes("system")
                    ).length
                  : 0}
              </p>
              <p className="text-xs text-yellow-600 mt-1">events logged</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
          <span className="text-red-800">
            Error rendering monitoring data: {error.message}
          </span>
        </div>
      </div>
    );
  }
};

export default FinanceAdminMonitor;
