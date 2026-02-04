// src/pages/admin/Teachers.jsx
import { useState, useMemo, useEffect } from "react";
import useModal from "../../hooks/useModal";
import DeleteConfirm from "../../components/ui/DeleteConfirm";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  teacherFormSchema,
  linkExistingTeacherSchema,
} from "../../utils/formSchemas";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import PermissionWrapper from "../../components/PermissionWrapper";
import EnhancedTable from "../../components/EnhancedTable";
import DetailsList from "../../components/ui/DetailsList";
import { formatDateDisplay } from "../../utils/date";
import Modal from "../../components/ui/Modal";
import FormField from "../../components/ui/FormField";
import { toLabel, toLabelArray } from "../../utils/labels";
import ErrorBoundary from "../../components/ErrorBoundary";

const Teachers = () => {
  // Modal hooks
  const addModal = useModal();
  const editModal = useModal();
  const viewModal = useModal();
  const deleteModal = useModal();
  const editingTeacher = editModal.payload;
  const viewingTeacher = viewModal.payload;
  const deletingTeacher = deleteModal.payload;
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Query
  const queryClient = useQueryClient();

  // Clear legacy cache keys that may hold object-shaped records from other pages
  useEffect(() => {
    try {
      queryClient.removeQueries({
        queryKey: ["admin-subject-names"],
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: ["admin-class-names"],
        exact: true,
      });
    } catch {
      // no-op
    }
  }, [queryClient]);

  // Fetch functions with authentication
  const fetchTeachers = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/teachers`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

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
            ? toLabelArray(t.subjects)
                .map((s) => String(s))
                .filter(Boolean)
            : [];
          const expNum =
            typeof t.experience === "number"
              ? t.experience
              : Number(t.experience) || 0;
          return {
            id: t._id,
            name: `${t.name} ${t.surname || ""}`.trim(),
            email: t.email,
            phone: t.phone || "",
            subject: subjectNames.join(", ") || "Not Assigned",
            subjects: subjectNames,
            department: toLabel(t.department || "General"),
            qualification: toLabel(t.qualification || "Not Specified"),
            experience: `${expNum} years`,
            experienceNumber: expNum,
            status: toLabel(
              t.status ||
                (t.userId?.isActive !== undefined
                  ? t.userId.isActive
                    ? "Active"
                    : "Inactive"
                  : "Active")
            ),
            hireDate: t.hireDate
              ? new Date(t.hireDate).toLocaleDateString()
              : "Not Set",
            classes: Array.isArray(t.classes)
              ? toLabelArray(t.classes)
                  .map((c) => String(c))
                  .filter(Boolean)
              : [],
            officeHours: t.officeHours || "Not Set",
            username: t.userId?.username || t.username || "",
            active: t.userId?.isActive !== undefined ? t.userId.isActive : true,
          };
        })
      : [];
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
      ? json.data.data.map((s) => s.name)
      : [];
  };
  const fetchClasses = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      if (res.status === 401)
        throw new Error("Unauthorized - Please login again");
      throw new Error(`Failed to fetch classes: ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data?.data) ? json.data.data : [];
    return list.map((c) => c.name).filter(Boolean);
  };

  // Queries
  const fetchUnlinkedTeacherUsers = async () => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/users?role=teacher&unlinked=true`,
      {
        headers: { "Content-Type": "application/json" },
      }
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
  const {
    data: teachers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: fetchTeachers,
    // Always refetch on page mount/focus to avoid stale cache across navigation
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin/teachers/subject-names"],
    queryFn: fetchSubjects,
    select: (arr) =>
      Array.isArray(arr) ? arr.map((v) => toLabel(v)).filter(Boolean) : [],
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 60 * 1000,
  });
  const { data: classNames = [] } = useQuery({
    queryKey: ["admin/teachers/class-names"],
    queryFn: fetchClasses,
    select: (arr) =>
      Array.isArray(arr) ? arr.map((v) => toLabel(v)).filter(Boolean) : [],
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 60 * 1000,
  });

  const { data: unlinkedTeacherUsers = [] } = useQuery({
    queryKey: ["unlinked-teacher-users"],
    queryFn: fetchUnlinkedTeacherUsers,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 60 * 1000,
  });

  // (debug exposure removed)
  useEffect(() => {}, []);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (teacherId) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/${teacherId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        throw new Error(`Failed to delete teacher: ${res.status}`);
      }

      return res.json();
    },
    // Optimistic update
    onMutate: async (teacherId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-teachers"] });
      const previous = queryClient.getQueryData(["admin-teachers"]);
      queryClient.setQueryData(["admin-teachers"], (old = []) =>
        old.filter((t) => t.id !== teacherId)
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-teachers"], context.previous);
      }
      toast.error(error.message || "Failed to delete teacher");
    },
    onSuccess: () => {
      toast.success("Teacher deleted successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
      deleteModal.close();
    },
  });

  // Form handling
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm({ resolver: zodResolver(linkExistingTeacherSchema) });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    watch: watchEdit,
    formState: { errors: errorsEdit },
  } = useForm({ resolver: zodResolver(teacherFormSchema) });

  // Handlers
  const handleAddTeacher = async (data) => {
    setIsSubmittingAdd(true);
    try {
      // Build payload to link an existing teacher user by username
      const payload = {
        username: data.username, // required
        name: data.name,
        surname: data.surname,
        address: data.address,
        sex: data.sex,
        birthday: data.birthday,
        phone: data.phone || undefined,
        bloodType: data.bloodType,
        subjects: Array.isArray(data.subjects)
          ? data.subjects.filter(Boolean)
          : data.subjects
          ? [data.subjects]
          : undefined,
        classes: Array.isArray(data.classes)
          ? data.classes.filter(Boolean)
          : data.classes
          ? [data.classes]
          : undefined,
        department: data.department || undefined,
        qualification: data.qualification || undefined,
        experience: data.experience ? Number(data.experience) : 0,
        hireDate: data.hireDate || undefined,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        const errorData = await res.json();
        throw new Error(
          errorData.message || `Failed to add teacher: ${res.status}`
        );
      }

      await res.json();
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-teacher-users"] });
      toast.success("Teacher linked successfully");
      addModal.close();
      resetAdd();
    } catch (error) {
      toast.error(error.message || "Failed to add teacher");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleEditTeacher = async (data) => {
    setIsSubmittingEdit(true);
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/${editingTeacher.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        const errorData = await res.json();
        throw new Error(
          errorData.message || `Failed to update teacher: ${res.status}`
        );
      }

      await res.json();
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
      toast.success("Teacher updated successfully");
      editModal.close();
      resetEdit();
    } catch (error) {
      toast.error(error.message || "Failed to update teacher");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openEditModal = (teacher) => {
    editModal.open(teacher);
    const parts = (teacher.name || "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const rest = parts.slice(1).join(" ");
    setValueEdit("name", first);
    setValueEdit("surname", rest);
    setValueEdit("email", teacher.email);
    setValueEdit("phone", teacher.phone);
    // Pre-fill multi-selects
    if (Array.isArray(teacher.subjects)) {
      setValueEdit("subjects", teacher.subjects);
    }
    if (Array.isArray(teacher.classes)) {
      setValueEdit("classes", teacher.classes);
    }
    setValueEdit("department", teacher.department);
    setValueEdit("qualification", teacher.qualification);
    setValueEdit(
      "experience",
      typeof teacher.experienceNumber === "number"
        ? teacher.experienceNumber
        : parseInt(String(teacher.experience).replace(/[^0-9]/g, "")) || 0
    );
    setValueEdit("status", teacher.status);
  };

  // Table columns
  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "phone", label: "Phone", sortable: false },
      { key: "username", label: "Username", sortable: true },
      { key: "subjectsLabel", label: "Subjects", sortable: false },
      { key: "experience", label: "Experience", sortable: true },
      { key: "department", label: "Department", sortable: true },
      { key: "classesLabel", label: "Classes", sortable: false },
      { key: "status", label: "Status", sortable: true },
      { key: "hireDate", label: "Hire Date", sortable: true },
    ],
    []
  );

  // Table actions
  const actions = [
    {
      label: "View",
      onClick: (teacher) => viewModal.open(teacher),
      className: "text-blue-600 hover:text-blue-800",
    },
    {
      label: "Edit",
      onClick: openEditModal,
      className: "text-yellow-600 hover:text-yellow-800",
    },
    {
      label: "Delete",
      onClick: (teacher) => deleteModal.open(teacher),
      className: "text-red-600 hover:text-red-800",
    },
  ];

  const safeTeachers = useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    return teachers.map((t) => ({
      ...t,
      name: toLabel(t.name),
      email: toLabel(t.email),
      phone: toLabel(t.phone),
      username: toLabel(t.username),
      status: toLabel(t.status),
      department: toLabel(t.department),
      qualification: toLabel(t.qualification),
      subject: toLabel(t.subject),
      subjects: Array.isArray(t.subjects)
        ? t.subjects.map((s) => toLabel(s))
        : [],
      classes: Array.isArray(t.classes) ? t.classes.map((c) => toLabel(c)) : [],
      subjectsLabel: Array.isArray(t.subjects)
        ? t.subjects
            .map((s) => toLabel(s))
            .filter(Boolean)
            .join(", ") || "Not Assigned"
        : toLabel(t.subject) || "Not Assigned",
      classesLabel: Array.isArray(t.classes)
        ? t.classes
            .map((c) => toLabel(c))
            .filter(Boolean)
            .join(", ") || "No classes"
        : toLabel(t.classes) || "No classes",
    }));
  }, [teachers]);

  // (diagnostics removed)
  useEffect(() => {}, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teachers Management
            </h1>
            <p className="text-gray-600 mt-1">Manage school teachers</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading teachers
              </h3>
              <div className="mt-2 text-sm text-red-700">{error.message}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionWrapper
      requiredPermission="view_teachers"
      fallbackMessage="You don't have permission to access the Teachers Management section. Only administrators with teacher management permissions can view this page."
    >
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Teachers Management
              </h1>
              <p className="text-gray-600 mt-1">Manage school teachers</p>
            </div>
            <button
              onClick={() => addModal.open()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Link Existing User
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            <EnhancedTable
              data={safeTeachers}
              columns={columns}
              actions={actions}
              isLoading={isLoading}
              title="Teachers"
              searchPlaceholder="Search teachers..."
              filterable={false}
            />
          </div>

          {addModal.isOpen && (
            <Modal
              title="Link Existing Teacher User"
              onClose={addModal.close}
              size="lg"
              footer={
                <>
                  <button
                    type="button"
                    onClick={addModal.close}
                    className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    form="create-teacher-form"
                    type="submit"
                    disabled={isSubmittingAdd}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md"
                  >
                    {isSubmittingAdd && (
                      <LoadingSpinner size="sm" color="white" />
                    )}
                    <span>Link Teacher</span>
                  </button>
                </>
              }
            >
              <form
                id="create-teacher-form"
                onSubmit={handleSubmitAdd(handleAddTeacher)}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    label="Username (existing teacher user)"
                    name="username"
                    as="select"
                    options={unlinkedTeacherUsers}
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="First Name"
                    name="name"
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Last Name"
                    name="surname"
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Address"
                    name="address"
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Gender"
                    name="sex"
                    as="select"
                    options={[
                      { value: "MALE", label: "Male" },
                      { value: "FEMALE", label: "Female" },
                    ]}
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Date of Birth"
                    name="birthday"
                    type="date"
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Blood Type"
                    name="bloodType"
                    as="select"
                    options={[
                      "A+",
                      "A-",
                      "B+",
                      "B-",
                      "AB+",
                      "AB-",
                      "O+",
                      "O-",
                    ].map((g) => ({ value: g, label: g }))}
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Phone"
                    name="phone"
                    register={registerAdd}
                    errors={errorsAdd}
                  />
                  <FormField
                    label="Subjects"
                    name="subjects"
                    as="select"
                    multiple
                    options={subjects.map((s) => ({ value: s, label: s }))}
                    register={registerAdd}
                    errors={errorsAdd}
                  />
                  <FormField
                    label="Classes"
                    name="classes"
                    as="select"
                    multiple
                    options={classNames.map((n) => ({ value: n, label: n }))}
                    register={registerAdd}
                    errors={errorsAdd}
                  />
                  <FormField
                    label="Department"
                    name="department"
                    register={registerAdd}
                    errors={errorsAdd}
                  />
                  <FormField
                    label="Qualification"
                    name="qualification"
                    register={registerAdd}
                    errors={errorsAdd}
                  />
                  <FormField
                    label="Experience (Years)"
                    name="experience"
                    type="number"
                    register={registerAdd}
                    errors={errorsAdd}
                    required
                  />
                  <FormField
                    label="Hire Date"
                    name="hireDate"
                    type="date"
                    register={registerAdd}
                    errors={errorsAdd}
                  />
                </div>
              </form>
            </Modal>
          )}

          {editModal.isOpen && editingTeacher && (
            <Modal
              title="Edit Teacher"
              onClose={() => {
                editModal.close();
                resetEdit();
              }}
              size="lg"
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => {
                      editModal.close();
                      resetEdit();
                    }}
                    className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    form="edit-teacher-form"
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md"
                  >
                    {isSubmittingEdit && (
                      <LoadingSpinner size="sm" color="white" />
                    )}
                    <span>Update</span>
                  </button>
                </>
              }
            >
              <form
                id="edit-teacher-form"
                onSubmit={handleSubmitEdit(handleEditTeacher)}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                <FormField
                  label="First Name"
                  name="name"
                  register={registerEdit}
                  errors={errorsEdit}
                  required
                  value={watchEdit("name") || ""}
                />
                <FormField
                  label="Last Name"
                  name="surname"
                  register={registerEdit}
                  errors={errorsEdit}
                  required
                  value={watchEdit("surname") || ""}
                />
                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  register={registerEdit}
                  errors={errorsEdit}
                  required
                  value={watchEdit("email") || ""}
                />
                <FormField
                  label="Phone"
                  name="phone"
                  register={registerEdit}
                  errors={errorsEdit}
                  value={watchEdit("phone") || ""}
                />
                <FormField
                  label="Subjects"
                  name="subjects"
                  as="select"
                  multiple
                  options={subjects.map((s) => ({ value: s, label: s }))}
                  register={registerEdit}
                  errors={errorsEdit}
                  value={watchEdit("subjects") || []}
                />
                <FormField
                  label="Classes"
                  name="classes"
                  as="select"
                  multiple
                  options={classNames.map((n) => ({ value: n, label: n }))}
                  register={registerEdit}
                  errors={errorsEdit}
                  value={watchEdit("classes") || []}
                />
                <FormField
                  label="Department"
                  name="department"
                  register={registerEdit}
                  errors={errorsEdit}
                  value={watchEdit("department") || ""}
                />
                <FormField
                  label="Qualification"
                  name="qualification"
                  register={registerEdit}
                  errors={errorsEdit}
                  value={watchEdit("qualification") || ""}
                />
                <FormField
                  label="Experience (Years)"
                  name="experience"
                  type="number"
                  register={registerEdit}
                  errors={errorsEdit}
                  required
                  value={watchEdit("experience") ?? 0}
                />
                <FormField
                  label="Status"
                  name="status"
                  register={registerEdit}
                  errors={errorsEdit}
                  value={watchEdit("status") || ""}
                />
              </form>
            </Modal>
          )}

          {viewModal.isOpen && viewingTeacher && (
            <Modal
              title="Teacher Details"
              onClose={viewModal.close}
              size="md"
              footer={
                <button
                  onClick={viewModal.close}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow"
                >
                  Close
                </button>
              }
            >
              <DetailsList
                fields={[
                  { label: "Name", value: viewingTeacher.name },
                  { label: "Email", value: viewingTeacher.email },
                  {
                    label: "Phone",
                    value: viewingTeacher.phone || "Not provided",
                  },
                  { label: "Subject", value: viewingTeacher.subject },
                  { label: "Department", value: viewingTeacher.department },
                  { label: "Status", value: viewingTeacher.status },
                  {
                    label: "Hire Date",
                    value: formatDateDisplay(viewingTeacher.hireDate),
                  },
                ]}
              />
            </Modal>
          )}

          <DeleteConfirm
            isOpen={deleteModal.isOpen && !!deletingTeacher}
            onClose={deleteModal.close}
            onConfirm={() => {
              if (!deletingTeacher) return;
              setIsDeleting(true);
              deleteMutation.mutate(deletingTeacher.id, {
                onSettled: () => setIsDeleting(false),
              });

              // Unlinked teacher users for username dropdown
            }}
            title="Delete Teacher"
            message={
              deletingTeacher ? (
                <span>
                  Are you sure you want to delete{" "}
                  <strong>{deletingTeacher.name}</strong>? This action cannot be
                  undone.
                </span>
              ) : (
                "Confirm deletion?"
              )
            }
            loading={isDeleting || deleteMutation.isPending}
          />
        </div>
      </ErrorBoundary>
    </PermissionWrapper>
  );
};

export default Teachers;
