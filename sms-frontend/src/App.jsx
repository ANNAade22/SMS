import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import FirstLogin from "./pages/FirstLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import FinanceLayout from "./layouts/FinanceLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import StudentLayout from "./layouts/StudentLayout";
import ParentLayout from "./layouts/ParentLayout";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="h-screen bg-gray-50 overflow-hidden">
            <Routes>
              {/* Login & First-Time Setup Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/first-login" element={<FirstLogin />} />

              {/* Unauthorized Route */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              />

              {/* Finance Admin Routes */}
              <Route
                path="/finance-admin/*"
                element={
                  <ProtectedRoute requiredRole="finance_admin">
                    <FinanceLayout />
                  </ProtectedRoute>
                }
              />

              {/* Teacher Routes */}
              <Route
                path="/teacher/*"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherLayout />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student/*"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLayout />
                  </ProtectedRoute>
                }
              />

              {/* Parent Routes */}
              <Route
                path="/parent/*"
                element={
                  <ProtectedRoute requiredRole="parent">
                    <ParentLayout />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route - Catch all unmatched routes */}
              <Route path="*" element={<NotFound />} />
            </Routes>{" "}
            {/* Toast Notifications */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
            <PWAInstallPrompt />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
