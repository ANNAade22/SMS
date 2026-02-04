import TimetableCard from "../../components/TimetableCard";
import DashboardAnnouncements from "../../components/DashboardAnnouncements";
import DashboardEvents from "../../components/DashboardEvents";
import FeeDisplay from "../../components/FeeDisplay";
import PaymentReminderPopup from "../../components/PaymentReminderPopup";
import { usePaymentReminders } from "../../hooks/usePaymentReminders";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const Dashboard = ({ role = "student" }) => {
  const { showReminder, dismissReminder } = usePaymentReminders();

  // Payment notification states
  const [showOverdueNotification, setShowOverdueNotification] = useState(false);
  const [showDueSoonNotification, setShowDueSoonNotification] = useState(false);
  const [feeAssignments, setFeeAssignments] = useState([]);

  const roleTitles = {
    admin: "Admin Dashboard",
    teacher: "Teacher Dashboard",
    student: "Student Dashboard",
    parent: "Parent Dashboard",
  };

  const roleDescriptions = {
    admin: "Overview of school management system",
    teacher: "Your teaching activities and student progress",
    student: "Your academic progress and assignments",
    parent: "Your children's academic information",
  };

  // Live data wiring
  const dayToAbbrev = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };

  const fmtTime = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "--:--";
    }
  };

  // Current user with populated student profile
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users/me`
      );
      if (!res.ok) throw new Error("Failed to fetch profile");
      const json = await res.json();
      return json.data?.data || json.data || json;
    },
  });

  const studentClassId =
    me?.studentProfile?.class || me?.studentProfile?.classId || me?.class;

  // Lessons for the student's class
  const {
    data: lessons = [],
    isLoading: lessonsLoading,
    error: lessonsError,
    refetch: refetchLessons,
  } = useQuery({
    queryKey: ["dashboard", "student-lessons", studentClassId],
    enabled: !!studentClassId,
    queryFn: async () => {
      console.log("🔍 Fetching lessons for classId:", studentClassId);
      const url = new URL(`${API_BASE_URL}/api/v1/lessons`);
      url.searchParams.set("classId", studentClassId);
      url.searchParams.set("limit", "500");
      url.searchParams.set("sort", "day,startTime");
      console.log("📡 API URL:", url.toString());

      const res = await authService.authFetch(url.toString());
      console.log("📡 API Response status:", res.status);

      if (!res.ok) {
        console.error("❌ API Error:", res.status, res.statusText);
        throw new Error(`Failed to fetch lessons: ${res.status}`);
      }

      const json = await res.json();
      console.log("📡 API Response data:", json);

      const items = json.data?.data || json.data || [];
      console.log("📚 Raw lessons count:", items.length);

      // Filter by validity window (now within [validFrom, validTo])
      const now = new Date();
      const filteredItems = items.filter((l) => {
        const vf = l.validFrom ? new Date(l.validFrom) : null;
        const vt = l.validTo ? new Date(l.validTo) : null;
        const afterStart = !vf || now >= vf;
        const beforeEnd = !vt || now <= vt;
        return afterStart && beforeEnd;
      });

      console.log("📚 Filtered lessons count:", filteredItems.length);
      return filteredItems;
    },
  });

  const timetable = (lessons || []).map((l) => ({
    day: dayToAbbrev[l.day] || l.day || "",
    time: `${fmtTime(l.startTime)} - ${fmtTime(l.endTime)}`,
    subject: `${l.subject?.name || l.name || "Lesson"}`,
    room: l.classroom || l.classId?.name || "",
  }));

  // Debug timetable processing
  console.log("📅 Timetable processing:", {
    lessonsCount: lessons?.length || 0,
    timetableCount: timetable.length,
    timetableEntries: timetable,
    dayMapping: dayToAbbrev,
  });

  // Debug logging
  console.log("Student Dashboard Debug:", {
    me: me,
    studentClassId: studentClassId,
    lessons: lessons,
    timetable: timetable,
    lessonsLoading: lessonsLoading,
    meLoading: meLoading,
  });

  // Announcements for the current user (backend filters by role)
  const { data: announcements = [], isLoading: annLoading } = useQuery({
    queryKey: ["dashboard", "announcements"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements?limit=10`
      );
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const json = await res.json();
      const list =
        json.data?.announcements || json.data?.data || json.data || [];
      return list.map((a) => ({
        title: a.title,
        date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "",
        audience: a.audience || "",
        priority: a.priority || undefined,
        status: a.status || undefined,
      }));
    },
  });

  // Events (backend attempts role filtering, also filter by student's class client-side)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["dashboard", "events", studentClassId],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/events?sort=startTime&limit=20`
      );
      if (!res.ok) throw new Error("Failed to fetch events");
      const json = await res.json();
      const items = json.data?.data || json.data || [];
      const now = new Date();
      // Map then filter upcoming and match class/general audiences
      const mapped = items.map((e) => {
        const start = e.startTime ? new Date(e.startTime) : null;
        const end = e.endTime ? new Date(e.endTime) : null;
        const safeAudience =
          e.audience || (e.class ? `class_${e.class?._id || e.class}` : "");
        return {
          raw: e,
          title: e.title,
          date: start ? start.toLocaleDateString() : "",
          time: start
            ? start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "",
          location: e.location || "",
          audience: safeAudience,
          status: e.status || undefined,
          start,
          end,
        };
      });
      const classToken = studentClassId ? `class_${studentClassId}` : null;
      const generalAudiences = new Set([
        "All Students",
        "Students & Parents",
        "All (Teachers, Students & Parents)",
        "All",
        "School Community",
        "All Users",
        "All Staff",
      ]);
      const filtered = mapped.filter((e) => {
        // Upcoming if start in future, within [start,end], or inferred by status when time missing
        const statusStr = (e.status || "").toLowerCase();
        const inferredUpcoming =
          !e.start &&
          (statusStr.includes("upcoming") ||
            statusStr.includes("planning") ||
            statusStr.includes("ongoing"));
        const withinWindow = e.start && e.end && now >= e.start && now <= e.end;
        const isUpcoming =
          inferredUpcoming || withinWindow || !e.start || e.start >= now;

        const aud = (e.audience || "").toString().trim();
        const audLower = aud.toLowerCase();
        const isGeneral =
          generalAudiences.has(aud) ||
          generalAudiences.has(aud.replace(/\s+/g, " ")) ||
          audLower.includes("student") ||
          audLower.includes("school community") ||
          audLower.includes("all users") ||
          audLower.includes("all staff");

        const isClassMatch =
          classToken && aud.startsWith("class_")
            ? aud === classToken
            : !!e.raw?.class &&
              (e.raw.class?._id === studentClassId ||
                e.raw.class?.toString() === studentClassId);

        return isUpcoming && (isGeneral || isClassMatch);
      });
      // Sort by start date ascending
      filtered.sort(
        (a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0)
      );
      return filtered.map((e) => {
        const out = { ...e };
        delete out.raw;
        delete out.start;
        return out;
      });
    },
  });

  // Fetch fee assignments for payment notifications
  const { data: feeAssignmentsData = [] } = useQuery({
    queryKey: ["dashboard", "fee-assignments", me?.studentProfile?._id],
    enabled: !!me?.studentProfile?._id,
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fee-assignments/student/${me.studentProfile._id}`
      );
      if (!res.ok) throw new Error("Failed to fetch fee assignments");
      const json = await res.json();
      return json.data?.assignments || json.data || [];
    },
  });

  // Check for payment notifications
  useEffect(() => {
    if (feeAssignmentsData && feeAssignmentsData.length > 0) {
      setFeeAssignments(feeAssignmentsData);

      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Check for overdue payments
      const overduePayments = feeAssignmentsData.filter((assignment) => {
        const dueDate = new Date(assignment.dueDate);
        return dueDate < now && assignment.status !== "paid";
      });

      // Check for payments due soon (within next week)
      const dueSoonPayments = feeAssignmentsData.filter((assignment) => {
        const dueDate = new Date(assignment.dueDate);
        return (
          dueDate > now &&
          dueDate <= oneWeekFromNow &&
          assignment.status !== "paid"
        );
      });

      // Show notifications if there are overdue or due soon payments
      if (overduePayments.length > 0) {
        setShowOverdueNotification(true);
      }

      if (dueSoonPayments.length > 0) {
        setShowDueSoonNotification(true);
      }
    }
  }, [feeAssignmentsData]);

  // Calculate due soon payments count for display
  const dueSoonPaymentsCount = feeAssignments
    ? feeAssignments.filter((assignment) => {
        const now = new Date();
        const oneWeekFromNow = new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000
        );
        const dueDate = new Date(assignment.dueDate);
        return (
          dueDate > now &&
          dueDate <= oneWeekFromNow &&
          assignment.status !== "paid"
        );
      }).length
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Dashboard"}
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {roleDescriptions[role] || "Dashboard overview"}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 self-start sm:self-auto">
          Role: {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
      </div>

      {/* Fee Information Section */}
      {me?.studentProfile?._id && (
        <div className="mb-6">
          <FeeDisplay studentId={me.studentProfile._id} userRole="student" />
        </div>
      )}

      {/* Debug info - remove after testing */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 p-4 bg-gray-100 rounded text-xs">
          <div className="flex justify-between items-start">
            <div>
              <strong>Debug Info:</strong>
              <br />
              Student Profile ID: {me?.studentProfile?._id || "Not found"}
              <br />
              User ID: {me?._id || "Not found"}
              <br />
              Role: {me?.role || "Not found"}
              <br />
              Student Class ID: {studentClassId || "Not found"}
              <br />
              Lessons Count: {lessons?.length || 0}
              <br />
              Timetable Count: {timetable?.length || 0}
              <br />
              Lessons Loading: {lessonsLoading ? "Yes" : "No"}
              <br />
              Me Loading: {meLoading ? "Yes" : "No"}
              <br />
              Lessons Error: {lessonsError ? lessonsError.message : "None"}
              <br />
              API Base URL: {API_BASE_URL}
            </div>
            <button
              onClick={() => refetchLessons()}
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Refresh Lessons
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Timetable Section */}
        <div className="xl:col-span-2">
          {meLoading || lessonsLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex items-center gap-3 text-gray-600">
              <div className="w-5 h-5 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <span className="text-sm sm:text-base">
                Loading your timetable...
              </span>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-2 bg-yellow-100 rounded text-xs">
                <strong>Timetable Debug:</strong> Rendering TimetableCard with{" "}
                {timetable.length} entries
              </div>
              <div className="mb-4 p-4 bg-blue-100 rounded text-sm">
                <strong>Test:</strong> If you can see this, the timetable
                section is rendering.
                <br />
                Timetable entries:{" "}
                {JSON.stringify(timetable.slice(0, 2), null, 2)}
              </div>
              <TimetableCard
                title="This Week's Timetable"
                entries={timetable}
              />
            </div>
          )}
        </div>

        {/* Sidebar Section */}
        <div className="space-y-4 sm:space-y-6">
          {annLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 text-gray-600">
              <span className="text-sm sm:text-base">
                Loading announcements...
              </span>
            </div>
          ) : (
            <DashboardAnnouncements role={role} items={announcements} />
          )}
          {eventsLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 text-gray-600">
              <span className="text-sm sm:text-base">Loading events...</span>
            </div>
          ) : (
            <DashboardEvents role={role} events={events} />
          )}
        </div>
      </div>

      {/* Overdue Payments Notification */}
      {showOverdueNotification && (
        <div className="fixed inset-0 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-red-200 w-11/12 md:w-1/2 lg:w-1/3 shadow-2xl rounded-lg bg-red-50/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-red-800">
                    Overdue Payments
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowOverdueNotification(false)}
                className="text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="text-sm text-red-700 mb-4">
              Please make payment as soon as possible to avoid additional late
              fees.
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowOverdueNotification(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payments Due Soon Notification */}
      {showDueSoonNotification && (
        <div className="fixed inset-0 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-yellow-200 w-11/12 md:w-1/2 lg:w-1/3 shadow-2xl rounded-lg bg-yellow-50/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800">
                    {dueSoonPaymentsCount} Payments Due Soon
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowDueSoonNotification(false)}
                className="text-yellow-400 hover:text-yellow-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="text-sm text-yellow-700 mb-4">
              You have payments due within the next week.
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDueSoonNotification(false)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminder Popup */}
      {showReminder && me?.studentProfile?._id && (
        <PaymentReminderPopup
          studentId={me.studentProfile._id}
          isOpen={showReminder}
          onClose={dismissReminder}
        />
      )}
    </div>
  );
};

export default Dashboard;
