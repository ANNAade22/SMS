import { Megaphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// items: [{ title, date, audience, priority, status }]
const DashboardAnnouncements = ({ role = "student", items = [] }) => {
  const basePath =
    role === "admin"
      ? "/admin"
      : role === "teacher"
      ? "/teacher"
      : role === "student"
      ? "/student"
      : "/parent";
  const top = items.slice(0, 3);
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
        </div>
        <Link
          to={`${basePath}/announcements`}
          className="text-sm text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <ul className="space-y-3">
        {top.length === 0 && (
          <li className="text-gray-500 text-sm">No announcements</li>
        )}
        {top.map((a, idx) => (
          <li key={idx} className="border rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{a.title}</span>
              <span className="text-xs text-gray-600">{a.date}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">{a.audience}</div>
            {a.priority && (
              <span
                className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                  a.priority === "High"
                    ? "bg-red-100 text-red-700"
                    : a.priority === "Medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {a.priority} priority
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardAnnouncements;
