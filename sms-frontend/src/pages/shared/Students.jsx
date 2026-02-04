import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import SkeletonLoader from "../../components/SkeletonLoader";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import {
  studentFormSchema,
  linkExistingStudentSchema,
} from "../../utils/formSchemas";
import authService from "../../services/authService";
import {
  linkExistingStudentUser,
  fetchUnlinkedStudentUsers,
  fetchParents,
  fetchClasses,
  fetchGrades,
} from "../../services/studentLinkService";
import { toast } from "react-toastify";
import DatePicker from "../../components/ui/DatePicker";
import { API_BASE_URL } from "../../config";

const Students = ({ role = "admin" }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track fetch errors if needed (currently unused UI)
  const [, /*fetchError*/ setFetchError] = useState(null);

  const fetchStudents = useCallback(async () => {
    setFetchError(null);
    try {
      // If teacher, restrict to students in teacher's classes
      let teacherClassIds = null;
      if (role === "teacher") {
        try {
          const meRes = await authService.authFetch(
            `${API_BASE_URL}/api/v1/teachers/me`
          );
          if (!meRes.ok) throw new Error(`Failed profile: ${meRes.status}`);
          const meJson = await meRes.json();
          const me = meJson?.data?.data;
          if (me?._id) {
            const clsRes = await authService.authFetch(
              `${API_BASE_URL}/api/v1/classes`
            );
            if (!clsRes.ok) throw new Error(`Failed classes: ${clsRes.status}`);
            const clsJson = await clsRes.json();
            const allClasses = Array.isArray(clsJson?.data?.data)
              ? clsJson.data.data
              : [];
            teacherClassIds = new Set(
              allClasses
                .filter((c) => c?.supervisor?._id === me._id)
                .map((c) => c._id)
            );
          }
        } catch {
          // On any failure, do not leak other students
          teacherClassIds = new Set();
        }
      }

      // Use different endpoints based on role
      let res;
      if (role === "teacher") {
        res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/students/my-students`
        );
      } else {
        res = await authService.authFetch(`${API_BASE_URL}/api/v1/students`);
      }

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      let list = Array.isArray(json?.data?.data) ? json.data.data : [];

      // For non-teacher roles, apply class filtering if needed
      if (role !== "teacher" && teacherClassIds instanceof Set) {
        list = list.filter((s) =>
          teacherClassIds.has(s?.class?._id || s?.class)
        );
      }

      setStudents(
        list.map((s) => ({
          id: s._id,
          name: `${s.name} ${s.surname || ""}`.trim(),
          email: s.email || "",
          phone: s.phone || "",
          username: s.username || "",
          grade: s.grade?.name || "",
          class: s.class?.name || "",
          classId: s.class?._id || s.class || "",
          parentName:
            `${s.parent?.name || ""} ${s.parent?.surname || ""}`.trim() || "",
          parentPhone: s.parent?.phone || "",
          status: "Active",
          enrollmentDate: s.createdAt
            ? new Date(s.createdAt).toISOString().split("T")[0]
            : "",
          gpa: s.gpa || null,
        }))
      );
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const navigate = useNavigate();

  // Simulate loading on component mount
  // removed artificial timeout; real fetch controls loading

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      grade: "",
      class: "",
      parentName: "",
      parentPhone: "",
      status: "Active",
      gpa: "",
    },
  });

  const [parents, setParents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [gradesList, setGradesList] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, c, g] = await Promise.all([
          fetchParents(),
          fetchClasses(),
          fetchGrades(),
        ]);
        if (mounted) {
          setParents(Array.isArray(p) ? p : []);
          setClassesList(Array.isArray(c) ? c : []);
          setGradesList(Array.isArray(g) ? g : []);
        }
      } catch {
        // ignore fetch errors here; edit modal will just have empty options
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      Active: "bg-green-100 text-green-800",
      Inactive: "bg-red-100 text-red-800",
      Suspended: "bg-yellow-100 text-yellow-800",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-800";
  }, []);

  const roleTitles = {
    admin: "Admin - Students Management",
    teacher: "Teacher - My Students",
    student: "Student - Classmates",
    parent: "Parent - My Children's Classmates",
  };

  const roleDescriptions = {
    admin: "Manage all students in the school system",
    teacher: "View and manage students in your classes",
    student: "View your classmates and class information",
    parent: "View information about your children's classmates",
  };

  // Role-based permissions
  const canAddStudent = role === "admin" && user?.role !== "exam_admin";
  const canEditStudent = role === "admin" && user?.role !== "exam_admin"; // teachers are view-only
  const canDeleteStudent = role === "admin" && user?.role !== "exam_admin";
  const canViewDetails = true; // All roles can view

  const handleEditStudent = (student) => {
    // Set form values for editing
    setValue("name", student.name);
    setValue("email", student.email);
    setValue("phone", student.phone || "");
    setValue("grade", student.grade);
    setValue("class", student.class);
    setValue("parentName", student.parentName);
    setValue("parentPhone", student.parentPhone || "");
    setValue("status", student.status);
    setValue(
      "gpa",
      student.gpa === null || student.gpa === undefined
        ? ""
        : String(student.gpa)
    );
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    // removed add modal
    setShowLinkModal(false);
    setEditingStudent(null);
    reset(); // Reset form when modal is closed
  };

  const onSubmit = async (data) => {
    try {
      if (editingStudent) {
        // Map selected grade/class/parent to IDs expected by backend
        const selectedGradeLabel = data.grade;
        const selectedClassLabel = data.class;
        const selectedParentName = data.parentName;

        const gradeId = gradesList.find((g) => {
          const label = g.name || "";
          return label === selectedGradeLabel;
        })?._id;
        const classId = classesList.find(
          (c) => c.name === selectedClassLabel
        )?._id;
        const parentId = (() => {
          if (!selectedParentName) return undefined;
          const p = parents.find(
            (pp) =>
              `${pp.name} ${pp.surname || ""}`.trim() === selectedParentName
          );
          return p?._id;
        })();

        const payload = {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          gpa:
            data.gpa === "" || data.gpa === null || data.gpa === undefined
              ? undefined
              : Number(data.gpa),
        };
        if (classId) payload.class = classId;
        if (gradeId) payload.grade = gradeId;
        if (parentId) payload.parent = parentId;

        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/students/${editingStudent.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            json?.message || `Failed to update (status ${res.status})`;
          toast.error(msg);
          return;
        }
        toast.success("Student updated");
        await fetchStudents();
        try {
          // Kick classes dashboard to reflect new enrollment counts
          await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
        } catch {
          /* best effort */
        }
      } else {
        // No direct add here; use Link Existing for creation
        toast.info("Use 'Link Existing User' to add students");
      }
    } finally {
      setShowEditModal(false);
      setEditingStudent(null);
      reset();
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = json?.message || `Failed to delete (status ${res.status})`;
        toast.error(msg);
        return;
      }
      toast.success("Student deleted");
      setStudents(students.filter((student) => student.id !== id));
      try {
        await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      } catch {
        /* ignore */
      }
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      {
        key: "username",
        label: "Username",
        sortable: true,
        render: (value) => (
          <span className="text-sm font-mono text-gray-700">{value}</span>
        ),
      },
      { key: "grade", label: "Grade", sortable: true },
      { key: "class", label: "Class", sortable: true },
      {
        key: "gpa",
        label: "GPA",
        sortable: true,
        render: (value) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${(Number(value) || 0) >= 4.0
                ? "bg-green-100 text-green-800"
                : (Number(value) || 0) >= 3.5
                  ? "bg-blue-100 text-blue-800"
                  : (Number(value) || 0) >= 3.0
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
          >
            {value ?? "-"}
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
              value
            )}`}
          >
            {value}
          </span>
        ),
      },
      {
        key: "parentName",
        label: "Parent",
        sortable: true,
        filterable: true,
        subtext: "parentPhone",
      },
    ],
    [getStatusBadge]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Students
          </h1>
          <p className="text-gray-600 mt-1">Student Management Page</p>
        </div>
        {canAddStudent && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowLinkModal(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
            >
              Link Existing User
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>

        {loading ? (
          <SkeletonLoader type="table" rows={8} columns={8} />
        ) : role === "teacher" ? (
          // Mobile-friendly card layout for teachers
          <div className="space-y-4">
            {students.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No students found
                </h3>
                <p className="text-gray-500">
                  You don't have any students assigned to your classes yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() =>
                      navigate(`/teacher/student-profile?id=${student.id}`)
                    }
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {student.name.split(" ")[0]}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          student.status
                        )}`}
                      >
                        {student.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Class:</span>
                        <span className="font-medium text-gray-900">
                          {student.class || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Grade:</span>
                        <span className="font-medium text-gray-900">
                          {student.grade || "N/A"}
                        </span>
                      </div>
                      {student.gpa && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">GPA:</span>
                          <span
                            className={`font-medium px-2 py-1 rounded-full text-xs ${(Number(student.gpa) || 0) >= 4.0
                                ? "bg-green-100 text-green-800"
                                : (Number(student.gpa) || 0) >= 3.5
                                  ? "bg-blue-100 text-blue-800"
                                  : (Number(student.gpa) || 0) >= 3.0
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                          >
                            {student.gpa}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          View Profile
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EnhancedTable
            title="Student Management"
            data={students}
            filterable={false}
            columns={columns}
            actions={[
              ...(canViewDetails
                ? [
                  {
                    label: "View",
                    onClick: (student) => {
                      if (role === "teacher") {
                        navigate(`/teacher/student-profile?id=${student.id}`);
                        return;
                      }
                      setViewingStudent(student);
                      setShowViewModal(true);
                    },
                    color: "text-blue-600",
                    hoverColor: "text-blue-900",
                  },
                ]
                : []),
              ...(canEditStudent
                ? [
                  {
                    label: "Edit",
                    onClick: (student) => {
                      handleEditStudent(student);
                    },
                    color: "text-indigo-600",
                    hoverColor: "text-indigo-900",
                  },
                ]
                : []),
              ...(canDeleteStudent
                ? [
                  {
                    label: "Delete",
                    onClick: (student) => {
                      handleDeleteStudent(student.id);
                    },
                    color: "text-red-600",
                    hoverColor: "text-red-900",
                  },
                ]
                : []),
            ]}
            selectable={canEditStudent}
            bulkActions={[
              ...(canEditStudent
                ? [
                  {
                    label: "Export Selected",
                    onClick: () => {
                      // Implement bulk export
                    },
                    className: "bg-green-600 text-white hover:bg-green-700",
                  },
                ]
                : []),
              ...(canEditStudent
                ? [
                  {
                    label: "Change Status",
                    onClick: () => {
                      // Implement bulk status change
                    },
                    className: "bg-blue-600 text-white hover:bg-blue-700",
                  },
                ]
                : []),
              ...(canDeleteStudent
                ? [
                  {
                    label: "Delete Selected",
                    onClick: () => {
                      // Implement bulk delete
                    },
                    className: "bg-red-600 text-white hover:bg-red-700",
                  },
                ]
                : []),
            ]}
            onSelectionChange={() => { }}
            onRowClick={() => {
              // Implement row click functionality
            }}
            pageSize={8}
            emptyMessage="No students found matching your criteria"
          />
        )}
      </div>

      {/* Link Existing Student User Modal */}
      {showLinkModal && (
        <LinkExistingStudentModal
          onClose={handleCloseModal}
          onLinked={() => {
            fetchStudents();
          }}
        />
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <Modal
          title="Edit Student"
          onClose={handleCloseModal}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
              >
                Cancel
              </button>
              <button
                form="edit-student-form"
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </>
          }
        >
          <form
            id="edit-student-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter student name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade *
                </label>
                <select
                  {...register("grade")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select grade</option>
                  {gradesList.map((g) => {
                    const label = g.name || "";
                    if (!label) return null;
                    return (
                      <option key={g._id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {errors.grade && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.grade.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class *
                </label>
                <select
                  {...register("class")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select class</option>
                  {classesList.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.class && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.class.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GPA
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="4.0"
                  {...register("gpa")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter GPA"
                />
                {errors.gpa && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.gpa.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Name
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={(() => {
                    const currentName = watch("parentName");
                    const found = parents.find(
                      (p) =>
                        `${p.name} ${p.surname || ""}`.trim() === currentName
                    );
                    return found?._id || "";
                  })()}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setValue("parentName", "");
                      setValue("parentPhone", "");
                      return;
                    }
                    const p = parents.find((x) => x._id === id);
                    const fullName = p
                      ? `${p.name} ${p.surname || ""}`.trim()
                      : "";
                    setValue("parentName", fullName);
                    setValue("parentPhone", p?.phone || "");
                  }}
                >
                  <option value="">No parent yet</option>
                  {parents.map((p) => (
                    <option key={p._id} value={p._id}>
                      {`${p.name} ${p.surname || ""}`.trim()}
                    </option>
                  ))}
                </select>
                {errors.parentName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.parentName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Phone
                </label>
                <input
                  type="tel"
                  {...register("parentPhone")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter parent phone"
                />
                {errors.parentPhone && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.parentPhone.message}
                  </p>
                )}
              </div>
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
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.status.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showViewModal && viewingStudent && (
        <Modal
          title="Student Details"
          onClose={() => {
            setShowViewModal(false);
            setViewingStudent(null);
          }}
          size="md"
          footer={
            <button
              onClick={() => {
                setShowViewModal(false);
                setViewingStudent(null);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Close
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-5 text-sm">
            {[
              "name",
              "email",
              "phone",
              "grade",
              "class",
              "parentName",
              "status",
              "enrollmentDate",
            ].map((k) => (
              <div key={k}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {k}
                </p>
                <p className="text-gray-800 font-medium break-words">
                  {viewingStudent[k] || "-"}
                </p>
              </div>
            ))}
            {viewingStudent.gpa !== null && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  GPA
                </p>
                <p className="text-gray-800 font-medium break-words">
                  {viewingStudent.gpa}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
// Refactored modal for linking existing student user with validation + dynamic dropdowns
const LinkExistingStudentModal = ({ onClose, onLinked }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(linkExistingStudentSchema),
    defaultValues: {
      username: "",
      name: "",
      surname: "",
      parentId: "",
      classId: "",
      gradeId: "",
      phone: "",
      address: "",
      sex: "",
      birthday: "",
      bloodType: "",
    },
  });

  const [unlinkedUsers, setUnlinkedUsers] = useState([]);
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState(null);
  const [showDebugErrors, setShowDebugErrors] = useState(() => {
    if (typeof window === "undefined") return false;
    const envFlag =
      typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_SHOW_LINK_ERRORS;
    if (envFlag === "true") return true;
    return localStorage.getItem("SHOW_LINK_ERRORS") === "true";
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [users, p, c, g] = await Promise.all([
          fetchUnlinkedStudentUsers(),
          fetchParents(),
          fetchClasses(),
          fetchGrades(),
        ]);
        if (!active) return;
        setUnlinkedUsers(Array.isArray(users) ? users : []);
        setParents(Array.isArray(p) ? p : []);
        setClasses(Array.isArray(c) ? c : []);
        setGrades(Array.isArray(g) ? g : []);
      } catch (e) {
        toast.error(e.message || "Failed to load dropdown data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onSubmitLink = async (values) => {
    setSubmitting(true);
    try {
      // Trim empty optional fields
      const payload = { ...values };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      setServerErrors(null);
      const created = await linkExistingStudentUser(payload);
      setUnlinkedUsers((prev) =>
        prev.filter((u) => u.username !== payload.username)
      );
      toast.success(`Linked student ${created?.name || values.name}`);
      onLinked?.();
      reset();
      onClose();
    } catch (e) {
      // Axios error format fallback support
      const data = e?.response?.data || e;
      const detail = {
        message: data.message || e.message || "Failed to link student",
        missingFields: data.missingFields,
        duplicateFields: data.duplicateFields,
        validationErrors: data.errors,
      };
      setServerErrors(detail);
      toast.error(detail.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Link Existing Student User"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            form="link-student-form"
            type="submit"
            disabled={submitting || loading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Linking..." : "Link Student"}
          </button>
        </>
      }
    >
      <form
        id="link-student-form"
        onSubmit={handleSubmit(onSubmitLink)}
        className="space-y-4"
      >
        {loading ? (
          <div className="text-sm text-gray-500">Loading data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serverErrors && showDebugErrors && (
              <div className="md:col-span-2 space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <div className="font-semibold text-red-800 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{serverErrors.message}</span>
                </div>
                {serverErrors.missingFields?.length > 0 && (
                  <div>
                    <span className="font-medium">Missing:</span>{" "}
                    {serverErrors.missingFields.join(", ")}
                  </div>
                )}
                {serverErrors.duplicateFields?.length > 0 && (
                  <div>
                    <span className="font-medium">Duplicates:</span>{" "}
                    {serverErrors.duplicateFields.join(", ")}
                  </div>
                )}
                {serverErrors.validationErrors?.length > 0 && (
                  <ul className="list-disc ml-5">
                    {serverErrors.validationErrors.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    className="text-[10px] underline text-red-600 hover:text-red-800"
                    onClick={() => setServerErrors(null)}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="text-[10px] underline text-gray-600 hover:text-gray-800"
                    onClick={() => {
                      const next = !showDebugErrors;
                      setShowDebugErrors(next);
                      try {
                        localStorage.setItem("SHOW_LINK_ERRORS", String(next));
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    {showDebugErrors ? "Hide Persistently" : "Show Errors"}
                  </button>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <select
                {...register("username")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a username</option>
                {unlinkedUsers.map((u) => (
                  <option key={u._id} value={u.username}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">
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
                {...register("name")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. John"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surname
              </label>
              <input
                type="text"
                {...register("surname")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Doe"
              />
              {errors.surname && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.surname.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent (optional)
              </label>
              <select
                {...register("parentId")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">No parent yet</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class *
              </label>
              <select
                {...register("classId")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.classId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade *
              </label>
              <select
                {...register("gradeId")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select grade</option>
                {grades.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {errors.gradeId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.gradeId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                {...register("phone")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Optional"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                {...register("address")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Street, City"
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sex
              </label>
              <select
                {...register("sex")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
              {errors.sex && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.sex.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birthday
              </label>
              <Controller
                name="birthday"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    value={value || ""}
                    onChange={(val) => onChange(val)}
                  />
                )}
              />
              {errors.birthday && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.birthday.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Type
              </label>
              <select
                {...register("bloodType")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  )
                )}
              </select>
              {errors.bloodType && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.bloodType.message}
                </p>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 pt-2">
          Email is taken from the existing user. Required fields marked with *.
          Empty optional fields are omitted.
        </p>
      </form>
    </Modal>
  );
};

export default Students;
