import { useEffect, useState, useMemo } from "react";
import { fetchAuditLogs } from "../../services/auditService";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";

// Backend logs this as REGENERATE_FIRST_LOGIN_TOKEN
const EVENT_ACTION = "REGENERATE_FIRST_LOGIN_TOKEN";

const FirstLoginTokenEvents = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [isLastPage, setIsLastPage] = useState(false);
  const { hasPermission, user } = useAuth();

  // Check if user is super_admin
  const isSuperAdmin = user?.role === "super_admin";

  // Permission check for admin access
  if (!hasPermission("view_audit")) {
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
            You don't have permission to access the First Login Tokens section.
            <br />
            Only administrators with audit management permissions can view this
            page.
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

  const load = async (opts = {}) => {
    const currentPage = opts.page || page;
    const currentLimit = opts.limit || limit;
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        action: EVENT_ACTION,
        limit: currentLimit,
        page: currentPage,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(data);
      setIsLastPage(data.length < currentLimit); // heuristic
      if (opts.page) setPage(currentPage);
      if (opts.limit) setLimit(currentLimit);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const actor = (l.user?.username || l.actorUsername || "").toLowerCase();
      const target = (
        l.targetUser?.username ||
        l.metadata?.targetUser ||
        ""
      ).toLowerCase();
      return (
        (!actorFilter || actor.includes(actorFilter.toLowerCase())) &&
        (!targetFilter || target.includes(targetFilter.toLowerCase()))
      );
    });
  }, [logs, actorFilter, targetFilter]);

  useEffect(() => {
    // Initial load; filter/pagination changes triggered manually via Apply button
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          First-Login Token Regenerations
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <input
            placeholder="Actor"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <input
            placeholder="Target"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          />
          <select
            value={limit}
            onChange={(e) =>
              load({ limit: parseInt(e.target.value, 10), page: 1 })
            }
            className="border rounded px-2 py-1 text-xs"
          >
            {[10, 25, 50, 100].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={() => load({ page: 1 })}
            disabled={loading}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setActorFilter("");
              setTargetFilter("");
              load({ page: 1 });
            }}
            disabled={loading}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={() => load()}
            disabled={loading}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "..." : "Refresh"}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 max-w-2xl">
        Displays audit events when an admin regenerates a restricted first-login
        password setup token. Helps monitor potential abuse or unusual
        frequency.
      </p>
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Time
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Actor
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Target User
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                Description
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No events.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log._id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {log.user?.username || log.actorUsername || "—"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {log.targetUser?.username || log.metadata?.targetUser || "—"}
                </td>
                <td className="px-4 py-2 text-gray-700 text-xs max-w-xs">
                  {log.description || log.action}
                </td>
                <td className="px-4 py-2 text-gray-600 text-xs">
                  {log.ip || log.metadata?.ip || "—"}
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-gray-500 text-sm"
                >
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-2 border-t bg-gray-50 text-xs">
          <div className="text-gray-600">Page {page}</div>
          <div className="flex gap-2">
            <button
              disabled={loading || page === 1}
              onClick={() => load({ page: page - 1 })}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={loading || isLastPage}
              onClick={() => load({ page: page + 1 })}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstLoginTokenEvents;
