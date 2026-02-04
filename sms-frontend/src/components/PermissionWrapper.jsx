import { useAuth } from "../hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

const PermissionWrapper = ({
  children,
  requiredPermission,
  fallbackMessage = "You don't have permission to access this page.",
  showFallback = true,
}) => {
  const { hasPermission, user } = useAuth();
  const location = useLocation();

  // If no permission required, render children
  if (!requiredPermission) {
    return children;
  }

  // Check if user has the required permission
  if (!hasPermission(requiredPermission)) {
    if (showFallback) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">{fallbackMessage}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => (window.location.href = "/admin/dashboard")}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      // Redirect to unauthorized page
      return (
        <Navigate
          to="/unauthorized"
          replace
          state={{ from: location, reason: "permission" }}
        />
      );
    }
  }

  return children;
};

export default PermissionWrapper;

