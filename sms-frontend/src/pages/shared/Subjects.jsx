// Subjects.jsx - CLEAN UNIFIED IMPLEMENTATION
import React from "react";
import { toast } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import EnhancedTable from "../../components/EnhancedTable";
import Modal from "../../components/ui/Modal";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

const Spinner = ({ size = "sm", color = "white" }) => {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6" };
  const colors = {
    white: "text-white",
    blue: "text-blue-600",
    gray: "text-gray-600",
  };
  return (
    <svg
      className={`animate-spin ${sizes[size]} ${colors[color]}`}
      viewBox="0 0 24 24"
      fill="none"
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const Subjects = ({ role = "admin" }) => {
  const isTeacher = role === "teacher";
  const [showAdd, setShowAdd] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showView, setShowView] = React.useState(false);
  const { hasPermission, user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Permission check for admin role
  if (role === "admin" && !hasPermission("view_subjects")) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
      >
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
            {t("common.accessDenied") || "Access Denied"}
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            {t("subjects.noPermission") ||
              "You don't have permission to access the Subjects Management section."}
            <br />
            {t("subjects.adminOnly") ||
              "Only administrators with subject management permissions can view this page."}
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
  const [target, setTarget] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const qc = useQueryClient();

  const fetchSubjects = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/subjects`);
    const j = await res.json();
    const raw = Array.isArray(j?.data?.data) ? j.data.data : [];
    return raw.map((s) => ({
      id: s._id,
      name: s.name,
      grade: s.grade || "",
      teacher:
        s.teachers && s.teachers[0]
          ? `${s.teachers[0].name || ""} ${s.teachers[0].surname || ""}`.trim()
          : "TBD",
      credits: Number.isFinite(s.credits) ? s.credits : 0,
      enrolled: Number.isFinite(s.enrolled) ? s.enrolled : 0,
      capacity: Number.isFinite(s.capacity) ? s.capacity : 0,
      room: s.room || "",
      status: s.status || "Active",
    }));
  };
  const fetchTeachers = async () => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/teachers?limit=1000`
    );
    const j = await res.json();
    if (!res.ok) throw new Error(j.message || "Failed to load teachers");
    return (Array.isArray(j?.data?.data) ? j.data.data : [])
      .map((t) => ({
        id: t._id || t.id,
        name: `${t.name || ""} ${t.surname || ""}`.trim() || "Unknown",
      }))
      .filter((t) => t.id);
  };
  const fetchGrades = async () => {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/grades`);
    const j = await res.json();
    return Array.isArray(j?.data?.grades) ? j.data.grades : [];
  };
  const fetchMyProfile = async () => {
    const res = await authService.authFetch(
      `${API_BASE_URL}/api/v1/teachers/me`
    );
    const j = await res.json();
    if (!res.ok) throw new Error(j.message || "Failed to load profile");
    return j.data?.data || null;
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      grade: "",
      credits: 0,
      enrolled: 0,
      capacity: 30,
      room: "",
      status: "Active",
      teachers: "",
    },
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    enabled: !isTeacher,
  });
  const { data: gradeOptions = [] } = useQuery({
    queryKey: ["grades"],
    queryFn: fetchGrades,
    enabled: !isTeacher,
  });
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
    enabled: !isTeacher,
  });
  const { data: myProfile, isLoading: myProfileLoading } = useQuery({
    queryKey: ["teacher", "me"],
    queryFn: fetchMyProfile,
    enabled: isTeacher,
  });

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        grade: parseInt(data.grade) || data.grade, // Ensure grade is handled properly
        credits: Number(data.credits) || 0,
        enrolled: Number(data.enrolled) || 0,
        capacity: Number(data.capacity) || 30, // Add default capacity
        teachers: data.teachers ? [data.teachers] : [],
      };

      console.log("Payload being sent to backend:", payload);

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json();

      console.log("Backend response:", j);

      if (!res.ok) {
        throw new Error(
          j.message || `HTTP ${res.status}: Failed to add subject`
        );
      }
      return j.data.data;
    },
    onSuccess: () => {
      toast.success("Subject added successfully");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setShowAdd(false);
      reset();
    },
    onError: (e) => {
      console.error("Add subject error:", e);
      toast.error(e.message || "Failed to add subject");
    },
  });
  const editMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        ...data,
        teachers: data.teachers ? [data.teachers] : [],
      };
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Failed to update subject");
      return j.data.data;
    },
    onSuccess: () => {
      toast.success("Subject updated");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setShowEdit(false);
      setTarget(null);
    },
    onError: (e) => toast.error(e.message || "Update failed"),
  });

  const openAdd = React.useCallback(() => {
    reset();
    setShowAdd(true);
  }, [reset]);
  const openEdit = React.useCallback(
    (row) => {
      setTarget(row);
      ["name", "grade", "credits", "enrolled", "room", "status"].forEach((k) =>
        setValue(k, row[k] ?? (k === "credits" || k === "enrolled" ? 0 : ""))
      );
      setValue("teachers", row.teacherId || "");
      setShowEdit(true);
    },
    [setValue]
  );
  const openView = React.useCallback((row) => {
    setTarget(row);
    setShowView(true);
  }, []);
  const openDelete = React.useCallback((row) => {
    setTarget(row);
    setShowDelete(true);
  }, []);
  const onAddSubmit = (data) => {
    console.log("Form data being submitted:", data);
    console.log(
      "Capacity value:",
      data.capacity,
      "Type:",
      typeof data.capacity
    );

    // Validate required fields before submission
    if (!data.name || !data.grade) {
      toast.error("Please fill in all required fields (Name and Grade)");
      return;
    }

    // Ensure capacity is properly set
    if (!data.capacity || data.capacity < 1) {
      console.log("Capacity validation failed - setting default to 30");
      data.capacity = 30;
    }

    setSubmitting(true);
    addMutation.mutate(data, { onSettled: () => setSubmitting(false) });
  };
  const onEditSubmit = (data) => {
    if (!target) return;
    setSubmitting(true);
    editMutation.mutate(
      { id: target.id, data },
      { onSettled: () => setSubmitting(false) }
    );
  };
  const onDeleteConfirm = async () => {
    if (!target) return;
    try {
      setDeleting(true);
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/subjects/${target.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Delete failed");
      }
      toast.success("Subject deleted");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setShowDelete(false);
      setTarget(null);
    } catch (e) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const columns = React.useMemo(
    () => [
      { key: "name", label: "Name", sortable: true },
      { key: "grade", label: "Grade", sortable: true },
      { key: "teacher", label: "Teacher", sortable: true },
      { key: "credits", label: "Credits", sortable: true },
      {
        key: "enrolled",
        label: "Enrolled / Capacity",
        sortable: true,
        render: (v, r) => (
          <span>
            {v} / {r.capacity}
          </span>
        ),
      },
      { key: "status", label: "Status", sortable: true },
    ],
    []
  );
  const actions = React.useMemo(
    () => [
      { label: "View", onClick: openView, color: "text-blue-600" },
      { label: "Edit", onClick: openEdit, color: "text-yellow-600" },
      { label: "Delete", onClick: openDelete, color: "text-red-600" },
    ],
    [openView, openEdit, openDelete]
  );

  const SubjectFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Name *
        </label>
        <input
          type="text"
          {...register("name", { required: "Subject name is required" })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Grade *
        </label>
        <select
          {...register("grade", { required: "Please select a grade" })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select Grade</option>
          {gradeOptions.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name}
            </option>
          ))}
        </select>
        {errors.grade && (
          <p className="text-red-500 text-xs mt-1">
            {errors.grade.message || "Required"}
          </p>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Credits
        </label>
        <input
          type="number"
          {...register("credits", { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Enrolled
        </label>
        <input
          type="number"
          {...register("enrolled", { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Capacity *
        </label>
        <input
          type="number"
          {...register("capacity", {
            required: "Capacity is required",
            valueAsNumber: true,
            min: { value: 1, message: "Capacity must be at least 1" },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="30"
        />
        {errors.capacity && (
          <p className="text-red-500 text-xs mt-1">{errors.capacity.message}</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Room
        </label>
        <input
          type="text"
          {...register("room")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Status
        </label>
        <select
          {...register("status")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Teacher *
        </label>
        <select
          {...register("teachers", { required: "Please select a teacher" })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select Teacher</option>
          {teachersLoading ? (
            <option disabled>Loading...</option>
          ) : (
            teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))
          )}
        </select>
        {errors.teachers && (
          <p className="text-red-500 text-xs mt-1">{errors.teachers.message}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
        {!isTeacher && (
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Subject
          </button>
        )}
      </div>
      {!isTeacher && (
        <EnhancedTable
          data={subjects}
          columns={columns}
          actions={actions}
          isLoading={subjectsLoading}
          title="Subjects"
        />
      )}
      {isTeacher && (
        <div className="bg-white rounded-lg shadow p-6">
          {myProfileLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" color="blue" />
            </div>
          ) : myProfile ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">My Subjects</h2>
              <div className="flex flex-wrap gap-2">
                {(myProfile.subjects || []).map((s) => (
                  <span
                    key={s._id}
                    className="px-3 py-1 text-sm bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No profile data.</p>
          )}
        </div>
      )}
      {showView && target && (
        <Modal
          title="Subject Details"
          size="md"
          onClose={() => {
            setShowView(false);
            setTarget(null);
          }}
          footer={
            <button
              onClick={() => {
                setShowView(false);
                setTarget(null);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Close
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 text-sm">
            {[
              "name",
              "grade",
              "teacher",
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
                  {k === "enrolled"
                    ? `${target.enrolled} / ${target.capacity}`
                    : target[k] ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {showAdd && (
        <Modal
          title="Add Subject"
          size="lg"
          onClose={() => {
            setShowAdd(false);
            reset();
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setShowAdd(false);
                  reset();
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                form="subject-add-form"
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Spinner />}
                {submitting ? "Adding..." : "Create"}
              </button>
            </>
          }
        >
          <form
            id="subject-add-form"
            onSubmit={handleSubmit(onAddSubmit)}
            className="space-y-6"
          >
            <SubjectFormFields />
          </form>
        </Modal>
      )}
      {showEdit && target && (
        <Modal
          title="Edit Subject"
          size="lg"
          onClose={() => {
            setShowEdit(false);
            setTarget(null);
            reset();
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setShowEdit(false);
                  setTarget(null);
                  reset();
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                form="subject-edit-form"
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Spinner />}
                {submitting ? "Updating..." : "Update"}
              </button>
            </>
          }
        >
          <form
            id="subject-edit-form"
            onSubmit={handleSubmit(onEditSubmit)}
            className="space-y-6"
          >
            <SubjectFormFields />
          </form>
        </Modal>
      )}
      {showDelete && target && (
        <Modal
          title="Delete Subject"
          size="sm"
          onClose={() => {
            setShowDelete(false);
            setTarget(null);
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setShowDelete(false);
                  setTarget(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={onDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Spinner />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{target.name}</span>? This action
            cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default Subjects;
