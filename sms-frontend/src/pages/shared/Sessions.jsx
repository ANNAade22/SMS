import { useEffect, useState } from "react";
import authService from "../../services/authService";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invalidating, setInvalidating] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
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
            You don't have permission to access the Sessions Management section.
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
      const { response, data } = await authService.getMySessions();
      if (!response.ok)
        throw new Error(data.message || "Failed to load sessions");
      setSessions(data.data.sessions || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const invalidate = async (sessionId) => {
    try {
      setInvalidating(sessionId);
      const { response, data } = await authService.invalidateSession(sessionId);
      if (!response.ok) throw new Error(data.message || "Invalidate failed");
      toast.success("Session invalidated");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to invalidate");
    } finally {
      setInvalidating(null);
    }
  };

  const invalidateAll = async () => {
    try {
      if (!window.confirm("Invalidate ALL your sessions (other devices)?"))
        return;
      setBulkLoading(true);
      const { response, data } = await authService.invalidateAllMySessions();
      if (!response.ok) throw new Error(data.message || "Failed");
      toast.success("All other sessions invalidated");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to invalidate all");
    } finally {
      setBulkLoading(false);
    }
  };

  const logoutAll = async () => {
    try {
      if (!window.confirm("Log out ALL sessions including this one?")) return;
      setBulkLoading(true);
      await authService.logoutAll();
      toast.success("Logged out everywhere");
      window.location.href = "/";
    } catch (e) {
      console.error(e);
      toast.error("Failed to logout all");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Sessions</h1>
        <div className="flex gap-3">
          <button
            onClick={invalidateAll}
            disabled={bulkLoading}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Invalidate Others
          </button>
          <button
            onClick={logoutAll}
            disabled={bulkLoading}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Logout All
          </button>
        </div>
      </div>
      {loading ? (
        <p>Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <p className="text-gray-600">No active sessions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="py-2 px-3">Device</th>
                <th className="py-2 px-3">IP</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Last Activity</th>
                <th className="py-2 px-3">Expires</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isCurrent = s.token === authService.getToken();
                return (
                  <tr key={s.sessionId} className="border-b last:border-none">
                    <td className="py-2 px-3">{s.deviceInfo || "Unknown"}</td>
                    <td className="py-2 px-3">{s.ipAddress || "-"}</td>
                    <td className="py-2 px-3">{s.role}</td>
                    <td className="py-2 px-3">
                      {new Date(s.lastActivity).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      {new Date(s.expiresAt).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      {isCurrent ? (
                        <span className="text-green-600 font-medium">
                          Current
                        </span>
                      ) : (
                        <button
                          onClick={() => invalidate(s.sessionId)}
                          disabled={invalidating === s.sessionId}
                          className="px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                          {invalidating === s.sessionId ? "..." : "Invalidate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-xs text-gray-500">
        Invalidating others will keep the current session active. Logout All
        ends every session (including this one).
      </div>
    </div>
  );
};

export default Sessions;
