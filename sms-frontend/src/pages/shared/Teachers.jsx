import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import EnhancedTable from "../../components/EnhancedTable";
import { toLabel, toLabelArray } from "../../utils/labels";

// Loading Spinner Component
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
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const Teachers = ({ role = "admin" }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [deletingTeacher, setDeletingTeacher] = useState(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debug authentication state
  useEffect(() => {
    // Authentication debugging removed for security
  }, []);

  // Fetch functions
  const fetchTeachers = async () => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/teachers?limit=1000`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch teachers: ${res.status}`);
    }

    const json = await res.json();
    // Backend returns data in nested structure: { data: { data: [...] } }
    const teachersData = json.data?.data || json.data || [];
    return Array.isArray(teachersData)
      ? teachersData.map((t) => {
        const subjectNames = Array.isArray(t.subjects)
          ? t.subjects
            .map((s) => (typeof s === "string" ? s : s?.name))
            .filter(Boolean)
          : [];
        const classNames = Array.isArray(t.classes)
          ? t.classes
            .map((c) => (typeof c === "string" ? c : c?.name))
            .filter(Boolean)
          : [];
        return {
          id: t._id,
          name: `${t.name} ${t.surname || ""}`.trim(),
          email: t.email,
          phone: t.phone || "",
          subject: subjectNames.join(", ") || t.subject || "Not Assigned",
          subjects: subjectNames,
          department: t.department || "General",
          qualification: t.qualification || "Not Specified",
          experience: `${typeof t.experience === "number"
              ? t.experience
              : Number(t.experience) || 0
            } years`,
          status:
            t.status ||
            (t.userId?.isActive !== undefined
              ? t.userId.isActive
                ? "Active"
                : "Inactive"
              : "Active"),
          hireDate: t.hireDate
            ? new Date(t.hireDate).toLocaleDateString()
            : "Not Set",
          classes: classNames,
          officeHours: t.officeHours || "Not Set",
          username: t.userId?.username || t.username || "",
          active: t.userId?.isActive !== undefined ? t.userId.isActive : true,
        };
      })
      : [];
    return teachersData;
  };

  const fetchTeacherById = async (id) => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/teachers/${id}`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch teacher: ${res.status}`);
    }
    const json = await res.json();
    // shape: { data: { data: teacher } }
    return json?.data?.data || json?.data || json;
  };

  const fetchSubjects = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/subjects`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch subjects: ${res.status}`);
    }

    const json = await res.json();
    return Array.isArray(json?.data?.data)
      ? [...new Set(json.data.data.map((s) => s.name))]
      : [];
  };

  const fetchDepartments = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/teachers`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch departments: ${res.status}`);
    }

    const json = await res.json();
    // Backend returns data in nested structure: { data: { data: [...] } }
    const departmentsData = json.data?.data || json.data || [];
    const defaults = [
      "Science & Mathematics",
      "Languages & Humanities",
      "Social Sciences",
      "Technology",
      "Arts",
      "Physical Education",
    ];
    if (Array.isArray(departmentsData)) {
      const unique = [
        ...new Set(
          departmentsData
            .map((t) => t?.department)
            .filter((d) => typeof d === "string" && d.trim().length > 0)
        ),
      ];
      return unique.length > 0 ? unique : defaults;
    }
    return defaults;
  };

  const fetchUnlinkedTeacherUsers = async () => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/users?role=teacher&unlinked=true`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) {
      if (res.status === 401)
        throw new Error("Unauthorized - Please login again");
      throw new Error(`Failed to fetch unlinked teacher users: ${res.status}`);
    }
    const json = await res.json();
    const users = Array.isArray(json?.data?.data)
      ? json.data.data
      : Array.isArray(json?.data?.users)
        ? json.data.users
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];
    const seen = new Set();
    return users
      .map((u) => ({
        value: u.username,
        label: u.username || u.email || u._id,
      }))
      .filter((opt) => {
        if (!opt.value || seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
  };

  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      name: "",
      surname: "",
      email: "",
      phone: "",
      username: "",
      password: "",
      address: "",
      bloodType: "",
      sex: "",
      birthday: "",
      subject: "",
      department: "",
      qualification: "",
      experience: "",
      status: "Active",
      hireDate: "",
      officeHours: "",
    },
  });

  // Queries
  const {
    data: teachers = [],
    isLoading: teachersLoading,
    error: teachersError,
    isError: teachersIsError,
  } = useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const { data: unlinkedTeacherUsers = [] } = useQuery({
    queryKey: ["unlinked-teacher-users"],
    queryFn: fetchUnlinkedTeacherUsers,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const addTeacherMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        username: data.username,
        name: data.name,
        surname: data.surname || "",
        address: data.address || "",
        sex: data.sex || "MALE",
        birthday: data.birthday,
        phone: data.phone || "",
        bloodType: data.bloodType || "A+",
        subject: data.subject || undefined,
        department: data.department || "",
        qualification: data.qualification || "",
        experience: data.experience ? Number(data.experience) : 0,
        hireDate: data.hireDate || "",
      };
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        // Special-case 409: show guidance to use Edit instead
        if (res.status === 409) {
          throw new Error(
            "Teacher profile already exists for this user. Open Edit to update details."
          );
        }
        throw new Error(
          json.message || `Failed to link teacher (status ${res.status})`
        );
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-teacher-users"] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ["teachers"] });
      setShowAddModal(false);
      reset();
      toast.success("Teacher linked successfully!");
    },
    onError: async (error, variables) => {
      // If 409 guidance message, try to pre-open Edit with that username if we can find the teacher row
      const msg = error?.message || "Failed to link teacher";
      toast.error(msg);
      if (msg.includes("already exists") && variables?.username) {
        try {
          // Find the teacher by username from current table data
          const row = (teachers || []).find(
            (t) =>
              (t.username || "").toLowerCase() ===
              variables.username.toLowerCase()
          );
          if (row) {
            // Load full details and open edit modal
            setEditingTeacher(row);
            const full = await fetchTeacherById(row.id || row._id);
            const nameParts = `${full.name || row.name || ""}`
              .trim()
              .split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            const subjectsArr = Array.isArray(full.subjects)
              ? full.subjects
                .map((s) => (typeof s === "string" ? s : s?.name))
                .filter(Boolean)
              : Array.isArray(row.subjects)
                ? row.subjects
                : [];
            const toDateInput = (d) => {
              if (!d) return "";
              const dt = new Date(d);
              return Number.isNaN(dt.getTime())
                ? ""
                : dt.toISOString().split("T")[0];
            };
            reset({
              name: firstName,
              surname: lastName,
              email: full.email || row.email || "",
              phone: full.phone || row.phone || "",
              address: full.address || "",
              bloodType: full.bloodType || "",
              sex: full.sex || "",
              birthday: toDateInput(full.birthday),
              subject:
                subjectsArr.length > 0 ? subjectsArr[0] : row.subject || "",
              department: full.department || row.department || "",
              qualification: full.qualification || row.qualification || "",
              experience:
                typeof full.experience === "number"
                  ? full.experience
                  : row.experience || "",
              status: full.status || row.status || "Active",
              hireDate: toDateInput(full.hireDate),
              officeHours: full.officeHours || row.officeHours || "",
            });
            setShowAddModal(false);
            setShowEditModal(true);
          }
        } catch (_) {
          // ignore and just keep the toast
        }
      }
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        name: data.name,
        surname: data.surname || "",
        email: data.email,
        phone: data.phone || "",
        address: data.address || "",
        bloodType: data.bloodType || "A+",
        sex: data.sex || "MALE",
        birthday: data.birthday
          ? new Date(data.birthday).toISOString().split("T")[0] +
          "T00:00:00.000Z"
          : new Date().toISOString().split("T")[0] + "T00:00:00.000Z",
        subject: data.subject || "",
        department: data.department || "",
        qualification: data.qualification || "",
        experience: data.experience || "",
        status: data.status || "Active",
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString() : null,
        officeHours: data.officeHours || "",
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Failed to update teacher");
      return json.data;
    },
    onSuccess: () => {
      // Force refetch of teachers data
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.refetchQueries({ queryKey: ["teachers"] });
      setShowEditModal(false);
      setEditingTeacher(null);
      reset();
      toast.success("Teacher updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update teacher");
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to delete teacher");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setShowDeleteModal(false);
      setDeletingTeacher(null);
      toast.success("Teacher deleted successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete teacher");
    },
  });

  // Helper functions
  const getStatusBadge = (status) => {
    const statusConfig = {
      Active: "bg-green-100 text-green-800",
      "On Leave": "bg-yellow-100 text-yellow-800",
      Inactive: "bg-red-100 text-red-800",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-800";
  };

  const getDepartmentBadge = (department) => {
    const deptConfig = {
      "Science & Mathematics": "bg-blue-100 text-blue-800",
      "Languages & Humanities": "bg-purple-100 text-purple-800",
      "Social Sciences": "bg-green-100 text-green-800",
      Technology: "bg-orange-100 text-orange-800",
      Arts: "bg-pink-100 text-pink-800",
      "Physical Education": "bg-indigo-100 text-indigo-800",
    };
    return deptConfig[department] || "bg-gray-100 text-gray-800";
  };

  // Role-based permissions
  const canAddTeacher =
    (role === "admin" ||
      role === "super_admin" ||
      role === "school_admin" ||
      role === "academic_admin") &&
    user?.role !== "exam_admin";
  const canEditTeacher =
    (role === "admin" ||
      role === "super_admin" ||
      role === "school_admin" ||
      role === "academic_admin") &&
    user?.role !== "exam_admin";
  const canDeleteTeacher =
    (role === "admin" ||
      role === "super_admin" ||
      role === "school_admin" ||
      role === "academic_admin") &&
    user?.role !== "exam_admin";
  const canViewDetails = true;
  const canContactTeacher = role !== "teacher";

  // Actions for the table
  const actions = [
    ...(canViewDetails
      ? [
        {
          label: "View",
          onClick: (teacher) => {
            setViewingTeacher(teacher);
            setShowViewModal(true);
          },
          color: "text-blue-600",
          hoverColor: "text-blue-900",
        },
      ]
      : []),
    ...(canContactTeacher
      ? [
        {
          label: "Contact",
          onClick: (teacher) => {
            window.location.href = `mailto:${teacher.email}`;
          },
          color: "text-green-600",
          hoverColor: "text-green-900",
        },
      ]
      : []),
    ...(canEditTeacher
      ? [
        {
          label: "Edit",
          onClick: async (row) => {
            try {
              setEditingTeacher(row);
              const full = await fetchTeacherById(row.id || row._id);
              const nameParts = `${full.name || row.name || ""}`
                .trim()
                .split(" ");
              const firstName = nameParts[0] || "";
              const lastName = nameParts.slice(1).join(" ") || "";

              const subjectsArr = Array.isArray(full.subjects)
                ? full.subjects
                  .map((s) => (typeof s === "string" ? s : s?.name))
                  .filter(Boolean)
                : Array.isArray(row.subjects)
                  ? row.subjects
                  : [];
              // classes data not used in shared edit form currently

              const toDateInput = (d) => {
                if (!d) return "";
                const dt = new Date(d);
                return Number.isNaN(dt.getTime())
                  ? ""
                  : dt.toISOString().split("T")[0];
              };

              reset({
                name: firstName,
                surname: lastName,
                email: full.email || row.email || "",
                phone: full.phone || row.phone || "",
                address: full.address || "",
                bloodType: full.bloodType || "",
                sex: full.sex || "",
                birthday: toDateInput(full.birthday),
                // shared page still uses single subject select
                subject:
                  subjectsArr.length > 0 ? subjectsArr[0] : row.subject || "",
                department: full.department || row.department || "",
                qualification: full.qualification || row.qualification || "",
                experience:
                  typeof full.experience === "number"
                    ? full.experience
                    : row.experience || "",
                status: full.status || row.status || "Active",
                hireDate: toDateInput(full.hireDate),
                officeHours: full.officeHours || row.officeHours || "",
              });

              setShowEditModal(true);
            } catch (e) {
              toast.error(e.message || "Failed to load teacher details");
            }
          },
          color: "text-indigo-600",
          hoverColor: "text-indigo-900",
        },
      ]
      : []),
    ...(canDeleteTeacher
      ? [
        {
          label: "Delete",
          onClick: (teacher) => {
            setDeletingTeacher(teacher);
            setShowDeleteModal(true);
          },
          color: "text-red-600",
          hoverColor: "text-red-900",
        },
      ]
      : []),
  ];

  // Sanitize and normalize teacher rows for safe rendering
  const safeTeachers = useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    return teachers.map((t) => {
      const subjectsArray = Array.isArray(t.subjects)
        ? toLabelArray(t.subjects)
        : t.subject
          ? [toLabel(t.subject)]
          : [];
      const classesArray = Array.isArray(t.classes)
        ? toLabelArray(t.classes)
        : [];
      return {
        ...t,
        name: toLabel(t.name),
        email: toLabel(t.email),
        phone: toLabel(t.phone),
        username: toLabel(t.username),
        department: toLabel(t.department || "General"),
        qualification: toLabel(t.qualification || "Not Specified"),
        status: toLabel(t.status || (t.active ? "Active" : "Inactive")),
        subjects: subjectsArray,
        classes: classesArray,
        subjectsLabel:
          subjectsArray.length > 0 ? subjectsArray.join(", ") : "Not Assigned",
        classesLabel:
          classesArray.length > 0 ? classesArray.join(", ") : "No classes",
      };
    });
  }, [teachers]);

  // Debug exposure removed

  // Memoize columns and coerce subjects/classes for chip renderers
  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (value, teacher) => (
          <div>
            <div className="font-medium text-gray-900">{toLabel(value)}</div>
            <div className="text-sm text-gray-500">
              {toLabel(teacher.qualification)}
            </div>
          </div>
        ),
      },
      { key: "email", label: "Email", sortable: true },
      {
        key: "subjects",
        label: "Subjects",
        sortable: false,
        render: (subjects) => {
          const list = Array.isArray(subjects)
            ? subjects.map((s) => toLabel(s)).filter(Boolean)
            : [];
          return (
            <div className="flex flex-wrap gap-1">
              {list.length > 0 ? (
                list.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">Not Assigned</span>
              )}
            </div>
          );
        },
      },
      {
        key: "department",
        label: "Department",
        sortable: true,
        render: (value) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDepartmentBadge(
              toLabel(value)
            )}`}
          >
            {toLabel(value)}
          </span>
        ),
      },
      {
        key: "experience",
        label: "Experience",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-gray-600">{toLabel(value)}</span>
        ),
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        filterable: true,
        render: (value) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
          >
            {value ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        filterable: true,
        render: (value) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
              toLabel(value)
            )}`}
          >
            {toLabel(value)}
          </span>
        ),
      },
      {
        key: "hireDate",
        label: "Hire Date",
        sortable: true,
        render: (value) => (
          <span className="text-sm text-gray-600">{toLabel(value)}</span>
        ),
      },
      {
        key: "username",
        label: "Username",
        sortable: true,
        filterable: true,
        render: (value) => (
          <span className="text-sm font-mono text-gray-700">
            {toLabel(value)}
          </span>
        ),
      },
      {
        key: "classes",
        label: "Classes",
        sortable: false,
        filterable: false,
        render: (classes) => {
          const list = Array.isArray(classes)
            ? classes.map((c) => toLabel(c)).filter(Boolean)
            : [];
          return (
            <div className="space-y-1">
              {list.length > 0 ? (
                list.map((className, index) => (
                  <span
                    key={`${className}-${index}`}
                    className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                  >
                    {className}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">
                  No classes assigned
                </span>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  // Main return
  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Teachers
        </h1>
        {canAddTeacher && (
          <button
            onClick={() => {
              reset();
              setShowAddModal(true);
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
          >
            Link Existing User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {teachersIsError ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-lg font-medium mb-2">
              Error Loading Teachers
            </div>
            <div className="text-gray-600">
              {teachersError?.message || "Failed to load teachers data"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <EnhancedTable
            title="Teacher Management"
            data={safeTeachers}
            filterable={false}
            columns={columns}
            actions={actions}
            selectable={canEditTeacher}
            bulkActions={[
              ...(canEditTeacher
                ? [
                  {
                    label: "Change Status",
                    onClick: () => { },
                    className: "bg-yellow-600 text-white hover:bg-yellow-700",
                  },
                ]
                : []),
              ...(canDeleteTeacher
                ? [
                  {
                    label: "Delete Selected",
                    onClick: () => { },
                    className: "bg-red-600 text-white hover:bg-red-700",
                  },
                ]
                : []),
            ]}
            onSelectionChange={() => { }}
            onRowClick={() => { }}
            pageSize={8}
            emptyMessage="No teachers found matching your criteria"
            loading={teachersLoading}
          />
        )}
      </div>

      {/* Modals */}
      <>
        {/* Delete Teacher Modal */}
        {showDeleteModal && deletingTeacher && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Delete Teacher
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingTeacher(null);
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
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{deletingTeacher.name}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingTeacher(null);
                  }}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsDeleting(true);
                    deleteTeacherMutation.mutate(
                      deletingTeacher._id || deletingTeacher.id,
                      {
                        onSettled: () => setIsDeleting(false),
                      }
                    );
                  }}
                  className={`px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : null}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Teacher Modal */}
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Link Existing Teacher User
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
                  addTeacherMutation.mutate(data, {
                    onSettled: () => setIsSubmittingAdd(false),
                  });
                })}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username (existing teacher) *
                    </label>
                    <select
                      {...register("username", {
                        required: "Username is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Select a username...</option>
                      {unlinkedTeacherUsers.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.username.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      {...register("name", {
                        required: "First name is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter first name"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register("surname")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      {...register("phone")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      {...register("subject")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Subject</option>
                      {subjectsLoading ? (
                        <option disabled>Loading...</option>
                      ) : (
                        subjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      {...register("department")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Department</option>
                      {departmentsLoading ? (
                        <option disabled>Loading...</option>
                      ) : (
                        departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      {...register("qualification")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Ph.D. in Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experience
                    </label>
                    <input
                      type="number"
                      {...register("experience")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      {...register("status")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      {...register("hireDate")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      {...register("address", {
                        required: "Address is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter address"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Blood Type *
                    </label>
                    <select
                      {...register("bloodType", {
                        required: "Blood type is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    {errors.bloodType && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.bloodType.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sex *
                    </label>
                    <select
                      {...register("sex", { required: "Sex is required" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Sex</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                    {errors.sex && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.sex.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birthday *
                    </label>
                    <input
                      type="date"
                      {...register("birthday", {
                        required: "Birthday is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.birthday && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.birthday.message}
                      </p>
                    )}
                  </div>
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
                    <span>
                      {isSubmittingAdd ? "Linking..." : "Link Teacher"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Teacher Modal */}
        {showEditModal && editingTeacher && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Teacher
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTeacher(null);
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
                  updateTeacherMutation.mutate(
                    { id: editingTeacher._id || editingTeacher.id, data },
                    {
                      onSettled: () => setIsSubmittingEdit(false),
                    }
                  );
                })}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      {...register("name", {
                        required: "First name is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register("surname")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      {...register("email", { required: "Email is required" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      {...register("phone")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      {...register("subject")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Subject</option>
                      {subjectsLoading ? (
                        <option disabled>Loading...</option>
                      ) : (
                        subjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      {...register("department")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Department</option>
                      {departmentsLoading ? (
                        <option disabled>Loading...</option>
                      ) : (
                        departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      {...register("qualification")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experience
                    </label>
                    <input
                      type="text"
                      {...register("experience")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      {...register("status")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      {...register("hireDate")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      {...register("address", {
                        required: "Address is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter address"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.address.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Blood Type *
                    </label>
                    <select
                      {...register("bloodType", {
                        required: "Blood type is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Blood Type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    {errors.bloodType && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.bloodType.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sex *
                    </label>
                    <select
                      {...register("sex", { required: "Sex is required" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Sex</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                    {errors.sex && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.sex.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birthday *
                    </label>
                    <input
                      type="date"
                      {...register("birthday", {
                        required: "Birthday is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.birthday && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.birthday.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTeacher(null);
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
                      {isSubmittingEdit ? "Updating..." : "Update Teacher"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Teacher Modal */}
        {showViewModal && viewingTeacher && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-500 px-6 py-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Teacher Details
                  </h2>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingTeacher(null);
                    }}
                    className="text-white hover:text-gray-200 transition-colors"
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
              </div>

              {/* Content Area */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        NAME
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        EMAIL
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.email}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        PHONE
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        SUBJECT
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.subject}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        DEPARTMENT
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.department}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        QUALIFICATION
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.qualification}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        EXPERIENCE
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.experience}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        STATUS
                      </label>
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${getStatusBadge(
                          viewingTeacher.status
                        )}`}
                      >
                        {viewingTeacher.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        HIRE DATE
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.hireDate}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        OFFICE HOURS
                      </label>
                      <p className="text-lg font-bold text-gray-900">
                        {viewingTeacher.officeHours}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      ASSIGNED CLASSES
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {viewingTeacher.classes &&
                        viewingTeacher.classes.length > 0 ? (
                        viewingTeacher.classes.map((className, index) => (
                          <span
                            key={index}
                            className="inline-block bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full"
                          >
                            {className}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">
                          No classes assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Close Button */}
              <div className="flex justify-end px-6 py-4 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingTeacher(null);
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
};

export default Teachers;
