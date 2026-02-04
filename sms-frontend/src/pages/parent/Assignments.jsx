import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  FileText,
  GraduationCap,
  Loader2,
} from "lucide-react";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";

const LoadingSpinner = ({ size = "sm", color = "blue" }) => {
  const sizeClasses = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
    white: "text-white",
  };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

const Assignments = () => {
  const [selectedChildId, setSelectedChildId] = useState("");
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load children for parent
  useEffect(() => {
    let cancelled = false;
    const loadChildren = async () => {
      setLoading(true);
      setError("");
      try {
        // Get current user to resolve parentProfile id
        let parentId = null;
        try {
          const { response, data } = await authService.getProfile();
          if (response?.ok) {
            const parentProfile =
              data?.data?.data?.parentProfile || data?.data?.parentProfile;
            parentId = parentProfile
              ? parentProfile._id || parentProfile
              : null;
          }
        } catch {
          // fallback to cached user
          const u = authService.getUser();
          const cachedProfile = u?.parentProfile;
          parentId = cachedProfile ? cachedProfile._id || cachedProfile : null;
        }

        if (!parentId) {
          throw new Error("No parent profile linked to this account");
        }

        // Load children via students my-children endpoint
        const resChildren = await authService.authFetch(
          `${API_BASE_URL}/api/v1/students/my-children`
        );
        const dataChildren = await resChildren.json();
        const kids = (dataChildren?.data?.data || dataChildren?.data || []).map(
          (s) => ({
            _id: s._id,
            name: s.name + (s.surname ? ` ${s.surname}` : ""),
            class: s.class,
            grade: s.grade,
          })
        );

        if (!cancelled) {
          setChildren(kids);
          if (kids.length && !selectedChildId) {
            setSelectedChildId(kids[0]._id);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load children");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadChildren();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch selected child's assignments
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useQuery({
    queryKey: ["child-assignments", selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/assignments/student?student=${encodeURIComponent(
          selectedChildId
        )}`
      );

      if (!res.ok) {
        throw new Error(
          `Failed to fetch assignments: ${res.status} ${res.statusText}`
        );
      }

      const json = await res.json();
      return json.data.data || [];
    },
    enabled: !!selectedChildId,
  });

  // Group assignments by status
  const pendingAssignments = assignments.filter(
    (a) => a.status === "Published" && !a.isSubmitted
  );
  const completedAssignments = assignments.filter(
    (a) => a.isSubmitted || a.status === "Completed"
  );
  const overdueAssignments = assignments.filter((a) => {
    if (a.isSubmitted || a.status === "Completed") return false;
    const dueDate = new Date(a.dueDate);
    const now = new Date();
    return dueDate < now;
  });

  const getStatusColor = (assignment) => {
    if (assignment.isSubmitted || assignment.status === "Completed") {
      return "bg-green-100 text-green-800";
    }
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    if (dueDate < now && !assignment.isSubmitted) {
      return "bg-red-100 text-red-800";
    }
    return "bg-blue-100 text-blue-800";
  };

  const getStatusIcon = (assignment) => {
    if (assignment.isSubmitted || assignment.status === "Completed") {
      return <CheckCircle className="h-4 w-4" />;
    }
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    if (dueDate < now && !assignment.isSubmitted) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getStatusText = (assignment) => {
    if (assignment.isSubmitted || assignment.status === "Completed") {
      return "Completed";
    }
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    if (dueDate < now && !assignment.isSubmitted) {
      return "Overdue";
    }
    return "Pending";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Children</h3>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-semibold">No Children Found</h3>
          <p className="text-yellow-700 mt-2">
            No children are linked to your parent account.
          </p>
        </div>
      </div>
    );
  }

  const selectedChild = children.find((c) => c._id === selectedChildId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Assignments
                </h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">
                  Track your children's assignments and progress
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {assignmentsLoading && (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-spin" />
                )}
                <select
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm font-medium"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  disabled={children.length === 0}
                >
                  {children.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Role: Parent
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {assignmentsLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : assignmentsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-red-800 font-semibold text-base sm:text-lg">
              Error Loading Assignments
            </h3>
            <p className="text-red-700 mt-2 text-sm sm:text-base">
              {assignmentsError.message}
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
              No Assignments Found
            </h3>
            <p className="text-gray-500 text-sm sm:text-base">
              {selectedChild?.name} doesn't have any assignments yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Pending
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {pendingAssignments.length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Completed
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600">
                      {completedAssignments.length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Overdue
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-red-600">
                      {overdueAssignments.length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-red-100 rounded-full">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Assignments */}
            {pendingAssignments.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                    Pending Assignments
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {pendingAssignments.map((assignment, index) => (
                      <div
                        key={assignment._id || index}
                        className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center ${getStatusColor(
                                assignment
                              )}`}
                            >
                              {getStatusIcon(assignment)}
                              <span className="ml-1">
                                {getStatusText(assignment)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center">
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-blue-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.subject?.name || "Subject"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.teacher?.name &&
                              assignment.teacher?.surname
                                ? `${assignment.teacher.name} ${assignment.teacher.surname}`
                                : assignment.teacher?.name ||
                                  "Teacher Not Assigned"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-purple-500 flex-shrink-0" />
                            <span className="truncate">
                              Due: {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.classId?.name || "Class"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-orange-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.totalPoints} points
                            </span>
                          </div>
                        </div>
                        {assignment.description && (
                          <p className="mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Completed Assignments */}
            {completedAssignments.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 py-3 sm:py-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                    Completed Assignments
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {completedAssignments.map((assignment, index) => (
                      <div
                        key={assignment._id || index}
                        className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center ${getStatusColor(
                                assignment
                              )}`}
                            >
                              {getStatusIcon(assignment)}
                              <span className="ml-1">
                                {getStatusText(assignment)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center">
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-blue-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.subject?.name || "Subject"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.teacher?.name &&
                              assignment.teacher?.surname
                                ? `${assignment.teacher.name} ${assignment.teacher.surname}`
                                : assignment.teacher?.name ||
                                  "Teacher Not Assigned"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-purple-500 flex-shrink-0" />
                            <span className="truncate">
                              Due: {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.classId?.name || "Class"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-orange-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.totalPoints} points
                            </span>
                          </div>
                        </div>
                        {assignment.description && (
                          <p className="mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Assignments */}
            {overdueAssignments.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 sm:px-6 py-3 sm:py-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                    Overdue Assignments
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {overdueAssignments.map((assignment, index) => (
                      <div
                        key={assignment._id || index}
                        className="border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow duration-200 bg-red-50"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center bg-red-100 text-red-800">
                              <AlertCircle className="h-4 w-4" />
                              <span className="ml-1">Overdue</span>
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center">
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-blue-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.subject?.name || "Subject"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.teacher?.name &&
                              assignment.teacher?.surname
                                ? `${assignment.teacher.name} ${assignment.teacher.surname}`
                                : assignment.teacher?.name ||
                                  "Teacher Not Assigned"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-purple-500 flex-shrink-0" />
                            <span className="truncate">
                              Due: {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.classId?.name || "Class"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-orange-500 flex-shrink-0" />
                            <span className="truncate">
                              {assignment.totalPoints} points
                            </span>
                          </div>
                        </div>
                        {assignment.description && (
                          <p className="mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;
