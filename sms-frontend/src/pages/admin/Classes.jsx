import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classFormSchema } from "../../utils/formSchemas";
import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import FormField from "../../components/ui/FormField";
import useModal from "../../hooks/useModal";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";
import PermissionWrapper from "../../components/PermissionWrapper";
import { useAuth } from "../../hooks/useAuth";

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const addModal = useModal();
  const editModal = useModal();
  const viewModal = useModal();
  const deleteModal = useModal();
  const editing = editModal.payload;
  const { hasPermission, user } = useAuth();

  // Debug permissions
  console.log("Classes page - User:", user);
  console.log("Classes page - User role:", user?.role);
  console.log(
    "Classes page - User permissions:",
    localStorage.getItem("userPermissions")
  );
  console.log(
    "Classes page - Has view_classes permission:",
    hasPermission("view_classes")
  );

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";
  console.log("Classes page - Is super admin:", isSuperAdmin);
  const viewing = viewModal.payload;
  const deleting = deleteModal.payload;
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClasses = async () => {
    try {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data?.data) ? json.data.data : [];
      setClasses(
        list.map((c) => ({
          id: c._id,
          name: c.name,
          grade: c.grade?.name || c.grade || "",
          supervisor: c.supervisor?.name
            ? `${c.supervisor.name} ${c.supervisor.surname || ""}`.trim()
            : c.supervisor || "",
          capacity: Number.isFinite(c.capacity) ? c.capacity : 0,
          students: Array.isArray(c.students) ? c.students : [],
          created: c.createdAt
            ? new Date(c.createdAt).toLocaleDateString()
            : "",
        }))
      );
    } catch (e) {
      toast.error(e.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm({ resolver: zodResolver(classFormSchema) });
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue,
    formState: { errors: errorsEdit },
  } = useForm({ resolver: zodResolver(classFormSchema) });

  const onAdd = async (data) => {
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create class");
      toast.success("Class created");
      addModal.close();
      resetAdd();
      fetchClasses();
    } catch (e) {
      toast.error(e.message || "Failed to create class");
    }
  };

  const onEdit = async (data) => {
    if (!editing) return;
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes/${editing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update class");
      toast.success("Class updated");
      editModal.close();
      resetEdit();
      fetchClasses();
    } catch (e) {
      toast.error(e.message || "Failed to update class");
    }
  };

  const openEdit = useCallback(
    (row) => {
      editModal.open(row);
      ["name", "grade", "teacher"].forEach((k) => setValue(k, row[k] ?? ""));
    },
    [editModal, setValue]
  );

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes/${deleting.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Failed to delete class");
      }
      toast.success("Class deleted");
      deleteModal.close();
      fetchClasses();
    } catch (e) {
      toast.error(e.message || "Failed to delete class");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "grade", label: "Grade", sortable: true },
      {
        key: "students",
        label: "Enrolled",
        sortable: true,
        render: (value, row) => {
          const enrolled = Array.isArray(value) ? value.length : 0;
          const cap = Number.isFinite(row.capacity) ? row.capacity : 0;
          const pct =
            cap > 0 ? Math.min(100, Math.max(0, (enrolled / cap) * 100)) : 0;
          let barColor = "bg-indigo-500";
          if (pct >= 90) barColor = "bg-red-500";
          else if (pct >= 75) barColor = "bg-yellow-500";
          return (
            <div className="w-32" title={`${Math.round(pct)}% full`}>
              <div className="flex justify-between text-[11px] font-medium mb-0.5">
                <span>{enrolled}</span>
                <span>{cap}</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      { key: "created", label: "Created", sortable: true },
    ],
    []
  );
  const actions = useMemo(
    () => [
      {
        label: "View",
        onClick: (r) => viewModal.open(r),
        className: "text-blue-600 hover:text-blue-800",
      },
      {
        label: "Edit",
        onClick: openEdit,
        className: "text-yellow-600 hover:text-yellow-800",
      },
      {
        label: "Delete",
        onClick: (r) => deleteModal.open(r),
        className: "text-red-600 hover:text-red-800",
      },
    ],
    [openEdit, viewModal, deleteModal]
  );

  // Direct permission check for debugging
  if (!hasPermission("view_classes")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Classes Management section.
            Only administrators with class management permissions can view this
            page.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">User Role: {user?.role}</p>
            <p className="text-sm text-gray-500">
              Has view_classes: {hasPermission("view_classes") ? "Yes" : "No"}
            </p>
            <p className="text-sm text-gray-500">
              Is Super Admin: {isSuperAdmin ? "Yes" : "No"}
            </p>
            <p className="text-sm text-gray-500">
              User Permissions: {localStorage.getItem("userPermissions")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600 mt-1">Manage classes</p>
        </div>
        <button
          onClick={() => addModal.open()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Class
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm">
        <EnhancedTable
          data={classes}
          columns={columns}
          actions={actions}
          isLoading={loading}
          title="Classes"
          filterable={false}
        />
      </div>

      {addModal.isOpen && (
        <Modal
          title="Create Class"
          onClose={() => {
            addModal.close();
            resetAdd();
          }}
          size="lg"
          footer={
            <>
              <button
                onClick={() => {
                  addModal.close();
                  resetAdd();
                }}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                form="add-class-form"
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Create
              </button>
            </>
          }
        >
          <form
            id="add-class-form"
            onSubmit={handleSubmitAdd(onAdd)}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <FormField
              label="Name"
              name="name"
              register={registerAdd}
              errors={errorsAdd}
              required
            />
            <FormField
              label="Grade"
              name="grade"
              register={registerAdd}
              errors={errorsAdd}
              required
            />
            <FormField
              label="Teacher"
              name="teacher"
              register={registerAdd}
              errors={errorsAdd}
              required
            />
          </form>
        </Modal>
      )}

      {editModal.isOpen && editing && (
        <Modal
          title="Edit Class"
          onClose={() => {
            editModal.close();
            resetEdit();
          }}
          size="lg"
          footer={
            <>
              <button
                onClick={() => {
                  editModal.close();
                  resetEdit();
                }}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                form="edit-class-form"
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Update
              </button>
            </>
          }
        >
          <form
            id="edit-class-form"
            onSubmit={handleSubmitEdit(onEdit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <FormField
              label="Name"
              name="name"
              register={registerEdit}
              errors={errorsEdit}
              required
            />
            <FormField
              label="Grade"
              name="grade"
              register={registerEdit}
              errors={errorsEdit}
              required
            />
            <FormField
              label="Teacher"
              name="teacher"
              register={registerEdit}
              errors={errorsEdit}
              required
            />
          </form>
        </Modal>
      )}

      {viewModal.isOpen && viewing && (
        <Modal
          title="Class Details"
          onClose={() => viewModal.close()}
          size="md"
          footer={
            <button
              onClick={viewModal.close}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Close
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 text-sm">
            {["name", "grade", "teacher", "created"].map((k) => (
              <div key={k}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {k}
                </p>
                <p className="text-gray-800 font-medium break-words">
                  {viewing[k]}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {deleteModal.isOpen && deleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Delete Class</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleting.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={deleteModal.close}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
