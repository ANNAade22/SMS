// src/pages/Unauthorized.jsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleGoBack = () => {
    // If unauthenticated just go home
    if (!user) return navigate("/");

    const token = authService.getToken();
    if (!token) return handleLogout();

    // Determine if user attempted to access a route outside their role scope
    const reason = location.state?.reason;

    // fromPath classification removed (not needed currently)

    // Special handling for exam_admin - redirect to exams instead of dashboard
    if (user.role === "exam_admin") {
      return navigate("/admin/exams");
    }

    // Special handling for finance_admin - redirect to finance page
    if (user.role === "finance_admin") {
      return navigate("/admin/finance");
    }

    // Map roles to dashboard base route
    const roleMapping = {
      super_admin: "admin",
      school_admin: "admin",
      academic_admin: "admin",
      student_affairs_admin: "admin",
      it_admin: "admin",
      teacher: "teacher",
      student: "student",
      parent: "parent",
    };

    const userDash = roleMapping[user.role] || "";

    // If reason is role mismatch and user tried an area they don't belong to,
    // send them to their own dashboard (if they have one) otherwise home.
    if (reason === "role_mismatch") {
      if (userDash) return navigate(`/${userDash}/dashboard`);
      return navigate("/");
    }

    // If they are already in their correct area but lacking permission/department, just go dashboard of same area
    if (reason === "permission" || reason === "department") {
      if (userDash) return navigate(`/${userDash}/dashboard`);
    }

    // Fallback: root
    navigate("/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Auto-logout if we detect missing/expired token while on unauthorized page
  useEffect(() => {
    const token = authService.getToken();
    if (!token && user) {
      handleLogout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
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
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have permission to access this page.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoBack}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Dashboard
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
