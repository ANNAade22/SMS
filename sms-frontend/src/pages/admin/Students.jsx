// src/pages/admin/Students.jsx
import { useState } from "react";
import useModal from "../../hooks/useModal";
import DeleteConfirm from "../../components/ui/DeleteConfirm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentAddSchema, studentEditSchema } from "../../utils/formSchemas";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import PermissionWrapper from "../../components/PermissionWrapper";
import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StudentForm from "../../components/students/StudentForm";
import DetailsList from "../../components/ui/DetailsList";
import { formatDateDisplay } from "../../utils/date";

// Helper: safely convert a YYYY-MM-DD (or any parseable) date string to canonical midnight ISO
function toMidnightISO(dateInput) {
  if (!dateInput) return undefined;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return undefined;
  // Force to date-only (no TZ shift side-effects): build from components
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
}

const Students = () => {
  // State hooks
  const addModal = useModal();
  const editModal = useModal();
  const viewModal = useModal();
  const deleteModal = useModal();
  const editingStudent = editModal.payload;
  const viewingStudent = viewModal.payload;
  const deletingStudent = deleteModal.payload;
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // React Query
  const queryClient = useQueryClient();

  // Fetch functions with authentication
  const fetchStudents = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/students`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch students: ${res.status}`);
    }

    const json = await res.json();
    // Backend returns data in nested structure: { data: { data: [...] } }
    const studentsData = json.data?.data || json.data || [];
    return Array.isArray(studentsData)
      ? studentsData.map((s) => ({
          id: s._id,
          name: `${s.name} ${s.surname || ""}`.trim(),
          email: s.email || "",
          phone: s.phone || "",
          username: s.username || "",
          address: s.address || "",
          bloodType: s.bloodType || "",
          sex: s.sex || "",
          birthday: s.birthday ? formatDateDisplay(s.birthday) : "",
          parentName: s.parent?.name || "Not Assigned",
          className: s.class?.name || "Not Assigned",
          // Use grade.name (fallback to Not Assigned). Keep key gradeName for table compatibility.
          gradeName: s.grade?.name || "Not Assigned",
          parentId: s.parent?._id || "",
          classId: s.class?._id || "",
          gradeId: s.grade?._id || "",
          createdAt: s.createdAt ? formatDateDisplay(s.createdAt) : "",
        }))
      : [];
  };

  const fetchParents = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/parents`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch parents: ${res.status}`);
    }

    const json = await res.json();
    return Array.isArray(json?.data?.data)
      ? json.data.data.map((p) => ({ id: p._id, name: p.name }))
      : [];
  };

  const fetchClasses = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch classes: ${res.status}`);
    }

    const json = await res.json();
    return Array.isArray(json?.data?.data)
      ? json.data.data.map((c) => ({ id: c._id, name: c.name }))
      : [];
  };

  const fetchGrades = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/grades`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized - Please login again");
      }
      throw new Error(`Failed to fetch grades: ${res.status}`);
    }

    const json = await res.json();
    return Array.isArray(json?.data?.data)
      ? json.data.data.map((g) => ({ id: g._id, name: g.name }))
      : [];
  };

  // Queries
  const {
    data: students = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: parents = [] } = useQuery({
    queryKey: ["parents"],
    queryFn: fetchParents,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: fetchClasses,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["grades"],
    queryFn: fetchGrades,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (studentId) => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/${studentId}`,
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
        throw new Error(`Failed to delete student: ${res.status}`);
      }

      return res.json();
    },
    onMutate: async (studentId) => {
      await queryClient.cancelQueries({ queryKey: ["students"] });
      const previous = queryClient.getQueryData(["students"]);
      queryClient.setQueryData(["students"], (old = []) =>
        old.filter((s) => s.id !== studentId)
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(["students"], context.previous);
      toast.error(error.message || "Failed to delete student");
    },
    onSuccess: () => {
      toast.success("Student deleted successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      deleteModal.close();
    },
  });

  // Form handling
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm({ resolver: zodResolver(studentAddSchema) });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm({ resolver: zodResolver(studentEditSchema) });

  // Handlers
  const handleAddStudent = async (data) => {
    setIsSubmittingAdd(true);
    try {
      // When adding a student via admin, we "link" an existing student user account
      // to a new Student profile. Backend expects username and classId/gradeId.
      const birthdayIso = toMidnightISO(data.birthday);
      const payload = {
        username: data.username, // required to link existing user (role=student)
        name: data.name,
        surname: data.surname,
        // email is sourced from the User on the server to avoid duplicates
        phone: data.phone || "",
        address: data.address,
        bloodType: data.bloodType || "A+",
        sex: data.sex,
        birthday: birthdayIso,
        parentId: data.parent || undefined,
        classId: data.class,
        gradeId: data.grade,
        linkExisting: true,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students`,
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
        const errorData = await res.json().catch(() => ({}));
        // Surface duplicate key context if provided by backend
        if (
          errorData?.message === "Duplicate key error" &&
          Array.isArray(errorData?.duplicateFields)
        ) {
          throw new Error(
            `Duplicate value for: ${errorData.duplicateFields.join(
              ", "
            )}. Adjust the existing records or choose a different user.`
          );
        }
        throw new Error(
          errorData?.message || `Failed to add student: ${res.status}`
        );
      }

      await res.json();
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student added successfully");
      addModal.close();
      resetAdd();
    } catch (error) {
      toast.error(error.message || "Failed to add student");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleEditStudent = async (data) => {
    setIsSubmittingEdit(true);
    try {
      if (!editingId) {
        toast.error("No student selected for edit (missing id)");
        return;
      }
      const birthdayIso = toMidnightISO(data.birthday);
      const payload = {
        name: data.name,
        surname: data.surname,
        email: data.email || "",
        phone: data.phone || "",
        address: data.address,
        bloodType: data.bloodType || "A+",
        sex: data.sex,
        birthday: birthdayIso,
        parent: data.parent,
        class: data.class,
        grade: data.grade,
      };

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/${editingId}`,
        {
          method: "PATCH",
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
          errorData.message || `Failed to update student: ${res.status}`
        );
      }

      await res.json();
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully");
      editModal.close();
      resetEdit();
      setEditingId(null);
    } catch (error) {
      toast.error(error.message || "Failed to update student");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // deletion handled via DeleteConfirm component and mutation

  const openEditModal = (student) => {
    if (!student) {
      toast.error("Unable to open edit modal: missing student data");
      return;
    }
    setEditingId(student.id || student._id || null);
    editModal.open(student);
    const parts = (student.name || "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const rest = parts.slice(1).join(" ");
    setValueEdit("name", first);
    setValueEdit("surname", rest);
    setValueEdit("email", student.email);
    setValueEdit("phone", student.phone);
    setValueEdit("username", student.username);
    setValueEdit("address", student.address);
    setValueEdit("bloodType", student.bloodType);
    setValueEdit("sex", (student.sex || "").toUpperCase());
    // Normalize birthday into YYYY-MM-DD (stored display value could be localized)
    if (student.birthday) {
      // Try to parse various possible formats
      const parsed = new Date(student.birthday);
      if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        setValueEdit("birthday", `${yyyy}-${mm}-${dd}`);
      } else {
        setValueEdit("birthday", "");
      }
    } else {
      setValueEdit("birthday", "");
    }
    setValueEdit("parent", student.parentId);
    setValueEdit("class", student.classId);
    setValueEdit("grade", student.gradeId);
  };

  // Table columns
  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone", sortable: false },
    { key: "username", label: "Username", sortable: true },
    { key: "parentName", label: "Parent", sortable: true },
    { key: "className", label: "Class", sortable: true },
    { key: "gradeName", label: "Grade", sortable: true },
    { key: "sex", label: "Gender", sortable: true },
    { key: "createdAt", label: "Enrollment Date", sortable: true },
  ];

  // Table actions
  const actions = [
    {
      label: "View",
      onClick: (student) => viewModal.open(student),
      className: "text-blue-600 hover:text-blue-800",
    },
    {
      label: "Edit",
      onClick: openEditModal,
      className: "text-yellow-600 hover:text-yellow-800",
    },
    {
      label: "Delete",
      onClick: (student) => deleteModal.open(student),
      className: "text-red-600 hover:text-red-800",
    },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Students Management
            </h1>
            <p className="text-gray-600 mt-1">Manage school students</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading students
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
      requiredPermission="view_students"
      fallbackMessage="You don't have permission to access the Students Management section. Only administrators with student management permissions can view this page."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Students Management
            </h1>
            <p className="text-gray-600 mt-1">Manage school students</p>
          </div>
          <button
            onClick={() => addModal.open()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Student
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="p-6 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <EnhancedTable
              data={students}
              columns={columns}
              actions={actions}
              title="Students"
            />
          )}
        </div>

        {/* Add Student Modal */}
        {addModal.isOpen && (
          <Modal
            title="Add Student"
            onClose={() => {
              addModal.close();
              resetAdd();
            }}
            size="lg"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => {
                    addModal.close();
                    resetAdd();
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  form="add-student-form"
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingAdd && (
                    <LoadingSpinner size="sm" color="white" />
                  )}
                  <span>Add</span>
                </button>
              </>
            }
          >
            <StudentForm
              id="add-student-form"
              onSubmit={handleSubmitAdd(handleAddStudent)}
              register={registerAdd}
              errors={errorsAdd}
              isSubmitting={isSubmittingAdd}
              parents={parents}
              classes={classes}
              grades={grades}
              mode="add"
            />
          </Modal>
        )}

        {/* Edit Student Modal */}
        {editModal.isOpen && editingStudent && (
          <Modal
            title="Edit Student"
            onClose={() => {
              editModal.close();
              resetEdit();
              setEditingId(null);
            }}
            size="lg"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => {
                    editModal.close();
                    resetEdit();
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  form="edit-student-form"
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingEdit && (
                    <LoadingSpinner size="sm" color="white" />
                  )}
                  <span>Update</span>
                </button>
              </>
            }
          >
            <StudentForm
              id="edit-student-form"
              onSubmit={handleSubmitEdit(handleEditStudent)}
              register={registerEdit}
              errors={errorsEdit}
              isSubmitting={isSubmittingEdit}
              parents={parents}
              classes={classes}
              grades={grades}
              mode="edit"
            />
          </Modal>
        )}

        <DeleteConfirm
          isOpen={deleteModal.isOpen && !!deletingStudent}
          onClose={deleteModal.close}
          onConfirm={() => {
            if (!deletingStudent) return;
            setIsDeleting(true);
            deleteMutation.mutate(deletingStudent.id, {
              onSettled: () => setIsDeleting(false),
            });
          }}
          title="Delete Student"
          message={
            deletingStudent ? (
              <span>
                Are you sure you want to delete{" "}
                <strong>{deletingStudent.name}</strong>? This action cannot be
                undone.
              </span>
            ) : (
              "Confirm deletion?"
            )
          }
          loading={isDeleting || deleteMutation.isPending}
        />

        {viewModal.isOpen && viewingStudent && (
          <Modal
            title="Student Details"
            size="md"
            onClose={viewModal.close}
            footer={
              <button
                type="button"
                onClick={viewModal.close}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Close
              </button>
            }
          >
            <DetailsList
              fields={[
                { label: "Name", value: viewingStudent.name },
                {
                  label: "Email",
                  value: viewingStudent.email || "Not provided",
                },
                {
                  label: "Phone",
                  value: viewingStudent.phone || "Not provided",
                },
                { label: "Username", value: viewingStudent.username },
                { label: "Parent", value: viewingStudent.parentName },
                { label: "Class", value: viewingStudent.className },
                { label: "Grade", value: viewingStudent.gradeName },
                { label: "Gender", value: viewingStudent.sex },
                { label: "Birthday", value: viewingStudent.birthday },
                { label: "Enrollment Date", value: viewingStudent.createdAt },
              ]}
            />
          </Modal>
        )}
      </div>
    </PermissionWrapper>
  );
};

export default Students;
