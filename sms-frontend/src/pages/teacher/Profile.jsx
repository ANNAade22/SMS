import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";

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

import { Link } from "react-router-dom";

const Profile = () => {
  // Fetch teacher profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["teacherProfile"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/me`
      );
      if (!res.ok) throw new Error("Failed to fetch teacher profile");
      const json = await res.json();
      return json.data?.data;
    },
  });

  // Fetch all classes and filter those supervised by this teacher
  const { data: supervisedClasses = [] } = useQuery({
    queryKey: ["teacherProfile", "supervised-classes", profile?._id],
    enabled: !!profile?._id,
    queryFn: async () => {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await res.json();
      const all = json.data?.data || [];
      return all.filter((c) => c?.supervisor?._id === profile._id);
    },
  });

  // Combine classes from profile.classes and supervised classes (unique by _id)
  const combinedClasses = useMemo(() => {
    const listA = Array.isArray(profile?.classes) ? profile.classes : [];
    const map = new Map();
    listA.forEach((c) => {
      if (c?._id) map.set(String(c._id), c);
    });
    supervisedClasses.forEach((c) => {
      if (c?._id && !map.has(String(c._id))) map.set(String(c._id), c);
    });
    return Array.from(map.values());
  }, [profile?.classes, supervisedClasses]);

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">
          View your teacher profile information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
              {profile.name?.charAt(0)}
              {profile.surname?.charAt(0)}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {profile.name} {profile.surname}
            </h2>
            <p className="text-gray-600">{profile.email}</p>
            <p className="text-sm text-gray-500 mt-2">Teacher</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contact Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.phone || "Not provided"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile.address}</p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Personal Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Blood Type
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile.bloodType}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile.sex}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Birthday
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.birthday
                  ? new Date(profile.birthday).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Employment Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Salary
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {typeof profile.salary === "number"
                  ? profile.salary.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    })
                  : "Not provided"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hire Date
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.hireDate
                  ? new Date(profile.hireDate).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Qualification
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.qualification || "Not provided"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects and Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            My Subjects
          </h3>
          <div className="space-y-2">
            {profile.subjects && profile.subjects.length > 0 ? (
              profile.subjects.map((subject, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-900">{subject.name}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/teacher/lessons?subject=${subject._id}`}
                      className="text-xs text-green-700 hover:underline"
                      title="View lessons for this subject"
                    >
                      Lessons
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link
                      to={`/teacher/assignments?subject=${subject._id}`}
                      className="text-xs text-blue-700 hover:underline"
                      title="View assignments for this subject"
                    >
                      Assignments
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No subjects assigned</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            My Classes
          </h3>
          <div className="space-y-2">
            {combinedClasses && combinedClasses.length > 0 ? (
              combinedClasses.map((classData, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-900">
                    {classData.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/teacher/lessons?class=${classData._id}`}
                      className="text-xs text-green-700 hover:underline"
                      title="View lessons for this class"
                    >
                      Lessons
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link
                      to={`/teacher/assignments?class=${classData._id}`}
                      className="text-xs text-blue-700 hover:underline"
                      title="View assignments for this class"
                    >
                      Assignments
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No classes assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
