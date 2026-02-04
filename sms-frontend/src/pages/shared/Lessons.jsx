import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import EnhancedTable from "../../components/EnhancedTable";
import SkeletonLoader from "../../components/SkeletonLoader";

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

const Lessons = ({ role = "admin" }) => {
  const [searchParams] = useSearchParams();
  const subjectParam = searchParams.get("subject");
  const classParam = searchParams.get("class");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [viewingLesson, setViewingLesson] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  // Fetch lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons", role],
    queryFn: async () => {
      const endpoint = role === "teacher" ? "/my-lessons" : "";
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons${endpoint}`
      );
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const json = await res.json();
      return json.data.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      day: "",
      startTime: "",
      endTime: "",
      subject: "",
      classId: "",
      teacher: "",
    },
  });

  // Helper functions
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      // Ensure we get a valid date
      if (isNaN(date.getTime())) return "Invalid time";

      // Format in local timezone
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Time formatting error:", error);
      return "N/A";
    }
  };

  // Fetch subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      try {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/subjects`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch subjects");
        }
        const json = await res.json();
        return json.data.data || [];
      } catch (error) {
        console.error("Subjects fetch error:", error);
        return [
          { _id: "fallback-subject1", name: "Mathematics" },
          { _id: "fallback-subject2", name: "English" },
          { _id: "fallback-subject3", name: "Science" },
        ];
      }
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
    queryKey: ["teachers", "lessons-page"],
    queryFn: async () => {
      console.log("=== TEACHERS QUERY STARTED ===");
      try {
        console.log(
          "Making API call to:",
          `${API_BASE_URL}/api/v1/teachers?limit=1000`
        );
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/teachers?limit=1000`
        );
        console.log("API response status:", res.status);
        console.log("API response ok:", res.ok);
        if (!res.ok) {
          throw new Error("Failed to fetch teachers");
        }
        const json = await res.json();
        console.log("Teachers API response in Lessons:", json);
        const teachersData = Array.isArray(json?.data?.data)
          ? json.data.data
          : [];
        console.log(
          "Processed teachers for Lessons:",
          teachersData.length,
          "teachers found"
        );
        console.log(
          "Teachers data details:",
          teachersData.map((t) => ({
            id: t._id,
            name: t.name,
            surname: t.surname,
          }))
        );
        console.log("=== TEACHERS QUERY COMPLETED ===");
        return teachersData;
      } catch (error) {
        console.error("=== TEACHERS QUERY ERROR ===");
        console.error("Teachers fetch error:", error);
        console.error("Error details:", error.message);
        console.error("=== END ERROR ===");
        // Return empty array instead of fallback data
        return [];
      }
    },
    staleTime: 0, // Force fresh data
    refetchOnMount: true,
  });

  // Safe lists for selects/lookups
  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const classesList = Array.isArray(classes) ? classes : [];
  const teachersList = Array.isArray(teachers) ? teachers : [];

  // Debug: Log the teachers data
  console.log("=== LESSONS PAGE DEBUG ===");
  console.log("Lessons page - teachers data:", teachers);
  console.log("Lessons page - teachersList:", teachersList);
  console.log("Lessons page - teachersLoading:", teachersLoading);
  console.log("Lessons page - teachers length:", teachers?.length || 0);
  console.log("Lessons page - teachers type:", typeof teachers);
  console.log("Lessons page - teachers is array:", Array.isArray(teachers));
  if (teachers && teachers.length > 0) {
    console.log("First teacher:", teachers[0]);
  }
  console.log("=== END DEBUG ===");

  // Force refresh teachers data every 30 seconds to catch new additions
  React.useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["teachers", "lessons-page"] });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Manual refresh function for debugging
  const refreshTeachers = () => {
    console.log("Manually refreshing teachers...");
    queryClient.invalidateQueries({ queryKey: ["teachers", "lessons-page"] });
    queryClient.refetchQueries({ queryKey: ["teachers", "lessons-page"] });
  };

  // Mutations
  const addLessonMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        subject: data.subject,
        classId: data.classId,
        teacher: data.teacher,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create lesson");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      setShowAddModal(false);
      reset();
      toast.success("Lesson added successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add lesson");
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        subject: data.subject,
        classId: data.classId,
        teacher: data.teacher,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update lesson");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      setShowEditModal(false);
      setEditingLesson(null);
      reset();
      toast.success("Lesson updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lesson");
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete lesson");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      setShowDeleteModal(false);
      setDeletingLesson(null);
      toast.success("Lesson deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete lesson");
    },
  });

  // Table columns
  const columns = [
    {
      key: "name",
      label: "Lesson Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "day",
      label: "Day",
      sortable: true,
      filterable: true,
    },
    {
      key: "startTime",
      label: "Start Time",
      sortable: true,
      render: (value) => formatTime(value),
    },
    {
      key: "endTime",
      label: "End Time",
      sortable: true,
      render: (value) => formatTime(value),
    },
    {
      key: "subject",
      label: "Subject",
      filterable: true,
      render: (value) => {
        if (!value) return "Not set";

        // Handle both populated object and ID string
        if (typeof value === "object" && value._id) {
          return value.name;
        }

        // Handle ID string case
        const subject = subjectsList.find((s) => s._id === value);
        return subject ? subject.name : "Not set";
      },
    },
    {
      key: "classId",
      label: "Class",
      filterable: true,
      render: (value) => {
        if (!value) return "Not assigned";

        // Handle both populated object and ID string
        if (typeof value === "object" && value._id) {
          return value.name;
        }

        // Handle ID string case
        const classItem = classesList.find((c) => c._id === value);
        return classItem ? classItem.name : "Not assigned";
      },
    },
    {
      key: "teacher",
      label: "Teacher",
      filterable: true,
      render: (value) => {
        if (!value) return "Not assigned";

        // Handle both populated object and ID string
        if (typeof value === "object" && value._id) {
          return `${value.name} ${value.surname || ""}`;
        }

        // Handle ID string case
        const teacher = teachersList.find((t) => t._id === value);
        return teacher
          ? `${teacher.name} ${teacher.surname || ""}`
          : "Not assigned";
      },
    },
  ];

  // Table actions
  const canAddLesson = role === "admin";
  const canEditLesson = role === "admin";
  const canDeleteLesson = role === "admin";
  const canViewLesson = true;

  const actions = [
    ...(canViewLesson
      ? [
          {
            label: "View",
            onClick: (lessonData) => {
              setViewingLesson(lessonData);
              setShowViewModal(true);
            },
            color: "text-blue-600",
            hoverColor: "text-blue-900",
          },
        ]
      : []),
    ...(canEditLesson
      ? [
          {
            label: "Edit",
            onClick: (lessonData) => {
              setEditingLesson(lessonData);
              reset({
                name: lessonData.name || "",
                day: lessonData.day || "",
                startTime: lessonData.startTime
                  ? new Date(lessonData.startTime).toISOString().slice(0, 16)
                  : "",
                endTime: lessonData.endTime
                  ? new Date(lessonData.endTime).toISOString().slice(0, 16)
                  : "",
                subject: lessonData.subject?._id || lessonData.subject || "",
                classId: lessonData.classId?._id || lessonData.classId || "",
                teacher: lessonData.teacher?._id || lessonData.teacher || "",
              });
              setShowEditModal(true);
            },
            color: "text-indigo-600",
            hoverColor: "text-indigo-900",
          },
        ]
      : []),
    ...(canDeleteLesson
      ? [
          {
            label: "Delete",
            onClick: (lessonData) => {
              setDeletingLesson(lessonData);
              setShowDeleteModal(true);
            },
            color: "text-red-600",
            hoverColor: "text-red-900",
          },
        ]
      : []),
  ];

  const onSubmitAdd = (data) => {
    setIsSubmittingAdd(true);
    addLessonMutation.mutate(data, {
      onSettled: () => setIsSubmittingAdd(false),
    });
  };

  const onSubmitEdit = (data) => {
    setIsSubmittingEdit(true);
    updateLessonMutation.mutate(
      { id: editingLesson._id, data },
      {
        onSettled: () => setIsSubmittingEdit(false),
      }
    );
  };

  const handleDelete = () => {
    setIsDeleting(true);
    deleteLessonMutation.mutate(deletingLesson._id, {
      onSettled: () => setIsDeleting(false),
    });
  };

  if (lessonsLoading || subjectsLoading || classesLoading || teachersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Apply optional URL-based filtering (e.g., from teacher Profile quick links)
  const filteredLessons = Array.isArray(lessons)
    ? lessons.filter((l) => {
        let ok = true;
        if (subjectParam) {
          const subj = l.subject;
          const subjId =
            typeof subj === "object" && subj?._id ? subj._id : subj;
          ok = ok && subjId === subjectParam;
        }
        if (classParam) {
          const cls = l.classId;
          const clsId = typeof cls === "object" && cls?._id ? cls._id : cls;
          ok = ok && clsId === classParam;
        }
        return ok;
      })
    : lessons;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lessons</h1>
        <div className="flex gap-2">
          <button
            onClick={refreshTeachers}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Refresh Teachers ({teachers?.length || 0})
          </button>
          {canAddLesson && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Lesson
            </button>
          )}
        </div>
      </div>

      {/* Debug display */}
      <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Teachers Loading: {teachersLoading ? "Yes" : "No"}</p>
        <p>Teachers Count: {teachers?.length || 0}</p>
        <p>Teachers List Count: {teachersList?.length || 0}</p>
        <p>Teachers Type: {typeof teachers}</p>
        <p>Is Array: {Array.isArray(teachers) ? "Yes" : "No"}</p>
        {teachers && teachers.length > 0 && (
          <div>
            <p>
              First Teacher: {teachers[0].name} {teachers[0].surname}
            </p>
            <p>
              All Teachers:{" "}
              {teachers.map((t) => `${t.name} ${t.surname}`).join(", ")}
            </p>
          </div>
        )}
      </div>

      {lessonsLoading ? (
        <SkeletonLoader variant="table" className="p-4" />
      ) : (
        <EnhancedTable
          data={filteredLessons}
          columns={columns}
          actions={actions}
          searchable={true}
          searchPlaceholder="Search lessons..."
          pageSize={15}
          emptyMessage="No lessons found"
        />
      )}

      {/* Add Lesson Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Lesson</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lesson Name
                </label>
                <input
                  {...register("name", { required: "Lesson name is required" })}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter lesson name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Day
                </label>
                <select
                  {...register("day", { required: "Day is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                {errors.day && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.day.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  {...register("startTime", {
                    required: "Start time is required",
                  })}
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  {...register("endTime", { required: "End time is required" })}
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.endTime.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <select
                  {...register("subject", { required: "Subject is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Class
                </label>
                <select
                  {...register("classId", { required: "Class is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select class</option>
                  {classes.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
                {errors.classId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.classId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teacher
                </label>
                <select
                  {...register("teacher", { required: "Teacher is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select teacher</option>
                  {teachersList.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} {teacher.surname}
                    </option>
                  ))}
                </select>
                {errors.teacher && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.teacher.message}
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
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingAdd ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Adding...</span>
                    </div>
                  ) : (
                    "Add Lesson"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {showEditModal && editingLesson && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Lesson</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLesson(null);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lesson Name
                </label>
                <input
                  {...register("name", { required: "Lesson name is required" })}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter lesson name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Day
                </label>
                <select
                  {...register("day", { required: "Day is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                {errors.day && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.day.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  {...register("startTime", {
                    required: "Start time is required",
                  })}
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  {...register("endTime", { required: "End time is required" })}
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.endTime.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <select
                  {...register("subject", { required: "Subject is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Class
                </label>
                <select
                  {...register("classId", { required: "Class is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select class</option>
                  {classes.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
                {errors.classId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.classId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teacher
                </label>
                <select
                  {...register("teacher", { required: "Teacher is required" })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select teacher</option>
                  {teachersList.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} {teacher.surname}
                    </option>
                  ))}
                </select>
                {errors.teacher && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.teacher.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLesson(null);
                    reset();
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Updating...</span>
                    </div>
                  ) : (
                    "Update Lesson"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Lesson Modal */}
      {showViewModal && viewingLesson && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Lesson Details
              </h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingLesson(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lesson Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingLesson.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Day
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingLesson.day}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatTime(viewingLesson.startTime)} -{" "}
                  {formatTime(viewingLesson.endTime)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingLesson.subject?.name ||
                    subjects.find((s) => s._id === viewingLesson.subject)
                      ?.name ||
                    "Not set"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Class
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingLesson.classId?.name ||
                    classes.find((c) => c._id === viewingLesson.classId)
                      ?.name ||
                    "Not assigned"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teacher
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {(() => {
                    if (!viewingLesson.teacher) return "Not assigned";

                    // Handle both populated object and ID string
                    if (
                      typeof viewingLesson.teacher === "object" &&
                      viewingLesson.teacher._id
                    ) {
                      return `${viewingLesson.teacher.name} ${
                        viewingLesson.teacher.surname || ""
                      }`;
                    }

                    // Handle ID string case
                    const teacher = teachers.find(
                      (t) => t._id === viewingLesson.teacher
                    );
                    return teacher
                      ? `${teacher.name} ${teacher.surname || ""}`
                      : "Not assigned";
                  })()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assignments
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingLesson.assignments?.length || 0} assignments
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Exams
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingLesson.exams?.length || 0} exams
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingLesson(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lesson Modal */}
      {showDeleteModal && deletingLesson && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Delete Lesson
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingLesson(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the lesson &quot;
                {deletingLesson.name}&quot;? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingLesson(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Deleting...</span>
                  </div>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lessons;
