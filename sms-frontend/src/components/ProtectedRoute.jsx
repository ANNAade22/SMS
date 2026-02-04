// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({
  children,
  requiredRole,
  requiredDepartment,
  requiredPermission,
  fallbackPath = "/",
}) => {
  const { isAuthenticated, user, loading, hasPermission, canAccessDepartment } =
    useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole) {
    const userRole = user.role;
    let hasRequiredRole = false;

    if (requiredRole === "admin") {
      // Allow all admin roles
      // Accept umbrella 'admin' role in addition to specific *_admin and super_admin
      hasRequiredRole =
        userRole === "admin" ||
        userRole.includes("_admin") ||
        userRole === "super_admin";
    } else {
      // Exact match for other roles
      hasRequiredRole = userRole === requiredRole;
    }

    if (!hasRequiredRole) {
      return (
        <Navigate
          to="/unauthorized"
          replace
          state={{ from: location, reason: "role_mismatch" }}
        />
      );
    }
  }

  // Check department requirement
  if (requiredDepartment && !canAccessDepartment(requiredDepartment)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location, reason: "department" }}
      />
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location, reason: "permission" }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
