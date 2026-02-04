import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import useRegistry from "../../hooks/useRegistry";
import {
  bulkCreateStudents,
  bulkPreflightStudents,
  buildStudentCsvTemplate,
  parseStudentCsv,
} from "../../services/bulkStudentService";
import {
  fetchParents,
  fetchClasses,
  fetchGradesWithId,
} from "../../services/studentLinkService";
import { useAuth } from "../../hooks/useAuth";

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
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const Registration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const { hasPermission, user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Permission check for admin access
  if (!hasPermission("view_registration")) {
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
            You don't have permission to access the Registration Management
            section.
            <br />
            Only administrators with registration management permissions can
            view this page.
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

  const {
    users,
    fetchUsers,
    createUser,
    loading: loadingUsers,
  } = useRegistry();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: "student",
      username: "",
      email: "",
      password: "",
      department: "general",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const selectedRole = watch("role");
  const isAdminRole = selectedRole && selectedRole.includes("_admin");

  const onAdd = async (form) => {
    setIsSubmitting(true);
    try {
      const userData = {
        role: form.role,
        username: form.username,
        email: form.email,
        password: form.password,
      };

      // Add admin-specific fields if it's an admin role
      if (isAdminRole) {
        userData.department = form.department;
        userData.profile = {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || "",
        };
      }

      await createUser(userData);
      toast.success(`Registered ${form.role} "${form.username}"`);
      setCredentials({ ...form });
      setShowModal(true);
      reset({
        role: form.role,
        username: "",
        email: "",
        password: "",
        department: "general",
        firstName: "",
        lastName: "",
        phone: "",
      });
      // Always refresh to reflect server canonical data
      fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to register user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Registration</h1>
      <p className="text-gray-600">
        Create login credentials for platform users.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                {...register("role", { required: "Role is required" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <optgroup label="Admin Roles">
                  <option value="super_admin">Super Admin</option>
                  <option value="school_admin">School Admin</option>
                  <option value="academic_admin">Academic Admin</option>
                  <option value="exam_admin">Exam Admin</option>
                  <option value="finance_admin">Finance Admin</option>
                  <option value="student_affairs_admin">
                    Student Affairs Admin
                  </option>
                  <option value="it_admin">IT Admin</option>
                </optgroup>
                <optgroup label="User Roles">
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="staff">Staff</option>
                </optgroup>
              </select>
              {errors.role && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.role.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                {...register("username", { required: "Username is required" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.username.message}
                </p>
              )}
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
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Must be at least 8 characters",
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Admin-specific fields */}
            {isAdminRole && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    {...register("department", {
                      required: isAdminRole
                        ? "Department is required for admin roles"
                        : false,
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="academic">Academic</option>
                    <option value="examination">Examination</option>
                    <option value="finance">Finance</option>
                    <option value="student_affairs">Student Affairs</option>
                    <option value="it">IT</option>
                    <option value="general">General</option>
                  </select>
                  {errors.department && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.department.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      {...register("firstName", {
                        required: isAdminRole
                          ? "First name is required for admin roles"
                          : false,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      {...register("lastName", {
                        required: isAdminRole
                          ? "Last name is required for admin roles"
                          : false,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register("phone")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => reset()}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting && <LoadingSpinner size="sm" />}Create User
              </button>
            </div>
          </form>
        </div>
        {/* Bulk Students Panel */}
        <BulkStudentUploader />
      </div>
      {showModal && credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-lg shadow-lg p-6 z-10">
            <h3 className="text-lg font-semibold mb-4">User Credentials</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Role:</strong> {credentials.role}
              </p>
              <p>
                <strong>Username:</strong> {credentials.username}
              </p>
              <p>
                <strong>Email:</strong> {credentials.email}
              </p>
              <p>
                <strong>Password:</strong> {credentials.password}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <IdLookupPanel />
      <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Existing Users</h2>
          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingUsers && <LoadingSpinner size="sm" />}Refresh
          </button>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Username
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id || u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {u.username}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{u.email}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    {loadingUsers ? "Loading users..." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Bulk uploader component
const BulkStudentUploader = () => {
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [atomic, setAtomic] = useState(true);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const csv = buildStudentCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const { rows: parsed } = parseStudentCsv(String(text));
        setRows(parsed);
        setResult(null);
        toast.success(`Parsed ${parsed.length} rows`);
      } catch (e) {
        console.error("CSV parse error", e);
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (rows.length === 0) {
      toast.error("No rows to upload");
      return;
    }
    setUploading(true);
    try {
      // Map headers to expected keys
      const students = rows.map((r) => ({
        username: r.username,
        name: r.name,
        surname: r.surname,
        email: r.email,
        address: r.address,
        sex: r.sex,
        birthday: r["birthday(YYYY-MM-DD)"] || r.birthday,
        parentId: r.parentId,
        classId: r.classId,
        gradeId: r.gradeId,
        phone: r["phone(optional)"] || r.phone || undefined,
        bloodType: r["bloodType(optional)"] || r.bloodType || undefined,
      }));
      // Preflight validation first
      const pre = await bulkPreflightStudents(students);
      if (pre.status === "fail" && pre.errors?.length) {
        setResult(pre);
        toast.error(`Found ${pre.errors.length} errors. Nothing uploaded.`);
        return;
      }
      const res = await bulkCreateStudents(students, { atomic });
      setResult(res);
      toast.success(`Created ${res.created}, failed ${res.failed}`);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Bulk upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 flex flex-col">
      <h2 className="text-lg font-semibold mb-2">Bulk Add Students</h2>
      <p className="text-xs text-gray-500 mb-4">
        1. Download template 2. Fill required fields 3. Upload CSV
      </p>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button
          type="button"
          onClick={downloadTemplate}
          className="px-3 py-1.5 text-sm border rounded-md bg-indigo-50 hover:bg-indigo-100"
        >
          Download Template
        </button>
        <label className="px-3 py-1.5 text-sm border rounded-md cursor-pointer bg-white hover:bg-gray-50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="hidden"
          />
          Choose CSV
        </label>
        <button
          type="button"
          disabled={uploading || rows.length === 0}
          onClick={handleUpload}
          className="px-3 py-1.5 text-sm border rounded-md bg-green-600 text-white disabled:opacity-50 flex items-center gap-2"
        >
          {uploading && <LoadingSpinner size="sm" color="white" />}Upload
        </button>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={atomic}
            onChange={(e) => setAtomic(e.target.checked)}
          />
          All-or-nothing
        </label>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto border rounded-md bg-gray-50">
        {rows.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No rows parsed yet.
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(rows[0]).map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-left font-medium text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, idx) => (
                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                  {Object.keys(rows[0]).map((h) => (
                    <td key={h} className="px-2 py-1 whitespace-nowrap">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 10 && (
        <p className="mt-1 text-[10px] text-gray-500">
          Showing first 10 of {rows.length} rows.
        </p>
      )}
      {result && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Upload Result</h3>
          <p className="text-xs text-gray-600">
            Created {result.created}, Failed {result.failed}
          </p>
          {result.successes?.length > 0 && (
            <OneTimeCsvDownload
              items={result.successes}
              onSanitize={() =>
                setResult((r) =>
                  r
                    ? {
                        ...r,
                        successes: r.successes.map((s) => ({
                          ...s,
                          password: "***",
                        })),
                      }
                    : r
                )
              }
            />
          )}
          {result.successes?.length > 0 && (
            <div className="border rounded-md bg-white max-h-40 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Username</th>
                    <th className="px-2 py-1 text-left">Email</th>
                    <th className="px-2 py-1 text-left">Password</th>
                    <th className="px-2 py-1 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.successes.map((s) => (
                    <SuccessRow key={s.username} row={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.errors?.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer select-none text-red-600">
                Errors ({result.errors.length})
              </summary>
              <ul className="mt-1 space-y-1 max-h-32 overflow-auto">
                {result.errors.map((er, i) => (
                  <li
                    key={i}
                    className="border rounded px-2 py-1 bg-red-50 text-red-700"
                  >
                    Row {er.row}: {er.username || "n/a"} - {er.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <p className="mt-4 text-[10px] text-gray-500 leading-4">
        Required headers:
        username,name,surname,email,address,sex,birthday(YYYY-MM-DD),parentId,classId,gradeId.
        Default password applied automatically. Date must be ISO (YYYY-MM-DD).
        Sex must be MALE or FEMALE.
      </p>
    </div>
  );
};

// One-time CSV download component with confirmation modal & post-export masking
const OneTimeCsvDownload = ({ items, onSanitize }) => {
  const [open, setOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const performDownload = () => {
    if (!items?.length) return;
    const header = "username,email,tempPassword";
    const lines = items.map((s) => `${s.username},${s.email},${s.password}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_students_success.csv";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    onSanitize?.();
    setOpen(false);
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        disabled={downloaded}
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {downloaded ? "Exported" : "Download Success CSV"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-lg shadow-lg p-5 z-10">
            <h4 className="text-sm font-semibold mb-2">One-Time Export</h4>
            <p className="text-xs text-gray-600 mb-4">
              This CSV contains temporary passwords. It can only be downloaded
              once in this session. Store it securely. After export the
              in-memory passwords will be masked.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performDownload}
                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Confirm & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registration;

// Row component with regenerate token action
import authService from "../../services/authService";

const SuccessRow = ({ row }) => {
  const { users } = useRegistry();
  const [regenToken, setRegenToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = users?.find((u) => u.username === row.username);

  const handleRegenerate = async () => {
    if (!user?._id && !user?.id) {
      toast.error("User id not found yet. Refresh users first.");
      return;
    }
    setLoading(true);
    try {
      const token = await authService.regenerateFirstLoginToken(
        user._id || user.id
      );
      setRegenToken(token);
      toast.success("Token regenerated");
    } catch (e) {
      toast.error(e.message || "Failed to regenerate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="odd:bg-white even:bg-gray-50">
      <td className="px-2 py-1 font-medium">{row.username}</td>
      <td className="px-2 py-1">
        <div className="flex flex-col gap-0.5">
          <span>{row.email}</span>
          {user && (
            <span
              className={`text-[10px] inline-flex w-fit px-1.5 py-0.5 rounded border ${
                user.mustChangePassword
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-emerald-50 border-emerald-300 text-emerald-700"
              }`}
            >
              {user.mustChangePassword ? "Pending Setup" : "Activated"}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-1">{row.password}</td>
      <td className="px-2 py-1">
        {regenToken ? (
          <div className="space-y-1">
            <div className="text-[10px] break-all font-mono bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">
              {regenToken}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(regenToken)
                    .then(() => toast.success("Copied"))
                    .catch(() => toast.error("Copy failed"));
                }}
                className="text-[10px] text-indigo-600 underline"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setRegenToken(null)}
                className="text-[10px] text-gray-500 underline"
              >
                Hide
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading || (user && !user.mustChangePassword)}
            onClick={handleRegenerate}
            className="text-[10px] px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {loading
              ? "..."
              : user && !user.mustChangePassword
              ? "Already Set"
              : "Regenerate Token"}
          </button>
        )}
      </td>
    </tr>
  );
};

// Simple IDs lookup panel for Parents, Classes, Grades
const IdLookupPanel = () => {
  const [tab, setTab] = useState("parents");
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [p, c, g] = await Promise.all([
          fetchParents(500),
          fetchClasses(500),
          fetchGradesWithId(500),
        ]);
        if (!cancelled) {
          setParents(p);
          setClasses(c);
          setGrades(g);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load IDs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const renderTable = (items, cols) => (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-gray-100">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2 py-1 text-left font-medium text-gray-600"
              >
                {c.label}
              </th>
            ))}
            <th className="px-2 py-1 text-left font-medium text-gray-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 20).map((it) => (
            <tr key={it._id || it.id} className="odd:bg-white even:bg-gray-50">
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-1">
                  {String(it[c.key] ?? "")}
                </td>
              ))}
              <td className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => copy(it._id || it.id)}
                  className="text-[10px] px-2 py-1 border rounded hover:bg-gray-50"
                >
                  Copy ID
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td
                className="px-2 py-3 text-gray-500 text-center"
                colSpan={cols.length + 1}
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {items.length > 20 && (
        <div className="text-[10px] text-gray-500 px-2 py-1">
          Showing first 20 of {items.length}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
      <h2 className="text-lg font-semibold mb-2">Quick ID Lookup</h2>
      <p className="text-xs text-gray-600 mb-3">
        Find IDs for Parents, Classes, and Grades to use in CSV uploads.
      </p>
      <div className="flex gap-2 mb-3">
        {[
          { k: "parents", label: "Parents" },
          { k: "classes", label: "Classes" },
          { k: "grades", label: "Grades" },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 text-xs border rounded ${
              tab === t.k
                ? "bg-indigo-600 text-white"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <div>
          {tab === "parents" &&
            renderTable(parents, [
              { key: "_id", label: "ID" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
            ])}
          {tab === "classes" &&
            renderTable(classes, [
              { key: "_id", label: "ID" },
              { key: "name", label: "Name" },
            ])}
          {tab === "grades" &&
            renderTable(grades, [
              { key: "_id", label: "ID" },
              { key: "name", label: "Name/Level" },
            ])}
        </div>
      )}
    </div>
  );
};
