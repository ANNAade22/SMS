import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Plus,
  Archive,
  Play,
  BarChart3,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import semesterService from "../../services/semesterService";
import { toast } from "react-hot-toast";
import PermissionWrapper from "../../components/PermissionWrapper";

const LoadingSpinner = ({ size = "sm" }) => {
  const sizeClasses = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-blue-600`}
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

// Start Semester Modal Component
const StartSemesterModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    semester: "Semester 1",
    academicYear: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      academicYear: defaultAcademicYear,
      startDate: new Date().toISOString().split("T")[0],
    }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Start New Semester
            </h3>
            <p className="text-sm text-gray-600">
              Create a new academic semester
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                placeholder="2024-2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description for this semester..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Starting Semester...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Semester
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SemesterManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all semesters
  const { data: semesters = [], isLoading: semestersLoading } = useQuery({
    queryKey: ["semesters"],
    queryFn: semesterService.getAllSemesters,
  });

  // Fetch current semester
  const { data: currentSemester, isLoading: currentLoading } = useQuery({
    queryKey: ["current-semester"],
    queryFn: semesterService.getCurrentSemester,
    retry: false, // Don't retry on 404 errors
    enabled: true, // Always try to fetch
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Close semester mutation
  const closeSemesterMutation = useMutation({
    mutationFn: semesterService.closeCurrentSemester,
    onSuccess: () => {
      toast.success("Semester closed successfully");
      queryClient.invalidateQueries(["semesters"]);
      queryClient.invalidateQueries(["current-semester"]);
      setShowCloseModal(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to close semester");
    },
  });

  // Start new semester mutation
  const startSemesterMutation = useMutation({
    mutationFn: semesterService.startNewSemester,
    onSuccess: () => {
      toast.success("New semester started successfully");
      queryClient.invalidateQueries(["semesters"]);
      queryClient.invalidateQueries(["current-semester"]);
      setShowStartModal(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start new semester");
    },
  });

  const getStatusColor = (status) => {
    const colors = {
      Planning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Active: "bg-green-100 text-green-800 border-green-200",
      Completed: "bg-blue-100 text-blue-800 border-blue-200",
      Archived: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status) => {
    const icons = {
      Planning: Clock,
      Active: Play,
      Completed: CheckCircle,
      Archived: Archive,
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  };

  if (semestersLoading || currentLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <PermissionWrapper
      requiredPermission="view_semester"
      fallbackMessage="You don't have permission to access the Semester Management section. Only administrators with semester management permissions can view this page."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Semester Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage academic semesters and track student progress
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowStartModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start New Semester
            </button>
            {currentSemester && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Close Current
              </button>
            )}
          </div>
        </div>

        {/* Current Semester Card */}
        {currentSemester ? (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Current Active Semester
                  </h2>
                  <p className="text-gray-600">
                    {currentSemester.semester} {currentSemester.academicYear}
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(
                  currentSemester.status
                )}`}
              >
                {getStatusIcon(currentSemester.status)}
                {currentSemester.status}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Start Date</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(currentSemester.startDate)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">End Date</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(currentSemester.endDate)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Duration</div>
                <div className="text-lg font-semibold text-gray-900">
                  {getDuration(
                    currentSemester.startDate,
                    currentSemester.endDate
                  )}
                </div>
              </div>
            </div>
            {currentSemester.description && (
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600">Description</div>
                <div className="text-gray-900">
                  {currentSemester.description}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  No Active Semester
                </h2>
                <p className="text-gray-600">
                  Start a new semester to begin recording results
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-600">
                <strong>Status:</strong> No semester is currently active. Click
                "Start New Semester" to create a new academic period.
              </div>
            </div>
          </div>
        )}

        {/* Semesters List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              All Semesters
            </h3>
            <p className="text-gray-600">
              View and manage all academic semesters
            </p>
          </div>
          <div className="p-6">
            {semesters.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No semesters found
                </h3>
                <p className="text-gray-500">
                  Create your first semester to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {semesters.map((semester) => (
                  <div
                    key={semester._id}
                    className={`border rounded-xl p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
                      semester.isActive
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200"
                    }`}
                    onClick={() => setSelectedSemester(semester)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            semester.isActive ? "bg-green-100" : "bg-gray-100"
                          }`}
                        >
                          <Calendar
                            className={`w-5 h-5 ${
                              semester.isActive
                                ? "text-green-600"
                                : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {semester.semester}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {semester.academicYear}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                          semester.status
                        )}`}
                      >
                        {getStatusIcon(semester.status)}
                        {semester.status}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Start:</span>
                        <span>{formatDate(semester.startDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>End:</span>
                        <span>{formatDate(semester.endDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>
                          {getDuration(semester.startDate, semester.endDate)}
                        </span>
                      </div>
                    </div>

                    {semester.description && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Description</div>
                        <div className="text-sm text-gray-700 truncate">
                          {semester.description}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close Semester Modal */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Close Current Semester
                  </h3>
                  <p className="text-sm text-gray-600">
                    This action will archive the current semester
                  </p>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-orange-800">
                  <strong>Warning:</strong> This will mark the current semester
                  as completed and archive all results. You won't be able to add
                  new results to this semester.
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => closeSemesterMutation.mutate()}
                  disabled={closeSemesterMutation.isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {closeSemesterMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Close Semester
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Start New Semester Modal */}
        {showStartModal && (
          <StartSemesterModal
            onClose={() => setShowStartModal(false)}
            onSubmit={(data) => startSemesterMutation.mutate(data)}
            isLoading={startSemesterMutation.isPending}
          />
        )}
      </div>
    </PermissionWrapper>
  );
};

export default SemesterManagement;
