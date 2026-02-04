import { CalendarRange, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// events: [{ title, date, time, location, audience, status }]
const DashboardEvents = ({ role = "student", events = [] }) => {
  const basePath =
    role === "admin"
      ? "/admin"
      : role === "teacher"
      ? "/teacher"
      : role === "student"
      ? "/student"
      : "/parent";
  const top = events.slice(0, 3);
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Events
          </h2>
        </div>
        <Link
          to={`${basePath}/events`}
          className="text-sm text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <ul className="space-y-3">
        {top.length === 0 && (
          <li className="text-gray-500 text-sm">No upcoming events</li>
        )}
        {top.map((e, idx) => (
          <li key={idx} className="border rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{e.title}</span>
              <span className="text-xs text-gray-600">
                {e.date} {e.time ? `• ${e.time}` : ""}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              {e.location} — {e.audience}
            </div>
            {e.status && (
              <span
                className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                  e.status === "Upcoming"
                    ? "bg-green-100 text-green-700"
                    : e.status === "Planned"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {e.status}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DashboardEvents;
