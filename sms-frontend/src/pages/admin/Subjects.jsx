import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subjectSchema } from "../../utils/formSchemas";
import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import FormField from "../../components/ui/FormField";
import useModal from "../../hooks/useModal";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";

const Subjects = () => {
  const queryClient = useQueryClient();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teachersError, setTeachersError] = useState("");
  // modal abstractions
  const addModal = useModal();
  const editModal = useModal();
  const viewModal = useModal();
  const deleteModal = useModal();
  const editing = editModal.payload;
  const viewing = viewModal.payload;
  const deleting = deleteModal.payload;
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSubjects = async () => {
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects`
      );
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data?.data) ? json.data.data : [];
      setSubjects(
        list.map((s) => ({
          id: s._id,
          name: s.name,
          teacherIds: (s.teachers || []).map((t) => t._id || t),
          teachers: s.teachers?.map((t) => t.name || t)?.slice(0, 5) || [],
          lessons: s.lessons?.length || 0,
          grade: s.grade?.name || s.grade || "",
          credits: s.credits ?? 0,
          enrolled: s.enrolled ?? 0,
          capacity: s.capacity ?? 35,
          room: s.room || "",
          status: s.status || "Active",
        }))
      );
    } catch (e) {
      toast.error(e.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    setTeachersError("");
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers?limit=1000`
      );
      if (!res.ok) throw new Error(`Failed teachers: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data?.data) ? json.data.data : [];
      setTeachers(
        list.map((t) => ({
          id: t._id || t.id || t.id,
          name: `${t.name} ${t.surname || ""}`.trim(),
        }))
      );
      // removed debug logging
    } catch (e) {
      toast.error(e.message || "Failed to load teachers");
      setTeachersError(e.message || "Failed to load teachers");
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm({ resolver: zodResolver(subjectSchema) });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue,
    formState: { errors: errorsEdit },
  } = useForm({ resolver: zodResolver(subjectSchema) });

  const onAdd = async (data) => {
    try {
      const payload = {
        ...data,
        teachers: data.teachers || [],
        capacity: data.capacity ? Number(data.capacity) : 35,
      };
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create subject");
      toast.success("Subject created");
      addModal.close();
      resetAdd();
      fetchSubjects();
      // Ensure other pages reflect latest subjects/teachers
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    } catch (e) {
      toast.error(e.message || "Failed to create subject");
    }
  };

  const onEdit = async (data) => {
    if (!editing) return;
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects/${editing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            teachers: data.teachers || [],
            capacity: data.capacity ? Number(data.capacity) : 35,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update subject");
      toast.success("Subject updated");
      editModal.close();
      resetEdit();
      fetchSubjects();
      // Propagate updates to dependent views (e.g., Teachers list chips)
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    } catch (e) {
      toast.error(e.message || "Failed to update subject");
    }
  };

  const openEdit = useCallback(
    (row) => {
      editModal.open(row);
      [
        "name",
        "grade",
        "credits",
        "enrolled",
        "capacity",
        "room",
        "status",
      ].forEach((k) => setValue(k, row[k] ?? (k === "capacity" ? 35 : "")));
      setValue("teachers", row.teacherIds || []);
    },
    [editModal, setValue]
  );

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects/${deleting.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || "Failed to delete subject");
      }
      toast.success("Subject deleted");
      deleteModal.close();
      fetchSubjects();
      // Invalidate caches so pages refetch with latest state
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    } catch (e) {
      toast.error(e.message || "Failed to delete subject");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "grade", label: "Grade", sortable: true },
      { key: "credits", label: "Credits", sortable: true },
      {
        key: "enrolled",
        label: "Enrolled",
        sortable: true,
        // render receives (value, fullRow) from EnhancedTable; previously treated value as the row which broke the view
        render: (value, fullRow) => {
          const enrolled =
            typeof value === "number" ? value : Number(value) || 0;
          const cap =
            typeof fullRow?.capacity === "number" ? fullRow.capacity : 35;
          const pctRaw = cap > 0 ? (enrolled / cap) * 100 : 0;
          const pct = Number.isFinite(pctRaw)
            ? Math.min(100, Math.max(0, pctRaw))
            : 0;
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
      { key: "capacity", label: "Capacity", sortable: true },
      { key: "status", label: "Status", sortable: true },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-600 mt-1">Manage subjects</p>
        </div>
        <button
          onClick={async () => {
            if (!teachers.length && !loadingTeachers) await fetchTeachers();
            addModal.open();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Subject
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm">
        <EnhancedTable
          data={subjects}
          columns={columns}
          actions={actions}
          isLoading={loading}
          title="Subjects"
          filterable={false}
        />
      </div>

      {addModal.isOpen && (
        <Modal
          title="Create Subject"
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
                form="add-subject-form"
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Create
              </button>
            </>
          }
        >
          <form
            id="add-subject-form"
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
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1 block">
                Teachers
              </label>
              <div className="relative">
                <select
                  multiple
                  {...registerAdd("teachers")}
                  className="w-full h-32 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 bg-white shadow-sm"
                >
                  {loadingTeachers && <option disabled>Loading...</option>}
                  {!loadingTeachers && !teachers.length && (
                    <option disabled>No teachers found</option>
                  )}
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Hold Ctrl (Cmd on Mac) to select multiple.
                </p>
                {teachersError && (
                  <div className="mt-1 text-[10px] text-red-500 flex items-center gap-1">
                    <span>{teachersError}</span>
                    <button
                      type="button"
                      onClick={fetchTeachers}
                      className="underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
            <FormField
              label="Grade"
              name="grade"
              register={registerAdd}
              errors={errorsAdd}
              required
            />
            <FormField
              label="Credits"
              name="credits"
              type="number"
              register={registerAdd}
              errors={errorsAdd}
            />
            <FormField
              label="Enrolled"
              name="enrolled"
              type="number"
              register={registerAdd}
              errors={errorsAdd}
            />
            {errorsAdd?.enrolled && (
              <p className="md:col-span-2 text-xs text-red-600 font-medium -mt-3">
                {errorsAdd.enrolled.message}
              </p>
            )}
            <FormField
              label="Capacity"
              name="capacity"
              type="number"
              register={registerAdd}
              errors={errorsAdd}
            />

            <FormField
              label="Room"
              name="room"
              register={registerAdd}
              errors={errorsAdd}
            />
            <FormField
              label="Status"
              name="status"
              as="select"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "On Hold", label: "On Hold" },
              ]}
              register={registerAdd}
              errors={errorsAdd}
            />
          </form>
        </Modal>
      )}

      {editModal.isOpen && editing && (
        <Modal
          title="Edit Subject"
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
                form="edit-subject-form"
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Update
              </button>
            </>
          }
        >
          <form
            id="edit-subject-form"
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
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1 block">
                Teachers
              </label>
              <div className="relative">
                <select
                  multiple
                  {...registerEdit("teachers")}
                  className="w-full h-32 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 bg-white shadow-sm"
                >
                  {loadingTeachers && <option disabled>Loading...</option>}
                  {!loadingTeachers && !teachers.length && (
                    <option disabled>No teachers found</option>
                  )}
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Hold Ctrl (Cmd on Mac) to select multiple.
                </p>
                {teachersError && (
                  <div className="mt-1 text-[10px] text-red-500 flex items-center gap-1">
                    <span>{teachersError}</span>
                    <button
                      type="button"
                      onClick={fetchTeachers}
                      className="underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
            <FormField
              label="Grade"
              name="grade"
              register={registerEdit}
              errors={errorsEdit}
              required
            />
            <FormField
              label="Credits"
              name="credits"
              type="number"
              register={registerEdit}
              errors={errorsEdit}
            />
            <FormField
              label="Enrolled"
              name="enrolled"
              type="number"
              register={registerEdit}
              errors={errorsEdit}
            />
            {errorsEdit?.enrolled && (
              <p className="md:col-span-2 text-xs text-red-600 font-medium -mt-3">
                {errorsEdit.enrolled.message}
              </p>
            )}
            <FormField
              label="Capacity"
              name="capacity"
              type="number"
              register={registerEdit}
              errors={errorsEdit}
            />

            <FormField
              label="Room"
              name="room"
              register={registerEdit}
              errors={errorsEdit}
            />
            <FormField
              label="Status"
              name="status"
              as="select"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "On Hold", label: "On Hold" },
              ]}
              register={registerEdit}
              errors={errorsEdit}
            />
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {viewModal.isOpen && (
        <Modal
          title="Subject Details"
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
          {!viewing ? (
            <div className="text-sm text-gray-500">No subject selected.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 text-sm">
              {[
                "name",
                "grade",
                "credits",
                "enrolled",
                "capacity",
                "room",
                "status",
              ].map((k) => (
                <div key={k}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    {k}
                  </p>
                  <p className="text-gray-800 font-medium break-words">
                    {k === "enrolled" && viewing?.capacity != null
                      ? `${viewing.enrolled} / ${viewing.capacity}`
                      : viewing?.[k] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {deleteModal.isOpen && deleting && (
        <Modal
          title="Delete Subject"
          size="sm"
          onClose={deleteModal.close}
          footer={
            <>
              <button
                onClick={deleteModal.close}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <p className="text-gray-700">
              Are you sure you want to delete
              <span className="font-semibold"> {deleting.name}</span>? This
              action cannot be undone.
            </p>
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
              This will permanently remove the subject record and its direct
              associations.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Subjects;
