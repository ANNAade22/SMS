import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import EnhancedTable from "../../components/EnhancedTable";

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

const Classes = () => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingClass, setViewingClass] = useState(null);

  // Fetch current teacher profile
  const { data: teacherProfile, isLoading: teacherLoading } = useQuery({
    queryKey: ["teacherProfile"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/me`
      );
      if (!res.ok) throw new Error("Failed to fetch teacher profile");
      const json = await res.json();
      return json.data.data;
    },
  });

  // Fetch classes supervised by this teacher
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["teacherClasses", teacherProfile?._id],
    queryFn: async () => {
      if (!teacherProfile?._id) return [];
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await res.json();
      const allClasses = json.data.data || [];
      // Filter to only show classes supervised by this teacher
      return allClasses.filter(
        (cls) => cls.supervisor?._id === teacherProfile._id
      );
    },
    enabled: !!teacherProfile?._id,
  });

  // Helper functions
  const getStatusBadge = (classData) => {
    const capacity = classData.capacity || 0;
    const students = classData.students?.length || 0;

    if (students >= capacity) {
      return "bg-red-100 text-red-800"; // Not Available - red
    }
    return "bg-green-100 text-green-800"; // Available - green
  };

  const getStatusText = (classData) => {
    const capacity = classData.capacity || 0;
    const students = classData.students?.length || 0;

    if (students >= capacity) {
      return "Not Available";
    }
    return "Available";
  };

  // Table columns
  const columns = [
    {
      key: "name",
      label: "Class Name",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: "capacity",
      label: "Capacity",
      sortable: true,
    },
    {
      key: "grade",
      label: "Grade",
      sortable: true,
      render: (value) => value?.name || "N/A",
    },
    {
      key: "students",
      label: "Students",
      render: (value) => (Array.isArray(value) ? value.length : 0),
    },
    {
      key: "status",
      label: "Status",
      render: (value, row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
            row
          )}`}
        >
          {getStatusText(row)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (value, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setViewingClass(row);
              setShowViewModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  if (teacherLoading || classesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-600">
          View and manage the classes you supervise
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <EnhancedTable
            data={classes}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search classes..."
            sortable={true}
            pagination={true}
            itemsPerPage={10}
          />
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && viewingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Class Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingClass(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
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
                  {viewingClass.capacity}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grade
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingClass.grade?.name || "N/A"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Students
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {Array.isArray(viewingClass.students)
                    ? viewingClass.students.length
                    : 0}{" "}
                  enrolled
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                    viewingClass
                  )}`}
                >
                  {getStatusText(viewingClass)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingClass(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
