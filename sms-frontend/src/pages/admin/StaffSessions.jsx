import { useEffect, useState } from "react";
import authService from "../../services/authService";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";

const roleOrder = [
  "super_admin",
  "school_admin",
  "it_admin",
  "academic_admin",
  "exam_admin",
  "finance_admin",
  "student_affairs_admin",
  "teacher",
];

export default function StaffSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { hasPermission, user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Permission check for admin access
  if (!hasPermission("view_sessions")) {
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
            You don't have permission to access the Staff Sessions Management
            section.
            <br />
            Only administrators with session management permissions can view
            this page.
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

  const load = async () => {
    try {
      setLoading(true);
      const res = await authService.authFetch(
        `${authService.baseURL}/api/v1/sessions/staff`
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSessions(data.data.sessions || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load staff sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = sessions
    .filter((s) => filter === "all" || s.user?.role === filter)
    .filter((s) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        s.user?.username?.toLowerCase().includes(term) ||
        s.user?.profile?.firstName?.toLowerCase().includes(term) ||
        s.user?.profile?.lastName?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const ai = roleOrder.indexOf(a.user?.role);
      const bi = roleOrder.indexOf(b.user?.role);
      return ai - bi || new Date(b.lastActivity) - new Date(a.lastActivity);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Sessions</h1>
        <button
          onClick={load}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>
      <div className="flex gap-4 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user..."
          className="border px-3 py-2 rounded"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All Roles</option>
          {roleOrder.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">Total: {filtered.length}</span>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Dept</th>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Last Activity</th>
                <th className="px-3 py-2 text-left">Expires</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.sessionId} className="border-t last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{s.user?.username}</div>
                    <div className="text-xs text-gray-500">
                      {s.user?.profile?.firstName} {s.user?.profile?.lastName}
                    </div>
                  </td>
                  <td className="px-3 py-2 capitalize">{s.user?.role}</td>
                  <td className="px-3 py-2">{s.user?.department || "-"}</td>
                  <td className="px-3 py-2">{s.deviceInfo || "-"}</td>
                  <td className="px-3 py-2">{s.ipAddress || "-"}</td>
                  <td className="px-3 py-2">
                    {new Date(s.lastActivity).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(s.expiresAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-gray-500"
                    colSpan={7}
                  >
                    No sessions match filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Shows only staff & teacher sessions (excludes students/parents).
        Auto-refresh not enabled.
      </p>
    </div>
  );
}
