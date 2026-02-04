import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import DetailsList from "../../components/ui/DetailsList";
import { formatDateDisplay } from "../../utils/date";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  parentAdminEditSchema,
  linkExistingParentSchema,
} from "../../utils/formSchemas";
import { toast } from "react-toastify";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import FormField from "../../components/ui/FormField";
import useModal from "../../hooks/useModal";
import PermissionWrapper from "../../components/PermissionWrapper";

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

const Parents = () => {
  const queryClient = useQueryClient();
  // Modal hooks reduce boolean clutter
  const addModal = useModal();
  const editModal = useModal();
  const viewModal = useModal();
  const deleteModal = useModal();
  const editingParent = editModal.payload;
  const viewingParent = viewModal.payload;
  const deletingParent = deleteModal.payload;
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [allowReassign, setAllowReassign] = useState(true);
  const [studentPage, setStudentPage] = useState(1);
  const STUDENT_PAGE_SIZE = 50;
  // Cache for unlinked parent users then used in select
  const fetchUnlinkedParentUsers = async () => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/users?role=parent&unlinked=true`
    );
    if (!res.ok) {
      if (res.status === 401)
        throw new Error("Unauthorized - Please login again");
      throw new Error(`Failed to fetch unlinked parent users: ${res.status}`);
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
        email: u.email,
      }))
      .filter((opt) => {
        if (!opt.value || seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
  };

  const fetchParents = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/parents`);
    if (!res.ok) {
      if (res.status === 401)
        throw new Error("Unauthorized - Please login again");
      throw new Error(`Failed to fetch parents: ${res.status}`);
    }
    const json = await res.json();
    const parentsData = json.data?.data || json.data || [];
    return Array.isArray(parentsData)
      ? parentsData.map((p) => ({
          id: p._id,
          name: `${p.name} ${p.surname || ""}`.trim(),
          email: p.email,
          phone: p.phone || "",
          address: p.address || "",
          username: p.username?.username || p.username || "",
          students: (p.students || []).map((s) => s.name).filter(Boolean),
          createdAt: p.createdAt
            ? new Date(p.createdAt).toLocaleDateString()
            : "",
        }))
      : [];
  };
  const {
    data: parents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["parents"],
    queryFn: fetchParents,
    staleTime: 5 * 60 * 1000,
  });

  const fetchStudents = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/students`);
    if (!res.ok) throw new Error(`Failed to fetch students: ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json?.data?.data) ? json.data.data : [];
    return list.map((s) => ({
      id: s._id,
      name: `${s.name} ${s.surname || ""}`.trim(),
      username: s.username || "",
      parent: s.parent || null,
    }));
  };
  const {
    data: students = [],
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ["students", "for-parent-assignment"],
    queryFn: fetchStudents,
    staleTime: 5 * 60 * 1000,
    enabled: addModal.isOpen,
  });
  const { data: unlinkedParentUsers = [] } = useQuery({
    queryKey: ["unlinked-parent-users"],
    queryFn: fetchUnlinkedParentUsers,
    staleTime: 5 * 60 * 1000,
    enabled: addModal.isOpen,
  });

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm({ resolver: zodResolver(linkExistingParentSchema) });
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm({ resolver: zodResolver(parentAdminEditSchema) });

  const handleAddParent = async (data) => {
    setIsSubmittingAdd(true);
    try {
      if (!allowReassign) {
        const reassigned = students.filter(
          (s) => selectedStudentIds.includes(s.id) && s.parent
        );
        if (reassigned.length) {
          toast.error(
            `${reassigned.length} selected student(s) already belong to another parent. Enable reassignment to proceed.`
          );
          setIsSubmittingAdd(false);
          return;
        }
      }
      // Link flow: backend will look up User by username and attach email
      const parentPayload = {
        username: data.username,
        name: data.name,
        surname: data.surname || "",
        phone: data.phone || "",
        address: data.address || "",
      };
      const parentRes = await authService.authFetch(
        `${API_BASE_URL}/api/v1/parents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parentPayload),
        }
      );
      const parentJson = await parentRes.json();
      if (!parentRes.ok)
        throw new Error(parentJson.message || "Failed to create parent");

      const newParentId = parentJson?.data?.data?._id;
      if (newParentId && selectedStudentIds.length) {
        const assignRes = await authService.authFetch(
          `${API_BASE_URL}/api/v1/parents/${newParentId}/assign-students`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentIds: selectedStudentIds,
              allowReassign,
            }),
          }
        );
        if (!assignRes.ok) {
          const aJson = await assignRes.json().catch(() => ({}));
          toast.warning(
            aJson.message || "Parent created but student assignment failed"
          );
        } else {
          const reassignedCount = students.filter(
            (s) => selectedStudentIds.includes(s.id) && s.parent
          ).length;
          const total = selectedStudentIds.length;
          const suffix = reassignedCount
            ? ` (${reassignedCount} reassigned)`
            : "";
          toast.info(
            `Assigned ${total} student${total !== 1 ? "s" : ""}${suffix}`
          );
        }
      }

      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-parent-users"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Parent added successfully");
      addModal.close();
      resetAdd();
      setSelectedStudentIds([]);
      setStudentSearch("");
      setStudentPage(1);
      setAllowReassign(true);
    } catch (e) {
      toast.error(e.message || "Failed to add parent");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleEditParent = async (data) => {
    if (!editingParent) return;
    setIsSubmittingEdit(true);
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/parents/${editingParent.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            surname: data.surname,
            email: data.email,
            phone: data.phone,
            address: data.address,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update parent");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent updated successfully");
      editModal.close();
      resetEdit();
    } catch (e) {
      toast.error(e.message || "Failed to update parent");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteParent = async () => {
    if (!deletingParent) return;
    setIsDeleting(true);
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/parents/${deletingParent.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent deleted successfully");
      deleteModal.close();
    } catch (e) {
      toast.error(e.message || "Failed to delete parent");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = useCallback(
    (parent) => {
      editModal.open(parent);
      const parts = (parent.name || "").trim().split(/\s+/).filter(Boolean);
      const first = parts[0] || "";
      const rest = parts.slice(1).join(" ");
      setValueEdit("name", first);
      setValueEdit("surname", rest);
      setValueEdit("email", parent.email);
      setValueEdit("phone", parent.phone);
      setValueEdit("address", parent.address);
    },
    [editModal, setValueEdit]
  );

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "phone", label: "Phone", sortable: true },
      { key: "username", label: "Username", sortable: true },
      {
        key: "students",
        label: "Students",
        sortable: false,
        render: (value) => (
          <div className="flex flex-wrap gap-1">
            {value && value.length ? (
              value.map((s, i) => (
                <span
                  key={i}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                >
                  {String(s)}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-xs">None</span>
            )}
          </div>
        ),
      },
      { key: "createdAt", label: "Created", sortable: true },
    ],
    []
  );

  const actions = useMemo(
    () => [
      {
        label: "View",
        onClick: (p) => {
          viewModal.open(p);
        },
        className: "text-blue-600 hover:text-blue-800",
      },
      {
        label: "Edit",
        onClick: openEditModal,
        className: "text-yellow-600 hover:text-yellow-800",
      },
      {
        label: "Delete",
        onClick: (p) => {
          deleteModal.open(p);
        },
        className: "text-red-600 hover:text-red-800",
      },
    ],
    [openEditModal, viewModal, deleteModal]
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parents</h1>
            <p className="text-gray-600 mt-1">Manage parents</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading parents
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
      requiredPermission="view_parents"
      fallbackMessage="You don't have permission to access the Parents Management section. Only administrators with parent management permissions can view this page."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parents</h1>
            <p className="text-gray-600 mt-1">Manage parents</p>
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
            data={parents}
            columns={columns}
            actions={actions}
            isLoading={isLoading}
            title="Parents"
            pageSize={25}
            filterable={false}
          />
        </div>

        {addModal.isOpen && (
          <Modal
            title="Link Existing Parent User"
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
                  form="create-parent-form"
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {isSubmittingAdd && (
                    <LoadingSpinner size="sm" color="white" />
                  )}
                  <span>Link Parent</span>
                </button>
              </>
            }
          >
            <form
              id="create-parent-form"
              onSubmit={handleSubmitAdd(handleAddParent)}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  label="Username (existing parent user)"
                  name="username"
                  as="select"
                  options={unlinkedParentUsers}
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
                {/* Email is sourced from the existing user; not shown here */}
                <FormField
                  label="Phone"
                  name="phone"
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
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                      S
                    </span>
                    Assign Existing Students
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    {selectedStudentIds.length} selected
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setStudentPage(1);
                    }}
                    placeholder="Search students by name or username..."
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white shadow-sm"
                  />
                  <label className="flex items-center gap-2 text-[11px] bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowReassign}
                      onChange={(e) => setAllowReassign(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-600">Allow reassignment</span>
                  </label>
                </div>
                {studentsError && (
                  <div className="text-xs text-red-600">
                    Failed to load students
                  </div>
                )}
                {(() => {
                  const filtered = students.filter((s) => {
                    const term = studentSearch.toLowerCase();
                    return (
                      !term ||
                      s.name.toLowerCase().includes(term) ||
                      s.username.toLowerCase().includes(term)
                    );
                  });
                  const totalPages = Math.ceil(
                    filtered.length / STUDENT_PAGE_SIZE
                  );
                  const page = Math.min(studentPage, totalPages || 1);
                  if (page !== studentPage) setStudentPage(page);
                  const sliceStart = (page - 1) * STUDENT_PAGE_SIZE;
                  const pageItems = filtered.slice(
                    sliceStart,
                    sliceStart + STUDENT_PAGE_SIZE
                  );
                  return (
                    <div className="space-y-2">
                      <div className="border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white p-3 max-h-48 overflow-y-auto custom-scrollbar">
                        {studentsLoading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <LoadingSpinner size="sm" /> Loading students...
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className="text-xs text-gray-500">
                            No students match your search.
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-100 text-xs">
                            {pageItems.map((s) => {
                              const checked = selectedStudentIds.includes(s.id);
                              const disabled =
                                isSubmittingAdd || (!allowReassign && s.parent);
                              return (
                                <li
                                  key={s.id}
                                  className="py-1.5 flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={(e) =>
                                      setSelectedStudentIds((prev) =>
                                        e.target.checked
                                          ? [...prev, s.id]
                                          : prev.filter((id) => id !== s.id)
                                      )
                                    }
                                  />
                                  <span className="flex-1 truncate font-medium text-gray-700">
                                    {s.name}{" "}
                                    {s.username && (
                                      <span className="text-gray-400">
                                        ({s.username})
                                      </span>
                                    )}
                                  </span>
                                  {s.parent && (
                                    <span
                                      className={`text-[10px] font-semibold ${
                                        allowReassign
                                          ? "text-orange-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {allowReassign ? "reassign" : "locked"}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      {filtered.length > STUDENT_PAGE_SIZE && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">
                            Page {page} of {totalPages}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={page === 1 || isSubmittingAdd}
                              onClick={() =>
                                setStudentPage((p) => Math.max(1, p - 1))
                              }
                              className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              disabled={page === totalPages || isSubmittingAdd}
                              onClick={() =>
                                setStudentPage((p) =>
                                  Math.min(totalPages, p + 1)
                                )
                              }
                              className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-500">
                        Selecting students will (re)assign them to this parent.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </form>
          </Modal>
        )}

        {editModal.isOpen && editingParent && (
          <Modal
            title="Edit Parent"
            onClose={() => {
              editModal.close();
              resetEdit();
            }}
            size="md"
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
                  form="edit-parent-form"
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
              id="edit-parent-form"
              onSubmit={handleSubmitEdit(handleEditParent)}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <FormField
                label="First Name"
                name="name"
                register={registerEdit}
                errors={errorsEdit}
                required
              />
              <FormField
                label="Last Name"
                name="surname"
                register={registerEdit}
                errors={errorsEdit}
                required
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                register={registerEdit}
                errors={errorsEdit}
                required
              />
              <FormField
                label="Phone"
                name="phone"
                register={registerEdit}
                errors={errorsEdit}
                required
              />
              <FormField
                label="Address"
                name="address"
                register={registerEdit}
                errors={errorsEdit}
                required
              />
            </form>
          </Modal>
        )}

        {viewModal.isOpen && viewingParent && (
          <Modal
            title="Parent Details"
            onClose={() => viewModal.close()}
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
                { label: "Name", value: viewingParent.name },
                { label: "Email", value: viewingParent.email },
                {
                  label: "Phone",
                  value: viewingParent.phone || "Not provided",
                },
                { label: "Address", value: viewingParent.address },
                {
                  label: "Created",
                  value: formatDateDisplay(viewingParent.createdAt),
                },
              ]}
            />
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Students
              </p>
              <div className="flex flex-wrap gap-1">
                {viewingParent.students && viewingParent.students.length ? (
                  viewingParent.students.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">None</span>
                )}
              </div>
            </div>
          </Modal>
        )}

        {deleteModal.isOpen && deletingParent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Delete Parent</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete{" "}
                <strong>{deletingParent.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={deleteModal.close}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteParent}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionWrapper>
  );
};

export default Parents;
