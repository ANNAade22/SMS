import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import authService from "../services/authService";
import Dashboard from "../pages/student/Dashboard";
import Subjects from "../pages/shared/Subjects";
import StudentProfile from "../pages/shared/StudentProfile";
import StudentAnnouncements from "../pages/student/Announcements";
import StudentAssignments from "../pages/student/Assignments";
import StudentExams from "../pages/student/Exams";
import StudentResults from "../pages/student/Results";
import StudentEvents from "../pages/student/Events";
import Menu from "../components/Menu";
import NotFound from "../pages/NotFound";

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "null");
      const fromProfile =
        cached?.studentProfile?.name ||
        cached?.profile?.firstName ||
        cached?.profile?.lastName ||
        "";
      if (fromProfile) setDisplayName(fromProfile);
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const { response, data } = await authService.getProfile();
        if (response.ok && data?.data?.data) {
          const full = data.data.data;
          const name =
            full?.studentProfile?.name ||
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
        <div className="flex items-center justify-center h-16 bg-blue-600">
          <h1 className="text-white text-xl font-bold">SMS / Student</h1>
        </div>

        <div className="px-4">
          <Menu role="student" onMenuItemClick={() => setSidebarOpen(false)} />
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
              displayName || "Student"
            }`}</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(displayName || "S").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden bg-gray-50 px-4 sm:px-6 lg:px-8 py-6 min-h-0">
          <Routes>
            <Route path="/dashboard" element={<Dashboard role="student" />} />
            <Route path="/subjects" element={<Subjects role="student" />} />
            <Route path="/announcements" element={<StudentAnnouncements />} />
            <Route path="/assignments" element={<StudentAssignments />} />
            <Route path="/exams" element={<StudentExams />} />
            <Route path="/results" element={<StudentResults />} />
            <Route path="/events" element={<StudentEvents />} />
            <Route
              path="/profile"
              element={<StudentProfile role="student" />}
            />
            <Route path="/" element={<Dashboard role="student" />} />
            {/* 404 Route - Catch all unmatched student routes */}
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

export default StudentLayout;
