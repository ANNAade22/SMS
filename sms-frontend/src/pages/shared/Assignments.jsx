import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assignmentFormSchema } from "../../utils/formSchemas";
import EnhancedTable from "../../components/EnhancedTable";
import { toast } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";

const LoadingSpinner = ({ size = "sm", color = "blue" }) => {
  const sizeClasses = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
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

const Assignments = ({ role = "admin" }) => {
  const roleTitles = {
    admin: t("assignments.adminTitle") || "Admin - Assignments Management",
    teacher: t("assignments.teacherTitle") || "Teacher - Assignments",
    student: t("assignments.studentTitle") || "Student - My Assignments",
    parent: t("assignments.parentTitle") || "Parent - Assignments",
  };
  const roleDescriptions = {
    admin:
      t("assignments.adminDescription") ||
      "Manage all assignments in the school system",
    teacher:
      t("assignments.teacherDescription") ||
      "Create and manage assignments for your classes",
    student:
      t("assignments.studentDescription") || "View and submit your assignments",
    parent:
      t("assignments.parentDescription") ||
      "View your children's assignments status",
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  const queryClient = useQueryClient();

  // Fetch assignments based on role
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", role],
    queryFn: async () => {
      let url = `${API_BASE_URL}/api/v1/assignments`;
      if (role === "teacher") {
        url = `${API_BASE_URL}/api/v1/assignments/my-assignments`;
      } else if (role === "student") {
        url = `${API_BASE_URL}/api/v1/assignments/student/my-assignments`;
      }
      const res = await authService.authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const json = await res.json();
      return json.data.data || [];
    },
  });

  // Fetch subjects for dropdown (admin gets all; teacher uses profile)
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects`
      );
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const json = await res.json();
      return json.data.data || [];
    },
    enabled: role !== "teacher",
  });

  // Fetch classes for dropdown (admin gets all; teacher uses profile)
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await res.json();
      return json.data.data || [];
    },
    enabled: role !== "teacher",
  });

  // Teacher profile (to derive restricted subjects/classes)
  const { data: teacherProfile = null, isLoading: teacherProfileLoading } =
    useQuery({
      queryKey: ["teacherProfile"],
      queryFn: async () => {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/teachers/me`
        );
        if (!res.ok) throw new Error("Failed to fetch teacher profile");
        const json = await res.json();
        return json.data.data || null;
      },
      enabled: role === "teacher",
    });

  const subjectsOptions =
    role === "teacher" ? teacherProfile?.subjects || [] : subjects;
  const classesOptions =
    role === "teacher" ? teacherProfile?.classes || [] : classes;
  const subjectsLoadingEffective =
    role === "teacher" ? teacherProfileLoading : subjectsLoading;
  const classesLoadingEffective =
    role === "teacher" ? teacherProfileLoading : classesLoading;

  // Fetch teachers for dropdown (admin only)
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers?limit=1000`
      );
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const json = await res.json();
      const teachersData = Array.isArray(json?.data?.data)
        ? json.data.data
        : [];
      return teachersData;
    },
    enabled: role === "admin", // Only fetch for admin
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: "",
      classId: "",
      dueDate: "",
      totalPoints: 100,
      status: "Draft",
    },
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        title: data.title,
        description: data.description,
        subject: data.subject,
        classId: data.classId,
        dueDate: new Date(data.dueDate).toISOString(),
        startDate: new Date().toISOString(),
        totalPoints: data.totalPoints ? parseInt(data.totalPoints) : 100,
        status: data.status || "Draft",
      };

      // For admin, allow specifying teacher; teachers will be inferred on server
      if (role === "admin" && data.teacher) {
        payload.teacher = data.teacher;
      }

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Failed to create assignment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setShowAddModal(false);
      reset();
      toast.success("Assignment created successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create assignment");
    },
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        title: data.title,
        description: data.description,
        subject: data.subject,
        classId: data.classId,
        dueDate: new Date(data.dueDate).toISOString(),
        totalPoints: data.totalPoints ? parseInt(data.totalPoints) : 100,
        status: data.status || "Draft",
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/assignments/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.message || "Failed to update assignment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setShowEditModal(false);
      setEditingItem(null);
      reset();
      toast.success("Assignment updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/assignments/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to delete assignment");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assignment deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete assignment");
    },
  });

  const onAdd = async (form) => {
    createAssignmentMutation.mutate(form);
  };

  const onEdit = async (form) => {
    if (!editingItem) return;
    updateAssignmentMutation.mutate({ id: editingItem._id, data: form });
  };

  const onDelete = async (item) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deletingItem) {
      deleteAssignmentMutation.mutate(deletingItem._id);
      setShowDeleteModal(false);
      setDeletingItem(null);
    }
  };

  const columns = [
    { key: "title", label: "Title" },
    {
      key: "subject",
      label: "Subject",
      render: (value, row) => row.subject?.name || "N/A",
    },
    {
      key: "class",
      label: "Class",
      render: (value, row) => {
        if (row.classId?.name) {
          const className = row.classId.name;
          const gradeName = row.classId.grade?.name;
          return gradeName ? `${className} - ${gradeName}` : className;
        }
        return "N/A";
      },
    },
    {
      key: "teacher",
      label: "Teacher",
      render: (value, row) => {
        if (row.teacher?.name && row.teacher?.surname) {
          return `${row.teacher.name} ${row.teacher.surname}`;
        }
        return "N/A";
      },
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "N/A"),
    },
    {
      key: "totalPoints",
      label: "Total Points",
      render: (value) => value || "N/A",
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val === "Published"
              ? "bg-green-100 text-green-800"
              : val === "Completed"
                ? "bg-blue-100 text-blue-800"
                : val === "Overdue"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
            }`}
        >
          {val}
        </span>
      ),
    },
  ];

  const actions = [
    {
      label: "View",
      onClick: (item) => {
        setViewingItem(item);
        setShowViewModal(true);
      },
    },
    ...(role === "admin" ||
      role === "teacher" ||
      role === "super_admin" ||
      role === "school_admin" ||
      role === "academic_admin"
      ? [
        {
          label: "Edit",
          onClick: (item) => {
            setEditingItem(item);
            // Transform the item data to match form structure
            const formData = {
              title: item.title || "",
              description: item.description || "",
              subject: item.subject?._id || item.subject || "",
              classId: item.classId?._id || item.classId || "",
              teacher: item.teacher?._id || item.teacher || "",
              dueDate: item.dueDate
                ? new Date(item.dueDate).toISOString().split("T")[0]
                : "",
              totalPoints: item.totalPoints || 100,
              status: item.status || "Draft",
            };
            reset(formData);
            setShowEditModal(true);
          },
        },
      ]
      : []),
    ...(role === "admin" ||
      role === "super_admin" ||
      role === "school_admin" ||
      role === "academic_admin"
      ? [
        {
          label: "Delete",
          color: "text-red-600",
          hoverColor: "text-red-900",
          icon: (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ),
          onClick: onDelete,
        },
      ]
      : []),
  ];

  // Student view with beautiful simple list
  if (role === "student") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Categorize assignments
    const categorizedAssignments = assignments.reduce(
      (acc, assignment) => {
        const dueDate = new Date(assignment.dueDate);
        const dueDateOnly = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate()
        );
        const isOverdue = dueDateOnly < today;
        const isDueToday = dueDateOnly.getTime() === today.getTime();
        const isDueTomorrow =
          dueDateOnly.getTime() === today.getTime() + 24 * 60 * 60 * 1000;

        if (assignment.isSubmitted) {
          acc.submitted.push(assignment);
        } else if (isOverdue) {
          acc.overdue.push(assignment);
        } else if (isDueToday) {
          acc.dueToday.push(assignment);
        } else if (isDueTomorrow) {
          acc.dueTomorrow.push(assignment);
        } else {
          acc.upcoming.push(assignment);
        }
        return acc;
      },
      {
        overdue: [],
        dueToday: [],
        dueTomorrow: [],
        upcoming: [],
        submitted: [],
      }
    );

    const getStatusBadge = (assignment) => {
      const dueDate = new Date(assignment.dueDate);
      const dueDateOnly = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate()
      );
      const isOverdue = dueDateOnly < today;
      const isDueToday = dueDateOnly.getTime() === today.getTime();

      if (assignment.isSubmitted) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Submitted
          </span>
        );
      } else if (isOverdue) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Overdue
          </span>
        );
      } else if (isDueToday) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            Due Today
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            Pending
          </span>
        );
      }
    };

    const AssignmentCard = ({ assignment }) => (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              {assignment.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {assignment.subject?.name}
            </p>
            {assignment.description && (
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {assignment.description}
              </p>
            )}
          </div>
          {getStatusBadge(assignment)}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
            {assignment.totalPoints && (
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {assignment.totalPoints} pts
              </span>
            )}
          </div>

          {assignment.isSubmitted && assignment.grade !== undefined && (
            <div className="flex items-center text-green-600 font-medium">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Grade: {assignment.grade}
            </div>
          )}
        </div>
      </div>
    );

    const CategorySection = ({
      title,
      assignments,
      titleClass,
      emptyMessage,
    }) => (
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 ${titleClass}`}>{title}</h2>
        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment._id} assignment={assignment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h10z"
                clipRule="evenodd"
              />
            </svg>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    );

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Assignments
          </h1>
          <p className="text-gray-600">Stay on top of your academic work</p>
        </div>

        {assignmentsLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" color="blue" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h10z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assignments yet
            </h3>
            <p className="text-gray-500">
              Your assignments will appear here when they are published.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overdue assignments */}
            {categorizedAssignments.overdue.length > 0 && (
              <CategorySection
                title={`⚠️ Overdue (${categorizedAssignments.overdue.length})`}
                assignments={categorizedAssignments.overdue}
                titleClass="text-red-600"
                emptyMessage="No overdue assignments"
              />
            )}

            {/* Due today */}
            {categorizedAssignments.dueToday.length > 0 && (
              <CategorySection
                title={`🔥 Due Today (${categorizedAssignments.dueToday.length})`}
                assignments={categorizedAssignments.dueToday}
                titleClass="text-orange-600"
                emptyMessage="No assignments due today"
              />
            )}

            {/* Due tomorrow */}
            {categorizedAssignments.dueTomorrow.length > 0 && (
              <CategorySection
                title={`📅 Due Tomorrow (${categorizedAssignments.dueTomorrow.length})`}
                assignments={categorizedAssignments.dueTomorrow}
                titleClass="text-yellow-600"
                emptyMessage="No assignments due tomorrow"
              />
            )}

            {/* Upcoming assignments */}
            {categorizedAssignments.upcoming.length > 0 && (
              <CategorySection
                title={`📚 Upcoming (${categorizedAssignments.upcoming.length})`}
                assignments={categorizedAssignments.upcoming}
                titleClass="text-blue-600"
                emptyMessage="No upcoming assignments"
              />
            )}

            {/* Submitted assignments */}
            {categorizedAssignments.submitted.length > 0 && (
              <CategorySection
                title={`✅ Submitted (${categorizedAssignments.submitted.length})`}
                assignments={categorizedAssignments.submitted}
                titleClass="text-green-600"
                emptyMessage="No submitted assignments"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("assignments.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] ||
              t("assignments.description") ||
              "Assignments management page"}
          </p>
        </div>
        {(role === "admin" ||
          role === "teacher" ||
          role === "super_admin" ||
          role === "school_admin" ||
          role === "academic_admin") && (
            <button
              onClick={() => {
                setShowAddModal(true);
                reset();
              }}
              disabled={
                role === "teacher" &&
                ((subjectsOptions?.length || 0) === 0 ||
                  (classesOptions?.length || 0) === 0)
              }
              title={
                role === "teacher" &&
                  ((subjectsOptions?.length || 0) === 0 ||
                    (classesOptions?.length || 0) === 0)
                  ? "No subjects/classes assigned to you yet"
                  : undefined
              }
              className={`px-4 py-2 rounded-md transition-colors ${role === "teacher" &&
                  ((subjectsOptions?.length || 0) === 0 ||
                    (classesOptions?.length || 0) === 0)
                  ? "bg-green-400 text-white cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
                }`}
            >
              Add Assignment
            </button>
          )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Role:{" "}
            {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Unknown"}
          </span>
        </div>
        {role === "teacher" &&
          ((subjectsOptions?.length || 0) === 0 ||
            (classesOptions?.length || 0) === 0) && (
            <div className="mb-4 p-3 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200">
              You don&apos;t have any subjects or classes assigned yet. Please
              contact an admin to assign you before creating assignments.
            </div>
          )}
        <EnhancedTable
          title="Assignments"
          data={assignments}
          columns={columns}
          actions={actions}
          pageSize={8}
          loading={assignmentsLoading}
        />
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Add Assignment
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    {...register("title")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter title"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    {...register("description")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter description"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <select
                      {...register("subject")}
                      disabled={subjectsLoadingEffective}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {subjectsLoadingEffective
                          ? "Loading subjects..."
                          : "Select a subject"}
                      </option>
                      {subjectsOptions.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class *
                    </label>
                    <select
                      {...register("classId")}
                      disabled={classesLoadingEffective}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {classesLoadingEffective
                          ? "Loading classes..."
                          : "Select a class"}
                      </option>
                      {classesOptions.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name} - {cls.grade?.name || cls.grade}
                        </option>
                      ))}
                    </select>
                    {errors.classId && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.classId.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      {...register("dueDate")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {errors.dueDate && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.dueDate.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Points
                    </label>
                    <input
                      type="number"
                      {...register("totalPoints")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., 100"
                    />
                    {errors.totalPoints && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.totalPoints.message}
                      </p>
                    )}
                  </div>
                </div>

                {role === "admin" && teachers && teachers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Teacher
                    </label>
                    <select
                      {...register("teacher")}
                      disabled={teachersLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {teachersLoading
                          ? "Loading teachers..."
                          : "Select a teacher"}
                      </option>
                      {teachers.map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.name} {teacher.surname}
                        </option>
                      ))}
                    </select>
                    {errors.teacher && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.teacher.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Completed</option>
                    <option>Overdue</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAssignmentMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    {createAssignmentMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner size="sm" color="white" /> Creating...
                      </span>
                    ) : (
                      "Create Assignment"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Assignment
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit(onEdit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    {...register("title")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    {...register("description")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <select
                      {...register("subject")}
                      disabled={subjectsLoadingEffective}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {subjectsLoadingEffective
                          ? "Loading subjects..."
                          : "Select a subject"}
                      </option>
                      {subjectsOptions.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class *
                    </label>
                    <select
                      {...register("classId")}
                      disabled={classesLoadingEffective}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {classesLoadingEffective
                          ? "Loading classes..."
                          : "Select a class"}
                      </option>
                      {classesOptions.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name} - {cls.grade?.name || cls.grade}
                        </option>
                      ))}
                    </select>
                    {errors.classId && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.classId.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      {...register("dueDate")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.dueDate && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.dueDate.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Points
                    </label>
                    <input
                      type="number"
                      {...register("totalPoints")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 100"
                    />
                    {errors.totalPoints && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.totalPoints.message}
                      </p>
                    )}
                  </div>
                </div>

                {role === "admin" && teachers && teachers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Teacher
                    </label>
                    <select
                      {...register("teacher")}
                      disabled={teachersLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {teachersLoading
                          ? "Loading teachers..."
                          : "Select a teacher"}
                      </option>
                      {teachers.map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.name} {teacher.surname}
                        </option>
                      ))}
                    </select>
                    {errors.teacher && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.teacher.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Completed</option>
                    <option>Overdue</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateAssignmentMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {updateAssignmentMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner size="sm" color="white" /> Updating...
                      </span>
                    ) : (
                      "Update"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewingItem && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Assignment Details
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-16 items-center">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-medium">{viewingItem.title}</span>
                </div>
                <div>
                  <span className="text-gray-600">Description:</span>
                  <p className="mt-1">{viewingItem.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Subject:</span>
                    <div className="font-medium">
                      {viewingItem.subject?.name || viewingItem.subject}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Class:</span>
                    <div className="font-medium">
                      {viewingItem.classId?.name || viewingItem.class}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Teacher:</span>
                    <div className="font-medium">
                      {viewingItem.teacher?.name
                        ? `${viewingItem.teacher.name} ${viewingItem.teacher.surname || ""
                        }`
                        : viewingItem.teacher}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <div className="font-medium">
                      {viewingItem.dueDate
                        ? new Date(viewingItem.dueDate).toLocaleDateString()
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Points:</span>
                    <div className="font-medium">
                      {viewingItem.totalPoints || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="font-medium">
                      {viewingItem.status || "Draft"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deletingItem && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Assignment
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-gray-900">
                    &ldquo;{deletingItem.title}&rdquo;
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between mb-1">
                      <span>Subject:</span>
                      <span className="font-medium">
                        {deletingItem.subject?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Class:</span>
                      <span className="font-medium">
                        {deletingItem.classId?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due Date:</span>
                      <span className="font-medium">
                        {deletingItem.dueDate
                          ? new Date(deletingItem.dueDate).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={deleteAssignmentMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteAssignmentMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {deleteAssignmentMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
