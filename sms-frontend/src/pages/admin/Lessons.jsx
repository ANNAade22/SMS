import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../hooks/useAuth";
// Removed react-day-picker in favor of chip-based selection

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const { hasPermission, user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Permission check for admin role
  if (role === "admin" && !hasPermission("view_lessons")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
            You don't have permission to access the Lessons Management section.
            <br />
            Only administrators with lesson management permissions can view this
            page.
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
  const [viewingLesson, setViewingLesson] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(null);

  const queryClient = useQueryClient();
  const userRole =
    (typeof window !== "undefined" &&
      authService.getUserRole &&
      authService.getUserRole()) ||
    role;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      day: "",
      days: [],
      startTime: "",
      endTime: "",
      subject: "",
      classId: "",
      teacher: "",
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: "",
    },
  });

  // Form watches for day selection
  const selectedDayName = watch("day");
  const selectedDays = watch("days") || [];

  // Helper: format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid time";
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "N/A";
    }
  };

  // Helper: day badge renderer
  const dayBadge = (day) => {
    const colors = {
      Monday: "bg-indigo-100 text-indigo-800",
      Tuesday: "bg-emerald-100 text-emerald-800",
      Wednesday: "bg-amber-100 text-amber-800",
      Thursday: "bg-sky-100 text-sky-800",
      Friday: "bg-fuchsia-100 text-fuchsia-800",
      Saturday: "bg-gray-200 text-gray-800",
      Sunday: "bg-gray-300 text-gray-900",
    };
    const cls = colors[day] || "bg-gray-100 text-gray-800";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
      >
        {day ? day.slice(0, 3) : "N/A"}
      </span>
    );
  };

  // Fetch lessons
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/lessons`);
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const json = await res.json();
      return Array.isArray(json?.data?.data) ? json.data.data : [];
    },
  });

  // Fetch subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects?limit=1000`
      );
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const json = await res.json();
      return Array.isArray(json?.data?.data) ? json.data.data : [];
    },
  });

  // Fetch classes
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes?limit=1000`
      );
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await res.json();
      return Array.isArray(json?.data?.data) ? json.data.data : [];
    },
  });

  // Fetch teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      // Fetch ALL teachers by setting a high limit
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers?limit=1000`
      );
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const json = await res.json();
      // Handle the nested data structure: { data: { data: teachers } }
      if (json?.data?.data && Array.isArray(json.data.data)) {
        return json.data.data;
      }
      // Fallback for different response structures
      if (Array.isArray(json?.data)) {
        return json.data;
      }
      if (Array.isArray(json)) {
        return json;
      }
      return [];
    },
  });

  // Safeguard lists for use throughout the component
  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const classesList = Array.isArray(classes) ? classes : [];
  const teachersList = Array.isArray(teachers) ? teachers : [];

  // Mutations
  const createLessonGroupMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        name: data.name,
        days:
          Array.isArray(data.days) && data.days.length
            ? data.days
            : data.day
            ? [data.day]
            : [],
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        subject: data.subject,
        classId: data.classId,
        teacher: data.teacher,
        validFrom: data.validFrom
          ? new Date(data.validFrom).toISOString()
          : undefined,
        validTo: data.validTo
          ? new Date(data.validTo).toISOString()
          : undefined,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Failed to create lessons group");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "student-lessons"],
      });
      setShowAddModal(false);
      reset();
      toast.success("Lessons created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add lessons");
    },
  });
  // Deprecated single create mutation removed; using group endpoint instead

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
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "student-lessons"],
      });
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
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete lesson");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "student-lessons"],
      });
      setShowDeleteModal(false);
      setDeletingLesson(null);
      toast.success("Lesson deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete lesson");
    },
  });

  const deleteLessonGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons/groups/${groupId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Failed to delete lesson group");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "student-lessons"],
      });
      toast.success("Lesson group deleted");
    },
    onError: (error) => toast.error(error.message || "Failed to delete group"),
  });

  const updateLessonGroupValidityMutation = useMutation({
    mutationFn: async ({ groupId, validTo, validFrom }) => {
      const body = {};
      if (validTo) body.validTo = new Date(validTo).toISOString();
      if (validFrom) body.validFrom = new Date(validFrom).toISOString();
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons/groups/${groupId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Failed to update lesson group");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "student-lessons"],
      });
      toast.success("Lesson group updated");
    },
    onError: (error) =>
      toast.error(error.message || "Failed to update group validity"),
  });

  // Table columns
  const columns = [
    { key: "name", label: "Lesson Name", sortable: true, filterable: true },
    {
      key: "day",
      label: "Day",
      sortable: true,
      filterable: true,
      render: (value) => dayBadge(value),
    },
    {
      key: "groupId",
      label: "Group",
      sortable: false,
      filterable: true,
      render: (v) => (v ? String(v).slice(0, 8) : "—"),
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
        if (typeof value === "object" && value._id) return value.name;
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
        if (typeof value === "object" && value._id) return value.name;
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
        if (typeof value === "object" && value._id)
          return `${value.name} ${value.surname || ""}`;
        const teacher = teachersList.find((t) => t._id === value);
        return teacher
          ? `${teacher.name} ${teacher.surname || ""}`
          : "Not assigned";
      },
    },
  ];

  // Table actions
  const privilegedRoles = ["admin", "super_admin", "school_admin"];
  const canAddLesson = privilegedRoles.includes(userRole);
  const canEditLesson = privilegedRoles.includes(userRole);
  const canDeleteLesson = privilegedRoles.includes(userRole);
  const canViewLesson = true;

  const actions = (row) => [
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
    ...(row?.groupId
      ? [
          {
            label: "Delete Group",
            onClick: (lessonData) => {
              setDeletingGroup({ groupId: lessonData.groupId });
              setShowDeleteGroupModal(true);
            },
            color: "text-red-500",
            hoverColor: "text-red-700",
          },
          {
            label: "End Group Early",
            onClick: async (lessonData) => {
              const current = new Date();
              const yyyy = current.getFullYear();
              const mm = String(current.getMonth() + 1).padStart(2, "0");
              const dd = String(current.getDate()).padStart(2, "0");
              const defaultDate = `${yyyy}-${mm}-${dd}`;
              const input = window.prompt(
                `Set new Valid To date for group ${String(
                  lessonData.groupId
                ).slice(0, 8)} (YYYY-MM-DD)`,
                defaultDate
              );
              if (!input) return;
              const picked = new Date(input);
              if (Number.isNaN(picked.getTime())) {
                toast.error("Invalid date format. Use YYYY-MM-DD.");
                return;
              }
              // Optional: ensure picked date is not before validFrom if known on this row
              if (lessonData.validFrom) {
                const vf = new Date(lessonData.validFrom);
                if (picked < vf) {
                  toast.error("Valid To cannot be before Valid From.");
                  return;
                }
              }
              updateLessonGroupValidityMutation.mutate({
                groupId: lessonData.groupId,
                validTo: input,
              });
            },
            color: "text-amber-600",
            hoverColor: "text-amber-800",
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

  const onSubmitAdd = async (data) => {
    // Pre-submit validation to prevent server cast errors
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error("Invalid start or end time");
      return;
    }
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }

    const hasSubject = subjectsList.some((s) => s._id === data.subject);
    const hasClass = classesList.some((c) => c._id === data.classId);
    const hasTeacher = teachersList.some((t) => t._id === data.teacher);
    if (!hasSubject || !hasClass || !hasTeacher) {
      toast.error(
        "Please select valid Subject, Class, and Teacher from the lists"
      );
      return;
    }

    // Determine selected days (multi supported)
    const daysToCreate =
      Array.isArray(selectedDays) && selectedDays.length
        ? selectedDays
        : data.day
        ? [data.day]
        : [];
    if (daysToCreate.length === 0) {
      toast.error("Please select at least one day");
      return;
    }

    // Validate validity window if provided
    if (data.validFrom && data.validTo) {
      const vf = new Date(data.validFrom);
      const vt = new Date(data.validTo);
      if (vt < vf) {
        toast.error("Valid To must be after Valid From");
        return;
      }
    }

    try {
      setIsSubmittingAdd(true);
      await createLessonGroupMutation.mutateAsync({
        ...data,
        days: daysToCreate,
      });
    } catch (e) {
      toast.error(e.message || "Failed to add one or more lessons");
    } finally {
      setIsSubmittingAdd(false);
    }
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lessons</h1>
        {canAddLesson && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              disabled={
                subjectsLoading ||
                classesLoading ||
                teachersLoading ||
                subjectsList.length === 0 ||
                classesList.length === 0 ||
                teachersList.length === 0
              }
              title={
                subjectsList.length === 0 ||
                classesList.length === 0 ||
                teachersList.length === 0
                  ? "Load subjects, classes, and teachers before adding a lesson"
                  : undefined
              }
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Add Lesson
            </button>
            {(subjectsList.length === 0 ||
              classesList.length === 0 ||
              teachersList.length === 0) && (
              <span className="text-xs text-gray-500">
                Load subjects, classes, and teachers first
              </span>
            )}
          </div>
        )}
      </div>

      <EnhancedTable
        data={lessons}
        columns={columns}
        actions={actions}
        searchable={true}
        paginated={true}
        pageSize={10}
        searchPlaceholder="Search lessons..."
      />

      {/* Add Lesson Modal */}
      {showAddModal && (
        <Modal
          title="Add Lesson"
          size="md"
          onClose={() => {
            setShowAddModal(false);
            reset();
          }}
          footer={
            <>
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
                form="addLessonForm"
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
            </>
          }
        >
          {(subjectsList.length === 0 ||
            classesList.length === 0 ||
            teachersList.length === 0) && (
            <div className="p-3 rounded bg-yellow-50 text-yellow-800 text-sm mb-4">
              Subject/Class/Teacher lists are empty. Ensure you are logged in
              and data is loaded.
            </div>
          )}
          <form id="addLessonForm" onSubmit={handleSubmit(onSubmitAdd)}>
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
                Day(s)
              </label>
              <div className="mt-2 bg-white rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((d) => {
                    const active = selectedDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => {
                          const next = active
                            ? selectedDays.filter((x) => x !== d)
                            : [...selectedDays, d];
                          setValue("days", next, { shouldValidate: true });
                          setValue("day", next[0] || "", {
                            shouldValidate: true,
                          });
                        }}
                        className={`px-3 py-1 text-xs rounded-full border transition ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const all = [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ];
                      setValue("days", all, { shouldValidate: true });
                      setValue("day", all[0], { shouldValidate: true });
                    }}
                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("days", [], { shouldValidate: true });
                      setValue("day", "", { shouldValidate: true });
                    }}
                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                  >
                    None
                  </button>
                </div>
                {/* Hidden inputs for RHF */}
                <input
                  type="hidden"
                  {...register("day", { required: "Select at least one day" })}
                />
                <input type="hidden" {...register("days")} />
                {errors.day && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.day.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valid From
                </label>
                <input
                  {...register("validFrom")}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valid To (optional)
                </label>
                <input
                  {...register("validTo")}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
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
                {subjectsList.map((subject) => (
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
                {classesList.map((classItem) => (
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
          </form>
        </Modal>
      )}

      {/* Edit Lesson Modal */}
      {showEditModal && editingLesson && (
        <Modal
          title="Edit Lesson"
          size="md"
          onClose={() => {
            setShowEditModal(false);
            setEditingLesson(null);
            reset();
          }}
          footer={
            <>
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
                form="editLessonForm"
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
            </>
          }
        >
          <form
            id="editLessonForm"
            onSubmit={handleSubmit(onSubmitEdit)}
            className="space-y-4"
          >
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
              <div className="mt-2 bg-white rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() =>
                        setValue("day", d, { shouldValidate: true })
                      }
                      className={`px-3 py-1 text-xs rounded-full border transition ${
                        selectedDayName === d
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <input
                  type="hidden"
                  {...register("day", { required: "Day is required" })}
                />
                {errors.day && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.day.message}
                  </p>
                )}
              </div>
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
                {subjectsList.map((subject) => (
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
                {classesList.map((classItem) => (
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
          </form>
        </Modal>
      )}

      {/* View Lesson Modal */}
      {showViewModal && viewingLesson && (
        <Modal
          title="Lesson Details"
          size="md"
          onClose={() => {
            setShowViewModal(false);
            setViewingLesson(null);
          }}
          footer={
            <button
              onClick={() => {
                setShowViewModal(false);
                setViewingLesson(null);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Close
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lesson Name
              </label>
              <p className="mt-1 text-sm text-gray-900">{viewingLesson.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Day
              </label>
              <div className="mt-1">{dayBadge(viewingLesson.day)}</div>
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
                {viewingLesson.subject?.name || "Not set"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Class
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {viewingLesson.classId?.name || "Not assigned"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Teacher
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {(() => {
                  if (!viewingLesson.teacher) return "Not assigned";
                  if (
                    typeof viewingLesson.teacher === "object" &&
                    viewingLesson.teacher._id
                  ) {
                    return `${viewingLesson.teacher.name} ${
                      viewingLesson.teacher.surname || ""
                    }`;
                  }
                  const teacher = teachersList.find(
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
        </Modal>
      )}

      {/* Delete Lesson Modal */}
      {showDeleteModal && deletingLesson && (
        <Modal
          title="Delete Lesson"
          size="sm"
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingLesson(null);
          }}
          footer={
            <>
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
            </>
          }
        >
          <div className="mb-2">
            <p className="text-gray-700">
              Are you sure you want to delete the lesson &quot;
              {deletingLesson.name}&quot;? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* Delete Lesson Group Modal */}
      {showDeleteGroupModal && deletingGroup && (
        <Modal
          title="Delete Lesson Group"
          size="sm"
          onClose={() => {
            setShowDeleteGroupModal(false);
            setDeletingGroup(null);
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setShowDeleteGroupModal(false);
                  setDeletingGroup(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteLessonGroupMutation.mutate(deletingGroup.groupId, {
                    onSuccess: () => {
                      setShowDeleteGroupModal(false);
                      setDeletingGroup(null);
                    },
                  })
                }
                disabled={deleteLessonGroupMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLessonGroupMutation.isPending ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Deleting...</span>
                  </div>
                ) : (
                  "Delete Group"
                )}
              </button>
            </>
          }
        >
          {(() => {
            const groupId = deletingGroup.groupId;
            const shortId = String(groupId).slice(0, 8);
            const groupLessons = (Array.isArray(lessons) ? lessons : []).filter(
              (l) => l.groupId === groupId
            );
            const count = groupLessons.length;
            const days = Array.from(new Set(groupLessons.map((l) => l.day)));
            return (
              <div className="space-y-3">
                <p className="text-gray-700">
                  This will permanently delete all {count} lesson
                  {count === 1 ? "" : "s"} in group{" "}
                  <span className="font-mono">{shortId}</span>.
                </p>
                {days.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Affected days:</p>
                    <div className="flex flex-wrap gap-2">
                      {days.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                        >
                          {d.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm text-red-600">
                  This action cannot be undone.
                </p>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};

export default Lessons;
