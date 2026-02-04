import { useState, useEffect, useCallback, useMemo } from "react";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
// (Form logic removed for shared dynamic view; creation handled in admin page)
import EnhancedTable from "../../components/EnhancedTable";

const Parents = ({ role = "admin" }) => {
  const roleTitles = {
    admin: "Admin - Parents Management",
    teacher: "Teacher - Parents Directory",
    student: "Student - My Parents",
    parent: "Parent - My Profile",
  };

  const roleDescriptions = {
    admin: "Manage all parents in the school system",
    teacher: "View parent information for communication",
    student: "View your parents' information",
    parent: "View your profile and information",
  };

  // Dynamic parents data
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // (Optional future role-based logic omitted for lean read-only directory)

  // Remote fetch
  const fetchParents = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/parents`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data?.data) ? json.data.data : [];
      setParents(
        list.map((p) => ({
          id: p._id,
          name: `${p.name} ${p.surname || ""}`.trim(),
          // username stored as ObjectId referencing User; if populated, p.username may be object
          username:
            typeof p.username === "object" && p.username?.username
              ? p.username.username
              : "",
          email: p.email || "",
          phone: p.phone || "",
          address: p.address || "",
          students: (p.students || []).map((s) => s.name).filter(Boolean),
          createdAt: p.createdAt
            ? new Date(p.createdAt).toISOString().split("T")[0]
            : "",
        }))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const columns = useMemo(
    () => [
      { key: "name", label: "Name", sortable: true, filterable: true },
      { key: "email", label: "Email", sortable: true, filterable: true },
      { key: "phone", label: "Phone", sortable: true, filterable: true },
      {
        key: "username",
        label: "Username",
        sortable: true,
        filterable: true,
        render: (v) => <span className="font-mono text-xs">{v}</span>,
      },
      { key: "address", label: "Address", sortable: true },
      {
        key: "students",
        label: "Students",
        sortable: false,
        render: (children) => (
          <div className="flex flex-wrap gap-1">
            {children && children.length ? (
              children.map((c, i) => (
                <span
                  key={i}
                  className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                >
                  {String(c)}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">None</span>
            )}
          </div>
        ),
      },
      { key: "createdAt", label: "Created", sortable: true },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Parents"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Parents directory"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {error && (
          <div className="mb-4 text-sm text-red-600">Error: {error}</div>
        )}
        <EnhancedTable
          title="Parent Directory"
          data={parents}
          loading={loading}
          columns={columns}
          pageSize={25}
          filterable={false} // disable per-column filters; only global search bar remains
          emptyMessage={loading ? "Loading parents..." : "No parents found"}
        />
      </div>
    </div>
  );
};

export default Parents;
