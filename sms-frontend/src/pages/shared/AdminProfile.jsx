import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../../services/authService";
import RoleAccess from "../../components/RoleAccess";

const AdminProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemActivities, setSystemActivities] = useState([]);
  const [systemStats, setSystemStats] = useState([]);

  const getAccessLabel = (role) => {
    switch (role) {
      case "super_admin":
        return "Full Access";
      case "school_admin":
        return "Wide Access";
      case "academic_admin":
        return "Academic Admin Access";
      case "exam_admin":
        return "Examination Admin Access";
      case "finance_admin":
        return "Finance Admin Access";
      case "student_affairs_admin":
        return "Student Affairs Admin Access";
      case "it_admin":
        return "IT Admin Access";
      case "teacher":
        return "Teaching Access";
      case "student":
        return "Student Access";
      default:
        return "Limited Access";
    }
  };

  // Capabilities are now rendered via the reusable RoleAccess component

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { response, data } = await authService.getProfile();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          authService.clearAuthData();
          toast.error("Session expired. Please log in again.");
          navigate("/login");
          return;
        }
        throw new Error("Failed to fetch profile");
      }

      setProfile(data.data.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchSystemActivities = useCallback(async () => {
    try {
      const { response, data } = await authService.getActivities();

      if (response.ok) {
        setSystemActivities(data.data.activities);
      } else {
        setSystemActivities([]);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setSystemActivities([]);
    }
  }, []);

  const fetchSystemStats = useCallback(async () => {
    try {
      const { response, data } = await authService.getStats();

      if (response.ok) {
        setSystemStats([data.data.stats]); // Wrap in array for mapping
      } else {
        setSystemStats([]);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setSystemStats([]);
    }
  }, []);

  useEffect(() => {
    if (!authService.getToken()) {
      navigate("/login");
      return;
    }
    fetchProfile();
    fetchSystemActivities();
    fetchSystemStats();
  }, [navigate, fetchProfile, fetchSystemActivities, fetchSystemStats]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : "A";
  };

  const getRoleColor = (role) => {
    const map = {
      super_admin: "bg-red-100 text-red-800 border-red-200",
      school_admin: "bg-red-100 text-red-800 border-red-200",
      academic_admin: "bg-indigo-100 text-indigo-800 border-indigo-200",
      exam_admin: "bg-purple-100 text-purple-800 border-purple-200",
      finance_admin: "bg-yellow-100 text-yellow-800 border-yellow-200",
      student_affairs_admin: "bg-pink-100 text-pink-800 border-pink-200",
      it_admin: "bg-gray-100 text-gray-800 border-gray-200",
      teacher: "bg-blue-100 text-blue-800 border-blue-200",
      student: "bg-green-100 text-green-800 border-green-200",
      parent: "bg-teal-100 text-teal-800 border-teal-200",
    };
    return map[role] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Success: "bg-green-100 text-green-800",
      Failed: "bg-red-100 text-red-800",
      Warning: "bg-yellow-100 text-yellow-800",
      Pending: "bg-blue-100 text-blue-800",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-800";
  };

  const getActionBadge = (action) => {
    const actionConfig = {
      "User Login": "bg-blue-100 text-blue-800",
      "Student Record Update": "bg-green-100 text-green-800",
      "Grade Entry": "bg-purple-100 text-purple-800",
      "System Backup": "bg-orange-100 text-orange-800",
      "User Management": "bg-indigo-100 text-indigo-800",
    };
    return actionConfig[action] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
            <div className="space-y-2 w-full">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Profile Not Found
          </h3>
          <p className="text-gray-600">Unable to load profile information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-8 text-center">
                <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold text-gray-800">
                    {profile && profile.username
                      ? getInitials(profile.username)
                      : "A"}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {profile && profile.username
                    ? profile.username
                    : "Admin User"}
                </h2>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(
                    profile.role
                  )}`}
                >
                  <span className="capitalize mr-2">
                    {profile && profile.role ? profile.role : "Administrator"}
                  </span>
                  <span className="text-xs opacity-90">
                    • {getAccessLabel(profile?.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-xl">👤</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Account Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User ID */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    User ID
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="font-mono text-sm text-gray-800">
                      {profile._id || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Username */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Username
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-800">
                      {profile.username || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Role & Access Level */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Role & Access Level
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <RoleAccess
                      role={profile.role}
                      permissions={profile.permissions}
                    />
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Account Status
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 rounded-full mr-2 bg-green-500"></span>
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Additional Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Created Date */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Member Since
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-800">
                      {profile.createdAt
                        ? formatDate(profile.createdAt)
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Last Password Change */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Last Password Change
                  </label>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-800">
                      {profile.passwordChangedAt
                        ? formatDate(profile.passwordChangedAt)
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Activities */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600 text-xl">📋</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Recent System Activities
                </h3>
              </div>

              <div className="space-y-4">
                {systemActivities && systemActivities.length > 0 ? (
                  systemActivities.map((activity, index) => (
                    <div
                      key={activity._id || index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-4 h-4 rounded-full ${getStatusBadge(
                            activity.success ? "Success" : "Failed"
                          )}`}
                        ></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {activity.action || "Unknown Action"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {typeof activity.details === "object"
                              ? JSON.stringify(activity.details)
                              : activity.details ||
                                activity.resource ||
                                "No details"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.timestamp
                              ? new Date(
                                  activity.timestamp
                                ).toLocaleDateString()
                              : "Unknown date"}{" "}
                            at{" "}
                            {activity.timestamp
                              ? new Date(
                                  activity.timestamp
                                ).toLocaleTimeString()
                              : "Unknown time"}
                            {activity.user && typeof activity.user === "object"
                              ? ` • User: ${
                                  activity.user.username || "Unknown"
                                }`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getActionBadge(
                          activity.action
                        )}`}
                      >
                        {activity.action || "Unknown"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl">📋</span>
                    <p className="mt-2">No recent activities found</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Statistics */}
            {systemStats && systemStats.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-indigo-600 text-xl">📈</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    System Statistics
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systemStats.map((stat, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200 hover:shadow-lg transition-shadow"
                    >
                      <h4 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
                        <span className="text-indigo-600 mr-2">📊</span>
                        User Statistics
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(stat).map(([key, value]) => {
                          return (
                            <div
                              key={key}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}:
                              </span>
                              <span className="text-sm font-bold text-indigo-700">
                                {typeof value === "object"
                                  ? value === null
                                    ? "N/A"
                                    : Array.isArray(value)
                                    ? value.join(", ")
                                    : typeof value === "string"
                                    ? value
                                    : JSON.stringify(value)
                                  : value || "N/A"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-yellow-600 text-xl">🔒</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-yellow-800 mb-2">
                    Security Notice
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    Keep your account secure by regularly updating your password
                    and monitoring your account activity. If you notice any
                    suspicious activity, please contact the system administrator
                    immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
