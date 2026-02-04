import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "../components/ProtectedRoute";
import Dashboard from "../pages/admin/Dashboard";
import FinanceDashboard from "../pages/admin/FinanceDashboard";
import Students from "../pages/shared/Students";
import ParentsAdmin from "../pages/admin/Parents";
import Finance from "../pages/admin/Finance";
import FinanceEnhanced from "../pages/admin/FinanceEnhanced";
import Events from "../pages/admin/Events";
import Announcements from "../pages/admin/Announcements";
import AdminProfile from "../pages/shared/AdminProfile";
import Menu from "../components/Menu";
import NotFound from "../pages/NotFound";

const FinanceLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg overflow-y-auto transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        <div className="flex items-center justify-center h-16 bg-green-600">
          <h1 className="text-white text-xl font-bold">Finance Admin</h1>
        </div>

        <div className="px-4">
          <Menu
            role="admin"
            userRole={user?.role || "finance_admin"}
            onMenuItemClick={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
            <span className="text-sm text-gray-600">
              Welcome, Finance Admin
            </span>
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              F
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
                  <FinanceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute requiredPermission="view_students">
                  <Students role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parents"
              element={
                <ProtectedRoute requiredPermission="view_parents">
                  <ParentsAdmin role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance-enhanced"
              element={
                <ProtectedRoute requiredPermission="view_finance">
                  <FinanceEnhanced />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute requiredPermission="view_events">
                  <Events role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute requiredPermission="view_announcements">
                  <Announcements role="admin" />
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<AdminProfile role="admin" />} />
            <Route path="/" element={<Dashboard role="admin" />} />
            {/* 404 Route - Catch all unmatched finance admin routes */}
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

export default FinanceLayout;
