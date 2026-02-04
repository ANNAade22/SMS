import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import authService from "../services/authService";
import Dashboard from "../pages/parent/Dashboard";
import Parents from "../pages/shared/Parents";
import Subjects from "../pages/shared/Subjects";
import ParentAnnouncements from "../pages/parent/Announcements";
import Assignments from "../pages/parent/Assignments";
import Results from "../pages/parent/Results";
import Events from "../pages/parent/Events";
import ParentProfile from "../pages/shared/ParentProfile";
import StudentProfile from "../pages/shared/StudentProfile";
import Menu from "../components/Menu";
import NotFound from "../pages/NotFound";

const ParentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "null");
      const fromProfile =
        cached?.parentProfile?.name ||
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
        <div className="flex items-center justify-center h-16 bg-purple-600">
          <h1 className="text-white text-xl font-bold">SMS Parent</h1>
        </div>

        <div className="px-4">
          <Menu role="parent" onMenuItemClick={() => setSidebarOpen(false)} />
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
              displayName || "Parent"
            }`}</span>
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(displayName || "P").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden bg-gray-50 pl-6 pr-0 pt-6 pb-6 min-h-0">
          <Routes>
            <Route path="/dashboard" element={<Dashboard role="parent" />} />
            <Route path="/parents" element={<Parents role="parent" />} />
            <Route path="/subjects" element={<Subjects role="parent" />} />
            <Route path="/announcements" element={<ParentAnnouncements />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/results" element={<Results />} />
            <Route path="/events" element={<Events />} />
            <Route path="/profile" element={<ParentProfile role="parent" />} />
            <Route
              path="/student-profile"
              element={<StudentProfile role="parent" />}
            />
            <Route path="/" element={<Dashboard role="parent" />} />
            {/* 404 Route - Catch all unmatched parent routes */}
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

export default ParentLayout;
