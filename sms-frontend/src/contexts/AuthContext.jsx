import { useState, useEffect } from "react";
import authService from "../services/authService";
import { AuthContext } from "./AuthContextBase";
// Re-export for compatibility with existing imports elsewhere
export { AuthContext };

// Helper function to check if JWT token is expired
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    // If we can't parse the token, consider it expired
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        let token = authService.getToken();
        let storedUser = authService.getUser();
        const onLoginRoute =
          typeof window !== "undefined" &&
          (window.location.pathname === "/" ||
            window.location.pathname === "/login");

        // If no in-memory token but we have a stored user, attempt silent refresh
        // Skip this on the login route to avoid a noisy 401 refresh in console
        if (!token && storedUser && !onLoginRoute) {
          const refreshed = await authService.refresh();
          if (refreshed) {
            token = authService.getToken();
            // refresh() already persisted user if returned
            storedUser = authService.getUser() || storedUser;
          }
        }

        // No need for blind refresh - if we have no token and no user, just proceed without authentication
        if (!token && !storedUser) {
          setRefreshFailed(false);
          setLoading(false);
          return;
        }

        if (token && storedUser) {
          const expired = isTokenExpired(token);
          if (expired) {
            const refreshed = await authService.refresh();
            if (!refreshed) {
              authService.clearAuthData();
              setUser(null);
              setIsAuthenticated(false);
              setRefreshFailed(true);
              return;
            }
            token = authService.getToken();
            storedUser = authService.getUser() || storedUser;
          }

          // Set state from stored user
          setUser(storedUser);
          setIsAuthenticated(true);

          // Background validation (non-fatal on failure except 401)
          setTimeout(async () => {
            try {
              const { response } = await authService.getProfile();
              if (!response.ok && response.status === 401) {
                authService.clearAuthData();
                setUser(null);
                setIsAuthenticated(false);
              }
            } catch (err) {
              // Non-fatal network issue
              console.warn("Background profile check failed:", err.message);
            }
          }, 800);
        } else {
          // No authentication data available - user not logged in
          setUser(null);
          setIsAuthenticated(false);
          setRefreshFailed(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        authService.clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        setRefreshFailed(true);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [refreshFailed]);

  // Removed aggressive token expiry polling; refresh flow handles continuity.

  // Idle auto-logout (10 minutes of no user interaction)
  useEffect(() => {
    if (!isAuthenticated) return; // Only when logged in

    const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
    let idleTimerId;

    const resetIdleTimer = () => {
      if (idleTimerId) clearTimeout(idleTimerId);
      idleTimerId = setTimeout(async () => {
        try {
          await authService.logout();
        } catch (e) {
          /* ignore logout network errors: */ void e;
        }
        authService.clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
      }, IDLE_LIMIT_MS);
    };

    // Activity events that reset the idle timer
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];
    const onActivity = () => {
      // Only reset when tab is visible to avoid extending sessions in background
      if (document.visibilityState === "visible") resetIdleTimer();
    };

    activityEvents.forEach((evt) => window.addEventListener(evt, onActivity));
    // Start timer immediately
    resetIdleTimer();

    return () => {
      if (idleTimerId) clearTimeout(idleTimerId);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, onActivity)
      );
    };
  }, [isAuthenticated]);

  // Login function
  const login = async (credentials) => {
    try {
      const { response, data, passwordChangeRequired } =
        await authService.login(credentials);

      if (passwordChangeRequired) {
        // Partial user data for display, but do not set authenticated
        const partialUser = data.data?.user;
        if (partialUser) {
          setUser(partialUser);
        }
        return { success: false, passwordChangeRequired: true, data };
      }

      if (response.ok) {
        const userData = data.data.user;
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const { response, data } = await authService.updateProfile(profileData);

      if (response.ok) {
        const updatedUser = data.data.user;
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error("Update profile error:", error);
      return { success: false, error: "Network error" };
    }
  };

  // Update password
  const updatePassword = async (passwordData) => {
    try {
      const { response, data } = await authService.updatePassword(passwordData);

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error("Update password error:", error);
      return { success: false, error: "Network error" };
    }
  };

  // Sync context state from authService (call after manual auth changes like first login)
  const syncAuthState = () => {
    const token = authService.getToken();
    const storedUser = authService.getUser();
    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      setRefreshFailed(false);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Check permissions
  const hasPermission = (permission) => {
    return authService.hasPermission(permission);
  };

  // Check department access
  const canAccessDepartment = (department) => {
    return authService.canAccessDepartment(department);
  };

  // Get user role
  const getUserRole = () => {
    return authService.getUserRole();
  };

  // Get user department
  const getUserDepartment = () => {
    return authService.getUserDepartment();
  };

  // Get user permissions
  const getUserPermissions = () => {
    return authService.getUserPermissions();
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    refreshFailed,
    login,
    logout,
    updateProfile,
    updatePassword,
    syncAuthState,
    hasPermission,
    canAccessDepartment,
    getUserRole,
    getUserDepartment,
    getUserPermissions,
  };

  // Redirect once after refresh failure when unauthenticated
  useEffect(() => {
    if (refreshFailed && !isAuthenticated && !loading) {
      const id = setTimeout(() => {
        if (window.location.pathname !== "/") window.location.replace("/");
      }, 1200);
      return () => clearTimeout(id);
    }
  }, [refreshFailed, isAuthenticated, loading]);

  if (loading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <span className="text-lg font-medium">Restoring session…</span>
          </div>
          {refreshFailed && (
            <div className="text-sm text-red-500 mt-2">
              Session expired. Redirecting to login…
            </div>
          )}
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
// Splash styling could be moved, kept inline for simplicity
export const AuthSplash = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-600">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <span className="text-lg font-medium">Restoring session…</span>
      </div>
      <p className="text-sm text-gray-500">Please wait a moment</p>
    </div>
  );
};
