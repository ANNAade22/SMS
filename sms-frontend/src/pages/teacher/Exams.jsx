import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";

const formatTime = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const Exams = () => {
  const [range, setRange] = useState("today"); // "today" | "week"
  const [, setTicker] = useState(0); // minute ticker for countdown updates

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["teacherExams"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/exams/my-exams`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch exams");
      return json.data?.data || [];
    },
  });

  // Re-render every minute for live countdown updates
  useEffect(() => {
    const id = setInterval(() => setTicker((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const filterBounds = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (range === "today") {
      return {
        start: new Date(y, m, d, 0, 0, 0, 0),
        end: new Date(y, m, d, 23, 59, 59, 999),
      };
    }

    // Week range: Monday 00:00 to Sunday 23:59:59 of this week
    const dayIdx = today.getDay(); // 0=Sun,1=Mon
    const diffToMon = (dayIdx + 6) % 7; // convert to 0=Mon..6=Sun
    const monday = new Date(y, m, d - diffToMon, 0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }, [range]);

  const visibleExams = useMemo(() => {
    const { start, end } = filterBounds;

    const withinRange = exams.filter((e) => {
      const st = e.startTime ? new Date(e.startTime) : null;
      return st && st >= start && st <= end;
    });
    // Sort by start time ascending for readability
    return withinRange.sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );
  }, [exams, filterBounds]);

  const countdownBadge = (exam) => {
    const now = new Date();
    const start = exam.startTime ? new Date(exam.startTime) : null;
    const end = exam.endTime ? new Date(exam.endTime) : null;
    if (!start) return null;

    if (now < start) {
      const ms = start - now;
      const mins = Math.max(1, Math.round(ms / 60000));
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      const label = hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
      return (
        <span className="inline-block px-2 py-1 text-xs rounded bg-amber-50 text-amber-700">
          Starts in {label}
        </span>
      );
    }
    if (end && now <= end) {
      return (
        <span className="inline-block px-2 py-1 text-xs rounded bg-green-50 text-green-700">
          Ongoing
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
        Ended
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {range === "today" ? "Today’s Exams" : "This Week’s Exams"}
          </h1>
          <p className="text-gray-600">
            You’re the supervising teacher. These are the scheduled exams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md shadow-sm overflow-hidden">
            <button
              onClick={() => setRange("today")}
              className={`px-3 py-1 text-sm border ${
                range === "today"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setRange("week")}
              className={`px-3 py-1 text-sm border-t border-b ${
                range === "week"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300"
              } border-r`}
            >
              This Week
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="text-gray-600">Loading exams...</span>
          </div>
        </div>
      ) : visibleExams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {range === "today" ? "No exams today" : "No exams this week"}
          </h3>
          <p className="text-gray-500">
            {range === "today"
              ? "You don't have any exams scheduled for today."
              : "You don't have any exams scheduled for this week."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleExams.map((exam) => {
            const title = exam.title || exam.type || "Exam";
            const when = `${formatTime(exam.startTime)} - ${formatTime(
              exam.endTime
            )}`;
            const scopeBits = [];
            if (exam.lesson?.name) scopeBits.push(exam.lesson.name);
            if (exam.subject?.name) scopeBits.push(exam.subject.name);
            if (exam.classId?.name) scopeBits.push(exam.classId.name);
            if (exam.roomNumber) scopeBits.push(`Room ${exam.roomNumber}`);
            const scope = scopeBits.join(" · ");

            return (
              <div
                key={exam._id}
                className="bg-white rounded-lg shadow p-4 flex items-start justify-between"
              >
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {title}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    {scope || "General"}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{when}</div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 text-xs rounded bg-blue-50 text-blue-700">
                    Exam
                  </span>
                  <div>{countdownBadge(exam)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Exams;
