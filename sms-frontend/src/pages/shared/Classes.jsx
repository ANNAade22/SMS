import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import EnhancedTable from "../../components/EnhancedTable";
import PermissionWrapper from "../../components/PermissionWrapper";
import { useAuth } from "../../hooks/useAuth";

// Loading Spinner Component
const LoadingSpinner = ({ size = "sm", color = "blue" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
    white: "text-white",
  };
  return (
    <>
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
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </>
  );
};

const Classes = ({ role = "admin" }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const { hasPermission, user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Permission check for admin role
  if (role === "admin" && !hasPermission("view_classes")) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
      >
        <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            You do not have permission to access the class management section.
            <br />
            Only administrators with class management permissions can view this page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={() => (window.location.href = "/admin/dashboard")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [viewingClass, setViewingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      capacity: "",
      grade: "",
    },
  });

  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await res.json();
      return json.data.data || [];
    },
  });

  // Fetch teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      try {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/teachers?limit=1000`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch teachers");
        }
        const json = await res.json();
        console.log("Teachers API response in Classes:", json);
        // API shape: { data: { data: teachers[] } }
        const teachersData = Array.isArray(json?.data?.data)
          ? json.data.data
          : [];
        console.log(
          "Processed teachers for Classes:",
          teachersData.length,
          "teachers found"
        );
        return teachersData;
      } catch (error) {
        console.error("Teachers fetch error:", error);
        // Return empty array instead of fallback data
        return [];
      }
    },
  });

  // Fetch grades
  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      try {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/grades`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch grades");
        }
        const json = await res.json();
        return json.data?.grades || [];
      } catch (error) {
        console.error("Grades fetch error:", error);
        // Return some fallback data for testing
        return [
          { _id: "fallback1", level: 1 },
          { _id: "fallback2", level: 2 },
          { _id: "fallback3", level: 3 },
        ];
      }
    },
  });

  // Mutations
  const addClassMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        name: data.name,
        capacity: parseInt(data.capacity),
        grade: data.grade,
        supervisor: data.supervisor || null,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create class");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowAddModal(false);
      reset();
      toast.success("Class added successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add class");
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        name: data.name,
        capacity: parseInt(data.capacity),
        grade: data.grade,
        supervisor: data.supervisor || null,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update class");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowEditModal(false);
      setEditingClass(null);
      reset();
      toast.success("Class updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update class");
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete class");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowDeleteModal(false);
      setDeletingClass(null);
      toast.success("Class deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete class");
    },
  });

  // Helper functions
  const getStatusBadge = useCallback((classData) => {
    const capacity = classData.capacity || 0;
    const students = classData.students?.length || 0;

    // Available if not full, Not Available if full or over capacity
    if (students >= capacity) {
      return "bg-red-100 text-red-800"; // Not Available - red
    }
    return "bg-green-100 text-green-800"; // Available - green
  }, []);

  const getStatusText = useCallback((classData) => {
    const capacity = classData.capacity || 0;
    const students = classData.students?.length || 0;

    // Available if not full, Not Available if full or over capacity
    if (students >= capacity) {
      return "Not Available";
    }
    return "Available";
  }, []);

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Class Name",
        sortable: true,
        filterable: true,
      },
      {
        key: "capacity",
        label: "Capacity",
        sortable: true,
        render: (value) => `${value} students`,
      },
      {
        key: "students",
        label: "Enrolled",
        sortable: true,
        render: (value, classData) => {
          const enrolled = value?.length || 0;
          const cap = Number.isFinite(classData.capacity)
            ? classData.capacity
            : 0;
          const pctRaw = cap > 0 ? (enrolled / cap) * 100 : 0;
          const pct = Number.isFinite(pctRaw)
            ? Math.min(100, Math.max(0, pctRaw))
            : 0;
          let barColor = "bg-indigo-500";
          if (pct >= 90) barColor = "bg-red-500";
          else if (pct >= 75) barColor = "bg-yellow-500";
          return (
            <div className="w-32" title={`${Math.round(pct)}% full`}>
              <div className="flex justify-between text-[11px] font-medium mb-0.5">
                <span>{enrolled}</span>
                <span>{cap}</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: "supervisor",
        label: "Supervisor",
        filterable: true,
        render: (value) => {
          if (!value) return "Not assigned";

          // Handle both populated object and ID string
          if (typeof value === "object" && value._id) {
            return `${value.name} ${value.surname || ""}`;
          }

          // Handle ID string case
          const supervisor = teachers.find((t) => t._id === value);
          return supervisor
            ? `${supervisor.name} ${supervisor.surname || ""}`
            : "Not assigned";
        },
      },
      {
        key: "grade",
        label: "Grade",
        filterable: true,
        render: (value) => {
          if (!value) return "Not set";

          // Handle both populated object and ID string
          if (typeof value === "object" && value._id) {
            return value.name || "";
          }

          // Handle ID string case
          const grade = grades.find((g) => g._id === value);
          return grade ? grade.name : "Not set";
        },
      },
      {
        key: "status",
        label: "Status",
        render: (value, classData) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
              classData
            )}`}
          >
            {getStatusText(classData)}
          </span>
        ),
      },
    ],
    [teachers, grades, getStatusBadge, getStatusText]
  );

  // Table actions
  const canAddClass = role === "admin";
  const canEditClass = role === "admin";
  const canDeleteClass = role === "admin";
  const canViewClass = true;

  const actions = [
    ...(canViewClass
      ? [
        {
          label: "View",
          onClick: (classData) => {
            setViewingClass(classData);
            setShowViewModal(true);
          },
          color: "text-blue-600",
          hoverColor: "text-blue-900",
        },
      ]
      : []),
    ...(canEditClass
      ? [
        {
          label: "Edit",
          onClick: (classData) => {
            setEditingClass(classData);
            reset({
              name: classData.name || "",
              capacity: classData.capacity || "",
              grade: classData.grade?._id || classData.grade || "",
              supervisor:
                classData.supervisor?._id || classData.supervisor || "",
            });
            setShowEditModal(true);
          },
          color: "text-indigo-600",
          hoverColor: "text-indigo-900",
        },
      ]
      : []),
    ...(canDeleteClass
      ? [
        {
          label: "Delete",
          onClick: (classData) => {
            setDeletingClass(classData);
            setShowDeleteModal(true);
          },
          color: "text-red-600",
          hoverColor: "text-red-900",
        },
      ]
      : []),
  ];

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Classes Management</h1>
        {canAddClass && (
          <button
            onClick={() => {
              reset();
              setShowAddModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Add New Class
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <EnhancedTable
          title="Class Management"
          data={classes}
          columns={columns}
          actions={actions}
          loading={classesLoading}
          searchable={true}
          sortable={true}
          filterable={true}
          pageSize={8}
        />
      </div>

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Add New Class
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form
              onSubmit={handleSubmit((data) => {
                setIsSubmittingAdd(true);
                addClassMutation.mutate(data, {
                  onSettled: () => setIsSubmittingAdd(false),
                });
              })}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  {...register("name", { required: "Class name is required" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter class name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  {...register("capacity", {
                    required: "Capacity is required",
                    min: { value: 1, message: "Capacity must be at least 1" },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter class capacity"
                />
                {errors.capacity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.capacity.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade *
                </label>
                <select
                  {...register("grade", { required: "Grade is required" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Grade</option>
                  {gradesLoading ? (
                    <option disabled>Loading...</option>
                  ) : (
                    grades.map((grade) => (
                      <option key={grade._id} value={grade._id}>
                        {grade.name}
                      </option>
                    ))
                  )}
                </select>
                {errors.grade && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.grade.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supervisor *
                </label>
                <select
                  {...register("supervisor", {
                    required: "Supervisor is required",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Supervisor</option>
                  {teachersLoading ? (
                    <option disabled>Loading...</option>
                  ) : teachers.length === 0 ? (
                    <option disabled>No teachers available</option>
                  ) : (
                    teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} {teacher.surname || ""}
                      </option>
                    ))
                  )}
                </select>
                {errors.supervisor && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.supervisor.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    reset();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmittingAdd && (
                    <LoadingSpinner size="sm" color="white" />
                  )}
                  <span>{isSubmittingAdd ? "Adding..." : "Add Class"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Class</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClass(null);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form
              onSubmit={handleSubmit((data) => {
                setIsSubmittingEdit(true);
                updateClassMutation.mutate(
                  { id: editingClass._id || editingClass.id, data },
                  {
                    onSettled: () => setIsSubmittingEdit(false),
                  }
                );
              })}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  {...register("name", { required: "Class name is required" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter class name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  {...register("capacity", {
                    required: "Capacity is required",
                    min: { value: 1, message: "Capacity must be at least 1" },
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter class capacity"
                />
                {errors.capacity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.capacity.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade *
                </label>
                <select
                  {...register("grade", { required: "Grade is required" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Grade</option>
                  {gradesLoading ? (
                    <option disabled>Loading...</option>
                  ) : (
                    grades.map((grade) => (
                      <option key={grade._id} value={grade._id}>
                        {grade.name}
                      </option>
                    ))
                  )}
                </select>
                {errors.grade && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.grade.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supervisor *
                </label>
                <select
                  {...register("supervisor", {
                    required: "Supervisor is required",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Supervisor</option>
                  {teachersLoading ? (
                    <option disabled>Loading...</option>
                  ) : teachers.length === 0 ? (
                    <option disabled>No teachers available</option>
                  ) : (
                    teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} {teacher.surname || ""}
                      </option>
                    ))
                  )}
                </select>
                {errors.supervisor && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.supervisor.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClass(null);
                    reset();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmittingEdit && (
                    <LoadingSpinner size="sm" color="white" />
                  )}
                  <span>
                    {isSubmittingEdit ? "Updating..." : "Update Class"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Class Modal */}
      {showViewModal && viewingClass && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Class Details
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingClass(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Class Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {viewingClass.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Capacity
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {viewingClass.capacity} students
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Enrolled Students
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {viewingClass.students?.length || 0} /{" "}
                    {viewingClass.capacity} students
                    {viewingClass.students?.length >= viewingClass.capacity && (
                      <span className="ml-2 text-xs text-red-600 font-medium">
                        (Full)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Supervisor
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(() => {
                      const sup = viewingClass.supervisor;
                      if (!sup) return "Not assigned";
                      if (typeof sup === "object") {
                        const full = `${sup.name || ""} ${sup.surname || ""
                          }`.trim();
                        return full || "Not assigned";
                      }
                      const found = teachers.find((t) => t._id === sup);
                      return found
                        ? `${found.name} ${found.surname || ""}`
                        : "Not assigned";
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Grade
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(() => {
                      const gr = viewingClass.grade;
                      if (!gr) return "Not set";
                      if (typeof gr === "object") {
                        return gr.name || "Not set";
                      }
                      const found = grades.find((g) => g._id === gr);
                      return found ? found.name : "Not set";
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="mt-1 space-y-1">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                        viewingClass
                      )}`}
                    >
                      {getStatusText(viewingClass)}
                    </span>
                    <p className="text-xs text-gray-500">
                      {viewingClass.students?.length || 0} /{" "}
                      {viewingClass.capacity} students enrolled
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingClass(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Modal */}
      {showDeleteModal && deletingClass && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Delete Class</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingClass(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete the class{" "}
                <span className="font-medium text-gray-900">
                  {deletingClass.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingClass(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsDeleting(true);
                    deleteClassMutation.mutate(
                      deletingClass._id || deletingClass.id,
                      {
                        onSettled: () => setIsDeleting(false),
                      }
                    );
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isDeleting && <LoadingSpinner size="sm" color="white" />}
                  <span>{isDeleting ? "Deleting..." : "Delete Class"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
