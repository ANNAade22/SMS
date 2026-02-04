import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarDaysIcon,
  UserIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch audit logs with advanced filtering
  const {
    data: auditData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "auditLogs",
      currentPage,
      itemsPerPage,
      searchTerm,
      selectedAction,
      selectedUser,
      selectedDepartment,
      dateRange,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (selectedAction) params.append("action", selectedAction);
      if (selectedUser) params.append("user", selectedUser);
      if (selectedDepartment) params.append("department", selectedDepartment);
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/audit/system?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ["auditFilterOptions"],
    queryFn: async () => {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/audit/filter-options`
      );
      if (!response.ok) throw new Error("Failed to fetch filter options");
      return response.json();
    },
  });

  const auditLogs = auditData?.data?.logs || [];
  const totalLogs = auditData?.data?.total || 0;
  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  // Action type configurations
  const actionConfigs = {
    LOGIN: {
      icon: UserIcon,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    LOGOUT: {
      icon: UserIcon,
      color: "gray",
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
    },
    PASSWORD_CHANGE: {
      icon: ShieldCheckIcon,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    PROFILE_UPDATE: {
      icon: UserIcon,
      color: "purple",
      bgColor: "bg-purple-100",
      textColor: "text-purple-800",
    },
    USER_CREATE: {
      icon: UserIcon,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    USER_UPDATE: {
      icon: UserIcon,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    USER_DELETE: {
      icon: UserIcon,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    PAYMENT_CREATE: {
      icon: DocumentTextIcon,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    PAYMENT_UPDATE: {
      icon: DocumentTextIcon,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    PAYMENT_DELETE: {
      icon: DocumentTextIcon,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    FEE_ASSIGNMENT_CREATE: {
      icon: DocumentTextIcon,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    FEE_ASSIGNMENT_UPDATE: {
      icon: DocumentTextIcon,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    FEE_ASSIGNMENT_DELETE: {
      icon: DocumentTextIcon,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    FAILED_LOGIN: {
      icon: ExclamationTriangleIcon,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    ACCOUNT_LOCK: {
      icon: ExclamationTriangleIcon,
      color: "red",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    ACCOUNT_UNLOCK: {
      icon: CheckCircleIcon,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
  };

  const getActionConfig = (action) => {
    return (
      actionConfigs[action] || {
        icon: InformationCircleIcon,
        color: "gray",
        bgColor: "bg-gray-100",
        textColor: "text-gray-800",
      }
    );
  };

  const formatActionName = (action) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatDetails = (details) => {
    if (typeof details === "string") {
      try {
        const parsed = JSON.parse(details);
        return formatDetailsObject(parsed);
      } catch {
        return details;
      }
    }
    if (typeof details === "object" && details !== null) {
      return formatDetailsObject(details);
    }
    return details || "No details available";
  };

  // State for student cache
  const [studentCache, setStudentCache] = useState({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

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

      setStudentCache((prev) => ({ ...prev, [studentId]: studentInfo }));
      return studentInfo;
    } catch (error) {
      console.error("Error fetching student info:", error);
      const fallbackInfo = {
        username: `Student ${studentId.slice(-8)}`,
        name: `Student ${studentId.slice(-8)}`,
      };
      setStudentCache((prev) => ({ ...prev, [studentId]: fallbackInfo }));
      return fallbackInfo;
    }
  };

  // Helper function to format individual detail values
  const formatDetailValue = async (key, value) => {
    if (value === null || value === undefined) return "N/A";

    // Handle student ID specially - fetch student info
    if (
      key.toLowerCase().includes("student") &&
      key.toLowerCase().includes("id")
    ) {
      if (typeof value === "string" && value.length > 20) {
        // This is a student ID, fetch the student info
        const studentInfo = await fetchStudentInfo(value);
        return `${studentInfo.username} (${studentInfo.name})`;
      }
    }

    // Format dates
    if (
      key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("time")
    ) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } catch (e) {
        // If date parsing fails, return original value
      }
    }

    // Format amounts/currency
    if (
      key.toLowerCase().includes("amount") ||
      key.toLowerCase().includes("price") ||
      key.toLowerCase().includes("cost")
    ) {
      if (typeof value === "number") {
        return `$${value.toFixed(2)}`;
      }
    }

    // Format other IDs (truncate long IDs, but not student IDs)
    if (
      key.toLowerCase().includes("id") &&
      !key.toLowerCase().includes("student") &&
      typeof value === "string" &&
      value.length > 20
    ) {
      return `${value.slice(0, 8)}...${value.slice(-8)}`;
    }

    // Format user agent (truncate)
    if (
      key.toLowerCase().includes("useragent") &&
      typeof value === "string" &&
      value.length > 50
    ) {
      return `${value.slice(0, 50)}...`;
    }

    // Format IP addresses
    if (key.toLowerCase().includes("ip")) {
      return value === "::1" ? "Localhost" : value;
    }

    return value.toString();
  };

  // Helper function to get appropriate icons for detail keys
  const getDetailIcon = (key) => {
    const keyLower = key.toLowerCase();

    if (keyLower.includes("student")) return "👤";
    if (
      keyLower.includes("fee") ||
      keyLower.includes("amount") ||
      keyLower.includes("price")
    )
      return "💰";
    if (keyLower.includes("date") || keyLower.includes("time")) return "📅";
    if (keyLower.includes("ip")) return "🌐";
    if (keyLower.includes("useragent") || keyLower.includes("browser"))
      return "🔍";
    if (keyLower.includes("id")) return "🆔";
    if (keyLower.includes("status")) return "📊";
    if (keyLower.includes("method")) return "💳";
    if (keyLower.includes("type")) return "🏷️";
    if (keyLower.includes("name")) return "📝";

    return "📋";
  };

  // Component for individual detail items that handles async formatting
  const DetailItem = ({ fieldKey, value }) => {
    const [formattedValue, setFormattedValue] = useState("Loading...");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const formatValue = async () => {
        try {
          const result = await formatDetailValue(fieldKey, value);
          setFormattedValue(result);
        } catch (error) {
          console.error("Error formatting value:", error);
          setFormattedValue(value?.toString() || "N/A");
        } finally {
          setIsLoading(false);
        }
      };

      formatValue();
    }, [fieldKey, value]);

    const formattedKey = fieldKey
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());

    return (
      <div className="flex flex-col space-y-1">
        <span className="text-sm font-medium text-gray-600">
          {getDetailIcon(fieldKey)} {formattedKey}:
        </span>
        <span className="text-sm text-gray-900 font-medium">
          {isLoading ? (
            <span className="text-gray-400 italic">Loading...</span>
          ) : (
            formattedValue
          )}
        </span>
      </div>
    );
  };

  const formatDetailsObject = (obj) => {
    const formatted = [];

    if (obj.studentId) {
      formatted.push(`👤 Student: ${obj.studentId.slice(-8)}...`);
    }
    if (obj.amount) {
      formatted.push(`💰 Amount: $${obj.amount}`);
    }
    if (obj.paymentMethod) {
      formatted.push(`💳 Method: ${obj.paymentMethod}`);
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
    if (obj.username) {
      formatted.push(`👤 User: ${obj.username}`);
    }
    if (obj.department) {
      formatted.push(`🏢 Dept: ${obj.department}`);
    }
    if (obj.role) {
      formatted.push(`👔 Role: ${obj.role}`);
    }

    return formatted.length > 0
      ? formatted.join(" • ")
      : "No details available";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAction("");
    setSelectedUser("");
    setSelectedDepartment("");
    setDateRange({ start: "", end: "" });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedAction ||
    selectedUser ||
    selectedDepartment ||
    dateRange.start ||
    dateRange.end;

  const handleViewLog = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLog(null);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Audit Logs
          </h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-gray-600 mt-1">
                System security and compliance tracking
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="p-6 bg-gray-50 rounded-lg">
            {/* Search Bar */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-colors ${
                  showFilters || hasActiveFilters
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1">
                    {
                      [
                        searchTerm,
                        selectedAction,
                        selectedUser,
                        selectedDepartment,
                        dateRange.start,
                        dateRange.end,
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action Type
                    </label>
                    <select
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Actions</option>
                      {filterOptions?.data?.actions?.map((action) => (
                        <option key={action} value={action}>
                          {formatActionName(action)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Users</option>
                      {filterOptions?.data?.users?.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.username} ({user.profile?.firstName}{" "}
                          {user.profile?.lastName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">All Departments</option>
                      {filterOptions?.data?.departments?.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept.charAt(0).toUpperCase() +
                            dept.slice(1).replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Items per page
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {totalLogs} logs found
                    </div>
                    <button
                      onClick={clearFilters}
                      className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span>Clear all filters</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Audit Logs
              </h2>
              <div className="text-sm text-gray-500">
                {isLoading ? "Loading..." : `${totalLogs} total logs`}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading audit logs...</p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No audit logs found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log, index) => {
                    const actionConfig = getActionConfig(log.action);
                    const IconComponent = actionConfig.icon;

                    return (
                      <tr key={index} className="hover:bg-gray-50 h-16">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full ${actionConfig.bgColor} flex items-center justify-center mr-3`}
                            >
                              <IconComponent
                                className={`w-4 h-4 ${actionConfig.textColor}`}
                              />
                            </div>
                            <div>
                              <div
                                className={`text-sm font-medium ${actionConfig.textColor}`}
                              >
                                {formatActionName(log.action)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.resource || "System"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {log.user?.username || "Unknown User"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.user?.profile?.firstName}{" "}
                                {log.user?.profile?.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {formatDetails(log.details)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ipAddress || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              log.success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {log.success ? "Success" : "Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getTimeAgo(log.timestamp)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleViewLog(log);
                            }}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center space-x-1 px-3 py-2 rounded-lg font-medium"
                            style={{ cursor: "pointer" }}
                          >
                            <EyeIcon className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalLogs)} of{" "}
                  {totalLogs} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          currentPage === page
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log Detail Modal */}
        {showModal && selectedLog && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={closeModal}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div
                      className={`w-12 h-12 rounded-full ${
                        getActionConfig(selectedLog.action).bgColor
                      } flex items-center justify-center mr-4`}
                    >
                      {React.createElement(
                        getActionConfig(selectedLog.action).icon,
                        {
                          className: `w-6 h-6 ${
                            getActionConfig(selectedLog.action).textColor
                          }`,
                        }
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {formatActionName(selectedLog.action)}
                      </h3>
                      <p className="text-gray-600">Audit Log Details</p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Basic Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Action
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatActionName(selectedLog.action)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Status
                          </label>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedLog.success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedLog.success ? "Success" : "Failed"}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Resource
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedLog.resource || "System"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Department
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedLog.department || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">
                        Timestamp
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Full Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatTimestamp(selectedLog.timestamp)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Relative Time
                          </label>
                          <p className="text-sm text-gray-900">
                            {getTimeAgo(selectedLog.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      User Information
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                          <UserIcon className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedLog.user?.username || "Unknown User"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedLog.user?.profile?.firstName}{" "}
                            {selectedLog.user?.profile?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Email
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedLog.user?.email || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Role
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedLog.user?.role || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Department
                          </label>
                          <p className="text-sm text-gray-900">
                            {selectedLog.user?.department || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">
                        Network Information
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            IP Address
                          </label>
                          <p className="text-sm text-gray-900 font-mono">
                            {selectedLog.ipAddress || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            User Agent
                          </label>
                          <p className="text-sm text-gray-900 break-all">
                            {selectedLog.userAgent || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Action Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {/* User-Friendly Details */}
                    <div className="mb-6">
                      <h5 className="text-md font-semibold text-gray-800 mb-4">
                        📋 Summary
                      </h5>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedLog.details &&
                          typeof selectedLog.details === "object" ? (
                            Object.entries(selectedLog.details).map(
                              ([key, value]) => (
                                <DetailItem
                                  key={key}
                                  fieldKey={key}
                                  value={value}
                                />
                              )
                            )
                          ) : (
                            <div className="col-span-2">
                              <span className="text-sm text-gray-600">
                                No additional details available
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Technical Details (Collapsible) */}
                    <div>
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center space-x-2">
                          <span>🔧 Technical Details</span>
                          <span className="group-open:rotate-180 transition-transform">
                            ▼
                          </span>
                        </summary>
                        <div className="mt-3">
                          <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                            {JSON.stringify(selectedLog.details, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {selectedLog.errorMessage && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Error Information
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">
                        {selectedLog.errorMessage}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
