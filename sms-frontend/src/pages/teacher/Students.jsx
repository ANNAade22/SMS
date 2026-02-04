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

const Students = () => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

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

  // Fetch students from teacher's classes
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["teacherStudents", teacherProfile?._id],
    queryFn: async () => {
      if (!teacherProfile?._id) return [];
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/my-students`
      );
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      return json.data.data || [];
    },
    enabled: !!teacherProfile?._id,
  });

  // Table columns
  const columns = [
    {
      key: "name",
      label: "Student Name",
      sortable: true,
      render: (value, row) => (
        <span className="font-medium">{`${row.name} ${row.surname}`}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
    },
    {
      key: "class",
      label: "Class",
      sortable: true,
      render: (value) => {
        const classData = classes.find((c) => c._id === value);
        return classData ? classData.name : "N/A";
      },
    },
    {
      key: "grade",
      label: "Grade",
      sortable: true,
      render: (value) => {
        const gradeData = value;
        return gradeData?.name || "N/A";
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (value, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setViewingStudent(row);
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

  if (teacherLoading || classesLoading || studentsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
        <p className="text-gray-600">View students in your classes</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <EnhancedTable
            data={students}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search students..."
            sortable={true}
            pagination={true}
            itemsPerPage={10}
          />
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Student Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <p className="mt-1 text-sm text-gray-900">{`${viewingStudent.name} ${viewingStudent.surname}`}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingStudent.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingStudent.phone}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Class
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {classes.find((c) => c._id === viewingStudent.class)?.name ||
                    "N/A"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grade
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingStudent.grade?.name || "N/A"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingStudent.address}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Blood Type
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingStudent.bloodType}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingStudent(null);
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

export default Students;
