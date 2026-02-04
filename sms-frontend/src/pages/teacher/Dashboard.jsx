import DashboardAnnouncements from "../../components/DashboardAnnouncements";
import DashboardEvents from "../../components/DashboardEvents";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  // Current teacher profile (to identify supervised classes)
  const { data: teacherProfile } = useQuery({
    queryKey: ["dashboard", "teacher-profile"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/teachers/me`
      );
      if (!res.ok) throw new Error("Failed to fetch teacher profile");
      const json = await res.json();
      return json.data?.data || null;
    },
  });

  // Compute display name: prefer teacherProfile.surname, then cached user profiles
  const [displayName, setDisplayName] = useState("Teacher");
  useEffect(() => {
    if (teacherProfile?.name) {
      setDisplayName(teacherProfile.name);
      return;
    }
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "null");
      const n =
        cached?.teacherProfile?.name ||
        cached?.profile?.firstName ||
        cached?.profile?.lastName ||
        "Teacher";
      setDisplayName(n);
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/teachers/me`
        );
        if (res.ok) {
          const j = await res.json();
          const t = j?.data?.data;
          if (t?.name) setDisplayName(t.name);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [teacherProfile]);
  // Fetch teacher lessons to build timetable that matches Lessons page
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["dashboard", "teacher-lessons"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/lessons/my-lessons`
      );
      if (!res.ok) throw new Error("Failed to fetch lessons");
      const json = await res.json();
      return json.data?.data || [];
    },
  });

  // Fetch teacher assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["dashboard", "my-assignments"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/assignments/my-assignments`
      );
      if (!res.ok) throw new Error("Failed to fetch assignments");
      const json = await res.json();
      return json.data?.data || [];
    },
  });

  // Fetch announcements visible to teacher
  const { data: announcements = [] } = useQuery({
    queryKey: ["dashboard", "announcements"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements`
      );
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const json = await res.json();
      // Controller returns { data: { announcements: [...] } }
      return json.data?.announcements || [];
    },
  });

  // Fetch events visible to teacher
  const { data: events = [] } = useQuery({
    queryKey: ["dashboard", "events"],
    queryFn: async () => {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/events`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const json = await res.json();
      // Controller returns { data: { data: events } }
      return json.data?.data || [];
    },
  });

  const dayToAbbrev = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };

  const fmt = (d) => {
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

  const timetableEntries = (lessons || []).map((l) => ({
    day: dayToAbbrev[l.day] || l.day || "",
    time: `${fmt(l.startTime)} - ${fmt(l.endTime)}`,
    subject: `${l.classId?.name ? l.classId.name + " " : ""}${l.subject?.name || l.name || "Lesson"
      }`,
    room: l.classroom || l.classId?.name || "",
    meta: l.teacher?.name ? `By ${l.teacher.name}` : undefined,
  }));

  // Distinct classes from lessons
  const distinctClassIds = useMemo(() => {
    const ids = new Set();
    (lessons || []).forEach((l) => {
      const id = l.classId?._id || l.classId || null;
      if (id) ids.add(String(id));
    });
    return Array.from(ids);
  }, [lessons]);

  // Classes supervised by this teacher
  const { data: supervisedClasses = [] } = useQuery({
    queryKey: ["dashboard", "teacher-classes", teacherProfile?._id],
    enabled: !!teacherProfile?._id,
    queryFn: async () => {
      const res = await authService.authFetch(`${API_BASE_URL}/api/v1/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      const json = await res.json();
      const all = json.data?.data || [];
      return all.filter((c) => c?.supervisor?._id === teacherProfile._id);
    },
  });

  const supervisedClassIds = useMemo(
    () => supervisedClasses.map((c) => String(c._id)),
    [supervisedClasses]
  );

  // Prefer supervised classes; fall back to lesson-derived classes
  const classIds =
    supervisedClassIds.length > 0 ? supervisedClassIds : distinctClassIds;

  // Fetch student counts per class and sum
  const { data: totalStudents = 0 } = useQuery({
    queryKey: ["dashboard", "students-count", classIds],
    enabled: classIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        classIds.map(async (cid) => {
          const res = await authService.authFetch(
            `${API_BASE_URL}/api/v1/students/count?class=${encodeURIComponent(
              cid
            )}`
          );
          if (!res.ok) return 0;
          const json = await res.json();
          return json.total ?? 0;
        })
      );
      return results.reduce((a, b) => a + (Number(b) || 0), 0);
    },
  });

  // Compute assignments due within the next 7 days (exclude drafts)
  const assignmentsDueCount = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return (assignments || []).filter((a) => {
      const due = a?.dueDate ? new Date(a.dueDate) : null;
      const status = (a?.status || "").toLowerCase();
      if (!due) return false;
      const publishedLike = !["draft"].includes(status);
      return publishedLike && due >= now && due <= soon;
    }).length;
  }, [assignments]);

  const teacherStats = [
    {
      title: "My Classes",
      value: String(classIds.length || 0),
      icon: AcademicCapIcon,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      trend: `${classIds.length || 0} active this term`,
    },
    {
      title: "Total Students",
      value: String(totalStudents || 0),
      icon: UsersIcon,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      trend: `Across ${classIds.length || 0} classes`,
    },
    {
      title: "Assignments Due",
      value: String(assignmentsDueCount || 0),
      icon: ClipboardDocumentCheckIcon,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      trend: "Due this week",
    },
  ];

  // Map announcements to dashboard items
  const announcementItems = useMemo(() => {
    return (announcements || []).map((a) => {
      const created = a?.createdAt ? new Date(a.createdAt) : null;
      const dateStr = created ? created.toLocaleDateString() : "";
      const priority = a?.isPinned
        ? "High"
        : a?.status === "Urgent"
          ? "High"
          : a?.status === "Draft"
            ? "Low"
            : undefined;
      return {
        title: a?.title || "",
        date: dateStr,
        audience: a?.audience || "",
        priority,
        status: a?.status,
      };
    });
  }, [announcements]);

  // Map events to dashboard items (upcoming only)
  const eventItems = useMemo(() => {
    const now = new Date();
    const upcoming = (events || [])
      .filter((e) => {
        const end = e?.endTime ? new Date(e.endTime) : null;
        const start = e?.startTime ? new Date(e.startTime) : null;
        const edge = end || start;
        return edge ? edge >= now : true;
      })
      .sort((a, b) => {
        const aT = a?.startTime ? new Date(a.startTime).getTime() : 0;
        const bT = b?.startTime ? new Date(b.startTime).getTime() : 0;
        return aT - bT;
      });

    const fmtDate = (d) => {
      try {
        return new Date(d).toLocaleDateString();
      } catch {
        return "";
      }
    };
    const fmtTime = (s, e) => {
      try {
        const sStr = s
          ? new Date(s).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "";
        const eStr = e
          ? new Date(e).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "";
        return eStr ? `${sStr} - ${eStr}` : sStr;
      } catch {
        return "";
      }
    };

    return upcoming.map((e) => ({
      title: e?.title || "",
      date: e?.startTime ? fmtDate(e.startTime) : "",
      time: fmtTime(e?.startTime, e?.endTime),
      location: e?.location || "",
      audience: e?.class?.name ? `Class: ${e.class.name}` : e?.audience || "",
      status: e?.status,
    }));
  }, [events]);

  return (
    <div className="space-y-8 p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {displayName}!
            </h1>
            <p className="text-indigo-100 text-lg">
              Ready to inspire minds today? Here's your teaching overview.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-indigo-200">Today</p>
              <p className="text-2xl font-semibold">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <CalendarDaysIcon className="w-12 h-12 text-indigo-200" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teacherStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </p>
              <p className="text-sm font-medium text-gray-600 mb-2">
                {stat.title}
              </p>
              <p className="text-xs text-gray-500">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <ClockIcon className="w-6 h-6 text-indigo-600 mr-2" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-colors group">
            <BookOpenIcon className="w-8 h-8 text-blue-600 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Create Lesson</p>
              <p className="text-sm text-gray-600">Plan your next class</p>
            </div>
          </button>
          <button className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-colors group">
            <ClipboardDocumentCheckIcon className="w-8 h-8 text-green-600 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">Grade Assignment</p>
              <p className="text-sm text-gray-600">Review student work</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Stunning Teaching Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center">
                    <CalendarDaysIcon className="w-8 h-8 mr-3" />
                    My Teaching Schedule
                  </h2>
                  <p className="text-indigo-100 mt-1">Your week at a glance</p>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-3xl font-bold">
                    {timetableEntries.length}
                  </div>
                  <div className="text-sm text-indigo-200">
                    Classes this week
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {lessonsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600">
                      Loading your schedule...
                    </span>
                  </div>
                </div>
              ) : timetableEntries.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No classes scheduled
                  </h3>
                  <p className="text-gray-500">
                    Enjoy your free time or plan new lessons!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => {
                    const dayClasses = timetableEntries.filter(
                      (entry) => entry.day === day
                    );
                    const dayColors = {
                      Mon: "from-blue-500 to-blue-600",
                      Tue: "from-emerald-500 to-emerald-600",
                      Wed: "from-amber-500 to-amber-600",
                      Thu: "from-purple-500 to-purple-600",
                      Fri: "from-pink-500 to-pink-600",
                    };

                    return (
                      <div key={day} className="space-y-3">
                        <div
                          className={`bg-gradient-to-r ${dayColors[day]} text-white p-3 rounded-lg text-center`}
                        >
                          <div className="font-bold text-lg">{day}</div>
                          <div className="text-xs opacity-90">
                            {dayClasses.length}{" "}
                            {dayClasses.length === 1 ? "class" : "classes"}
                          </div>
                        </div>

                        <div className="space-y-2 min-h-[200px]">
                          {dayClasses.length === 0 ? (
                            <div className="text-center py-6">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CalendarDaysIcon className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-500">Free day</p>
                            </div>
                          ) : (
                            dayClasses.map((classItem, idx) => (
                              <div
                                key={`${day}-${idx}`}
                                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                      {classItem.subject}
                                    </h4>
                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                      <ClockIcon className="w-4 h-4 mr-1" />
                                      {classItem.time}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></div>
                                    {classItem.room}
                                  </div>
                                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                                    <BookOpenIcon className="w-4 h-4 text-indigo-600" />
                                  </div>
                                </div>

                                {classItem.meta && (
                                  <div className="mt-2 text-xs text-gray-500 italic">
                                    {classItem.meta}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Schedule Summary Footer */}
            {!lessonsLoading && timetableEntries.length > 0 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <ChartBarIcon className="w-4 h-4 mr-2" />
                    <span>Weekly Overview</span>
                  </div>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span>{timetableEntries.length} total classes</span>
                    <span>•</span>
                    <span>
                      {new Set(timetableEntries.map((e) => e.subject)).size}{" "}
                      subjects
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Enhanced Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">
                Important Announcements
              </h3>
            </div>
            <DashboardAnnouncements role="teacher" items={announcementItems} />
          </div>

          {/* Enhanced Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">
                Upcoming Events
              </h3>
            </div>
            <DashboardEvents role="teacher" events={eventItems} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
