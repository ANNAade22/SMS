import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import authService from "../services/authService";
import { API_BASE_URL } from "../config";
import Dashboard from "../pages/teacher/Dashboard";
import Teachers from "../pages/shared/Teachers";
import Students from "../pages/shared/Students";
import Parents from "../pages/shared/Parents";
import Subjects from "../pages/shared/Subjects";
import StudentProfile from "../pages/shared/StudentProfile";
import Lessons from "../pages/teacher/Lessons";
import Exams from "../pages/teacher/Exams";
import Assignments from "../pages/teacher/Assignments";
import Events from "../pages/teacher/Events";
import Messages from "../pages/teacher/Messages";
import Announcements from "../pages/teacher/Announcements";
import Profile from "../pages/teacher/Profile";
import Settings from "../pages/teacher/Settings";
import Menu from "../components/Menu";
import NotFound from "../pages/NotFound";

const TeacherLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    // Try to use cached user first
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "null");
      const fromProfile =
        cached?.teacherProfile?.name ||
        cached?.studentProfile?.name ||
        cached?.parentProfile?.name ||
        cached?.profile?.firstName ||
        cached?.profile?.lastName ||
        "";
      if (fromProfile) setDisplayName(fromProfile);
    } catch {
      /* ignore */
    }
    // Prefer teacher profile endpoint for accurate name
    (async () => {
      try {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/teachers/me`
        );
        if (res.ok) {
          const json = await res.json();
          const t = json?.data?.data;
          const name = t?.name || "";
          if (name) {
            setDisplayName(name);
            return; // done
          }
        }
      } catch {
        /* ignore */
      }
    })();
    // Also fetch generic user profile in background as a fallback
    (async () => {
      try {
        const { response, data } = await authService.getProfile();
        if (response.ok && data?.data?.data) {
          const full = data.data.data;
          const name =
            full?.teacherProfile?.name ||
            full?.studentProfile?.name ||
            full?.parentProfile?.name ||
            full?.profile?.firstName ||
            full?.profile?.lastName ||
            "";
          if (name) setDisplayName(name);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-center h-16 bg-green-600">
          <h1 className="text-white text-xl font-bold">SMS Teacher</h1>
        </div>

        <div className="px-4">
          <Menu role="teacher" onMenuItemClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 bg-white shadow-sm px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{`Welcome, ${
              displayName || "Teacher"
            }`}</span>
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(displayName || "T").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden bg-gray-50 px-6 py-6 min-h-0">
          <Routes>
            <Route path="/dashboard" element={<Dashboard role="teacher" />} />
            <Route path="/teachers" element={<Teachers role="teacher" />} />
            <Route path="/students" element={<Students role="teacher" />} />
            <Route
              path="/student-profile"
              element={<StudentProfile role="teacher" />}
            />
            <Route path="/parents" element={<Parents role="teacher" />} />
            <Route path="/subjects" element={<Subjects role="teacher" />} />
            <Route path="/lessons" element={<Lessons role="teacher" />} />
            <Route path="/exams" element={<Exams role="teacher" />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/events" element={<Events role="teacher" />} />
            <Route path="/messages" element={<Messages role="teacher" />} />
            <Route
              path="/announcements"
              element={<Announcements role="teacher" />}
            />
            <Route path="/profile" element={<Profile role="teacher" />} />
            <Route path="/settings" element={<Settings role="teacher" />} />
            <Route path="/" element={<Dashboard role="teacher" />} />
            {/* 404 Route - Catch all unmatched teacher routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm bg-gray-900/10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default TeacherLayout;
