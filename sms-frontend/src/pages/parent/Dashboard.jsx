import { useEffect, useMemo, useState } from "react";
import TimetableCard from "../../components/TimetableCard";
import DashboardAnnouncements from "../../components/DashboardAnnouncements";
import DashboardEvents from "../../components/DashboardEvents";
import FeeDisplay from "../../components/FeeDisplay";
import PaymentReminderPopup from "../../components/PaymentReminderPopup";
import { usePaymentReminders } from "../../hooks/usePaymentReminders";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import {
  Loader2,
  BookOpen,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  Users,
  BarChart3,
  Star,
  CheckCircle,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

const Dashboard = ({ role = "parent" }) => {
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

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [children, setChildren] = useState([]); // [{_id, name, class: { _id, name }, grade: { _id, level}}]
  const [selectedChildId, setSelectedChildId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]); // [{date, status, subject}]
  const [attendanceRate, setAttendanceRate] = useState(0); // percentage
  const [recentGrades, setRecentGrades] = useState([]); // [{subject, grade, date}]
  const [, setExams] = useState([]); // [{title, type, subject, class, totalMarks, teacher, date}]
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [examStats, setExamStats] = useState({
    totalExams: 0,
    completedExams: 0,
    averageScore: 0,
    upcomingCount: 0,
  });
  const { showReminder, dismissReminder } = usePaymentReminders();

  // Helpers
  const dayMap = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };
  const fmtDate = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return d;
    }
  };
  const fmtTimeRange = (start, end) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const opt = { hour: "2-digit", minute: "2-digit" };
      return `${s.toLocaleTimeString([], opt)} - ${e.toLocaleTimeString(
        [],
        opt
      )}`;
    } catch {
      return "";
    }
  };

  // Load children (students) for this parent, then announcements/events
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // 1) Get current user to resolve parentProfile id
        let parentId = null;
        try {
          const { response, data } = await authService.getProfile();
          if (response?.ok) {
            const parentProfile =
              data?.data?.data?.parentProfile || data?.data?.parentProfile;
            parentId = parentProfile
              ? parentProfile._id || parentProfile
              : null;
          }
        } catch {
          // fallback to cached user
          const u = authService.getUser();
          const cachedProfile = u?.parentProfile;
          parentId = cachedProfile ? cachedProfile._id || cachedProfile : null;
        }

        if (!parentId) {
          throw new Error("No parent profile linked to this account");
        }

        // 2) Load children via students my-children endpoint
        const resChildren = await authService.authFetch(
          `${API_BASE_URL}/api/v1/students/my-children`
        );
        const dataChildren = await resChildren.json();
        const kids = (dataChildren?.data?.data || dataChildren?.data || []).map(
          (s) => ({
            _id: s._id,
            name: s.name + (s.surname ? ` ${s.surname}` : ""),
            class: s.class,
            grade: s.grade,
          })
        );
        if (!cancelled) {
          setChildren(kids);
          if (kids.length && !selectedChildId) {
            setSelectedChildId(kids[0]._id);
          }
        }

        // 3) Load announcements (top few)
        const resAnn = await authService.authFetch(
          `${API_BASE_URL}/api/v1/announcements?limit=5`
        );
        const dataAnn = await resAnn.json();
        const anns = (dataAnn?.data?.announcements || []).map((a) => ({
          title: a.title,
          date: fmtDate(a.createdAt),
          audience: a.audience,
          status: a.status,
          createdAt: a.createdAt,
        }));
        if (!cancelled) setAnnouncements(anns);

        // 4) Load events (top few)
        const resEvents = await authService.authFetch(
          `${API_BASE_URL}/api/v1/events?limit=5&sort=-startTime`
        );
        const dataEvents = await resEvents.json();
        const evs = (dataEvents?.data?.data || []).map((e) => ({
          title: e.title,
          date: fmtDate(e.startTime || e.createdAt),
          time: e.startTime
            ? new Date(e.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          location: e.location || "",
          audience: e.audience || "",
          status: e.status || "Upcoming",
        }));
        if (!cancelled) setEvents(evs);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load lessons for selected child
  useEffect(() => {
    let cancelled = false;
    const fetchLessons = async () => {
      if (!selectedChildId) return;
      const child = children.find((c) => c._id === selectedChildId);
      if (!child?.class?._id && !child?.class) return;
      const classId = child.class._id || child.class;

      // Calculate current week (Monday to Sunday)
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const weekStart = monday.toISOString();
      const weekEnd = sunday.toISOString();

      try {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/lessons?classId=${encodeURIComponent(
            classId
          )}&startTime[gte]=${weekStart}&startTime[lte]=${weekEnd}&limit=100`
        );
        const data = await res.json();
        const ls = (data?.data?.data || data?.data || []).map((l) => ({
          day:
            dayMap[l.day] ||
            new Date(l.startTime).toLocaleDateString("en-US", {
              weekday: "short",
            }),
          time: fmtTimeRange(l.startTime, l.endTime),
          subject: l.subject?.name || l.name || "Lesson",
          room: l.classId?.name || "",
          meta: l.teacher?.name ? `Teacher: ${l.teacher.name}` : undefined,
        }));
        if (!cancelled) setLessons(ls);
      } catch {
        if (!cancelled) setLessons([]);
      }
    };
    fetchLessons();
    return () => {
      cancelled = true;
    };
    // dayMap is stable; helpers defined above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, children]);

  // Load attendance and grades for selected child
  useEffect(() => {
    let cancelled = false;
    const fetchChildData = async () => {
      if (!selectedChildId) return;
      try {
        // Recent attendance
        const resAtt = await authService.authFetch(
          `${API_BASE_URL}/api/v1/attendance?student=${encodeURIComponent(
            selectedChildId
          )}&limit=10&sort=-date`
        );
        const dataAtt = await resAtt.json();
        const atts = (dataAtt?.data?.data || dataAtt?.data || []).map((a) => ({
          date: fmtDate(a.date),
          status:
            a.status === "present"
              ? "Present"
              : a.status === "absent"
              ? "Absent"
              : a.status === "late"
              ? "Late"
              : "Present",
          subject: a.class?.name || "Class",
        }));
        if (!cancelled) {
          setRecentAttendance(atts.slice(0, 5));
          // Calculate attendance rate (simple: present / total * 100)
          const total = atts.length;
          const present = atts.filter((a) => a.status === "Present").length;
          setAttendanceRate(
            total > 0 ? Math.round((present / total) * 100) : 0
          );
        }

        // Recent grades (using results API)
        const resGrades = await authService.authFetch(
          `${API_BASE_URL}/api/v1/results/by-student?student=${encodeURIComponent(
            selectedChildId
          )}&limit=5&sort=-date`
        );
        const dataGrades = await resGrades.json();
        const grs = (dataGrades?.data?.data || dataGrades?.data || []).map(
          (g) => ({
            subject: g.subject?.name || g.assessmentTitle || "Subject",
            grade: g.grade || g.letterGrade || "A",
            date: fmtDate(g.date || g.createdAt),
          })
        );
        if (!cancelled) setRecentGrades(grs);

        // Load exams for selected child
        const resExams = await authService.authFetch(
          `${API_BASE_URL}/api/v1/exams/student?student=${encodeURIComponent(
            selectedChildId
          )}&limit=20&sort=-startTime`
        );
        const dataExams = await resExams.json();
        const examData = (dataExams?.data?.data || dataExams?.data || []).map(
          (e) => {
            const now = new Date();
            const examDate = e.startTime
              ? new Date(e.startTime)
              : e.date
              ? new Date(e.date)
              : new Date(e.createdAt);
            const isPast = examDate < now;
            const hasScore = e.score !== null && e.score !== undefined;

            return {
              id: e._id,
              title: e.title || "Exam",
              type: e.type || "Quiz",
              subject: e.subject?.name || "Subject",
              class: e.classId?.name || e.class?.name || "Class",
              totalMarks: e.totalMarks || 100,
              teacher: e.teacher?.name
                ? `${e.teacher.name} ${e.teacher.surname || ""}`.trim()
                : e.teacher?.surname
                ? e.teacher.surname
                : "Teacher Not Assigned",
              date: e.startTime
                ? fmtDate(e.startTime)
                : e.date
                ? fmtDate(e.date)
                : fmtDate(e.createdAt),
              status: e.status || (isPast ? "Completed" : "Upcoming"),
              score: e.score || null,
              isCompleted: e.status === "Completed" || hasScore || isPast,
            };
          }
        );

        if (!cancelled) {
          setExams(examData);
          setUpcomingExams(examData.filter((e) => !e.isCompleted).slice(0, 5));

          // Calculate exam stats
          const totalExams = examData.length;
          const completedExams = examData.filter((e) => e.isCompleted).length;
          const scores = examData
            .filter((e) => e.score !== null)
            .map((e) => e.score);
          const averageScore =
            scores.length > 0
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0;
          const upcomingCount = examData.filter((e) => !e.isCompleted).length;

          setExamStats({
            totalExams,
            completedExams,
            averageScore,
            upcomingCount,
          });
        }
      } catch {
        if (!cancelled) {
          setRecentAttendance([]);
          setAttendanceRate(0);
          setRecentGrades([]);
        }
      }
    };
    fetchChildData();
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  const timetable = useMemo(() => lessons, [lessons]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {roleTitles[role] || "Dashboard"}
                </h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">
                  {roleDescriptions[role] || "Dashboard overview"}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {loading && (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-spin" />
                )}
                <select
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm font-medium"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  disabled={children.length === 0}
                >
                  {children.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Role: {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Attendance Rate */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Attendance Rate
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {attendanceRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Exams */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Total Exams
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {examStats.totalExams}
                </p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Average Score
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {examStats.averageScore}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Recent exams</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Upcoming
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {examStats.upcomingCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Exams pending</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0 ml-2">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Fee Information Section */}
        {selectedChildId && (
          <div className="mb-6 sm:mb-8">
            <FeeDisplay studentId={selectedChildId} userRole="parent" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Timetable */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                  This Week&apos;s Timetable
                </h2>
                <p className="text-blue-100 mt-1 text-sm sm:text-base">
                  {children.find((c) => c._id === selectedChildId)?.name ||
                    "No child selected"}
                </p>
              </div>
              <div className="p-4 sm:p-6">
                <TimetableCard title="" entries={timetable} />
              </div>
            </div>

            {/* Upcoming Exams */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                  Upcoming Exams
                </h2>
                <p className="text-orange-100 mt-1 text-sm sm:text-base">
                  Prepare for these upcoming assessments
                </p>
              </div>
              <div className="p-4 sm:p-6">
                {upcomingExams.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-gray-500 text-base sm:text-lg">
                      No upcoming exams
                    </p>
                    <p className="text-gray-400 text-sm">All caught up! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingExams.map((exam, idx) => (
                      <div
                        key={exam.id || idx}
                        className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                            {exam.title}
                          </h3>
                          <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full self-start sm:self-auto">
                            {exam.type}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center text-gray-600">
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-blue-500 flex-shrink-0" />
                            <span className="truncate">{exam.subject}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-500 flex-shrink-0" />
                            <span className="truncate">{exam.class}</span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-purple-500 flex-shrink-0" />
                            <span className="truncate">
                              {exam.totalMarks} marks
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">{exam.teacher}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                          <span className="text-xs sm:text-sm text-gray-500">
                            {exam.date}
                          </span>
                          <div className="flex items-center text-orange-600">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">
                              Upcoming
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Recent Attendance */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 sm:px-6 py-3 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Recent Attendance
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                {recentAttendance.length === 0 ? (
                  <div className="text-center py-3 sm:py-4">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs sm:text-sm">
                      No recent attendance
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {recentAttendance.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {att.date}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {att.subject}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                            att.status === "Present"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {att.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Grades */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 sm:px-6 py-3 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Recent Grades
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                {recentGrades.length === 0 ? (
                  <div className="text-center py-3 sm:py-4">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs sm:text-sm">
                      No recent grades
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {recentGrades.map((g, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {g.subject}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {g.date}
                          </p>
                        </div>
                        <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 text-xs sm:text-sm font-semibold rounded-full flex-shrink-0 ml-2">
                          {g.grade}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-4 sm:px-6 py-3 sm:py-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Quick Stats
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Completed Exams
                    </span>
                    <span className="text-base sm:text-lg font-bold text-green-600">
                      {examStats.completedExams}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Success Rate
                    </span>
                    <span className="text-base sm:text-lg font-bold text-blue-600">
                      {examStats.totalExams > 0
                        ? Math.round(
                            (examStats.completedExams / examStats.totalExams) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Attendance
                    </span>
                    <span className="text-base sm:text-lg font-bold text-purple-600">
                      {attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DashboardAnnouncements role={role} items={announcements} />
            <DashboardEvents role={role} events={events} />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Reminder Popup */}
      {showReminder && selectedChildId && (
        <PaymentReminderPopup
          studentId={selectedChildId}
          isOpen={showReminder}
          onClose={dismissReminder}
        />
      )}
    </div>
  );
};

export default Dashboard;
