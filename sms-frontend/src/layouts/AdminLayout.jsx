import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "../components/ProtectedRoute";
import Dashboard from "../pages/admin/Dashboard";
import Teachers from "../pages/shared/Teachers";
import Students from "../pages/shared/Students";
// Use admin-specific Parents page (includes Add Parent functionality)
import ParentsAdmin from "../pages/admin/Parents";
import Subjects from "../pages/shared/Subjects";
import Classes from "../pages/shared/Classes";
import AdminProfile from "../pages/shared/AdminProfile";
import Exams from "../pages/admin/Exams";
import Results from "../pages/admin/Results";
import Assignments from "../pages/admin/Assignments";
import Announcements from "../pages/admin/Announcements";
import Events from "../pages/admin/Events";
import Lessons from "../pages/admin/Lessons";
import Sessions from "../pages/shared/Sessions";
import StaffSessions from "../pages/admin/StaffSessions";
import Registration from "../pages/admin/Registration";
import AdminManagement from "../pages/admin/AdminManagement";
import FirstLoginTokenEvents from "../pages/admin/FirstLoginTokenEvents";
import SemesterManagement from "../pages/admin/SemesterManagement";
import Finance from "../pages/admin/Finance";
import AuditLogs from "../pages/admin/AuditLogs";
import Menu from "../components/Menu";
import NotFound from "../pages/NotFound";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg overflow-y-auto transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        <div className="flex items-center justify-center h-16 bg-indigo-600">
          <h1 className="text-white text-xl font-bold">SMS Admin</h1>
        </div>

        <div className="px-4">
          <Menu
            role="admin"
            userRole={user?.role || "super_admin"}
            onMenuItemClick={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 lg:pl-64">
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
            <span className="text-sm text-gray-600">Welcome, Admin</span>
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-x-hidden bg-gray-50 px-6 py-6">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredPermission="view_dashboard">
                  <Dashboard role="admin" />
                </ProtectedRoute>
              }
            />
            <Route path="/teachers" element={<Teachers role="admin" />} />
            <Route path="/students" element={<Students role="admin" />} />
            <Route path="/parents" element={<ParentsAdmin role="admin" />} />
            <Route path="/subjects" element={<Subjects role="admin" />} />
            <Route path="/classes" element={<Classes role="admin" />} />
            <Route path="/lessons" element={<Lessons role="admin" />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/staff-sessions" element={<StaffSessions />} />
            <Route path="/profile" element={<AdminProfile role="admin" />} />
            <Route path="/exams" element={<Exams role="admin" />} />
            <Route path="/results" element={<Results role="admin" />} />
            <Route
              path="/semester-management"
              element={<SemesterManagement />}
            />
            <Route path="/assignments" element={<Assignments role="admin" />} />
            <Route
              path="/announcements"
              element={<Announcements role="admin" />}
            />
            <Route path="/events" element={<Events role="admin" />} />
            <Route
              path="/registration"
              element={<Registration role="admin" />}
            />
            <Route path="/admin-management" element={<AdminManagement />} />
            <Route
              path="/audit/first-login-tokens"
              element={<FirstLoginTokenEvents role="admin" />}
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute requiredPermission="view_finance">
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requiredPermission="view_audit">
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Dashboard role="admin" />} />
            {/* 404 Route - Catch all unmatched admin routes */}
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

export default AdminLayout;
