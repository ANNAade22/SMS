// src/services/authService.js
import { API_BASE_URL } from "../config";

class AuthService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this._accessToken = null;
    this._sessionKey = "sessionAccessToken";
    this._debug = false;
    this._refreshTimer = null;
    this._refreshInFlight = false;
    // Auto-enable debug if flag stored
    try {
      const stored = localStorage.getItem("DEBUG_MODE");
      if (stored === "true") this._debug = true;
    } catch {
      /* ignore */
    }
  }

  // Get stored token
  getToken() {
    if (!this._accessToken) {
      // Try to hydrate from sessionStorage (short-lived cache across refreshes)
      const cached = sessionStorage.getItem(this._sessionKey);
      if (cached) this._accessToken = cached;
    }
    return this._accessToken;
  }

  // Get stored user data
  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // Get user role
  getUserRole() {
    return localStorage.getItem("userRole");
  }

  // Get user department
  getUserDepartment() {
    return localStorage.getItem("userDepartment");
  }

  // Get user permissions
  getUserPermissions() {
    const permissions = localStorage.getItem("userPermissions");
    return permissions ? JSON.parse(permissions) : [];
  }

  // Check if user has permission
  hasPermission(permission) {
    const permissions = this.getUserPermissions();
    const user = this.getUser();

    // Super admin has all permissions
    if (user?.role === "super_admin") return true;

    // Finance admin has specific permissions based on role
    if (user?.role === "finance_admin") {
      const financeAdminPermissions = [
        "view_dashboard",
        "view_students",
        "view_parents",
        "view_finance",
        "view_events",
        "view_messages",
        "view_announcements",
      ];
      return financeAdminPermissions.includes(permission);
    }

    // Check stored permissions for other roles
    return permissions.includes(permission);
  }

  // Check if user needs to login (after refresh failure)
  needsLogin() {
    return !this.getToken() || !this.getUser();
  }

  // Force logout and redirect to login
  forceLogout() {
    this.clearAuthData();
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // ensure refreshToken, sid & csrfToken cookies are stored
      });

      const data = await response.json();

      // First-time password required flow
      if (data.status === "password_change_required") {
        const firstToken = data.firstLoginToken;
        if (firstToken) {
          try {
            sessionStorage.setItem("firstLoginToken", firstToken);
          } catch {
            /* ignore */
          }
        }
        // Store minimal user context (role, username) if provided
        if (data.data?.user) {
          localStorage.setItem(
            "pendingFirstLoginUser",
            JSON.stringify(data.data.user)
          );
        }
        return { response, data, passwordChangeRequired: true };
      }

      if (response.ok) {
        // Store authentication data (memory only)
        this._accessToken = data.token;
        // Short-lived cache in sessionStorage for page refresh continuity
        try {
          sessionStorage.setItem(this._sessionKey, data.token);
        } catch {
          /* ignore quota */
        }
        localStorage.setItem("user", JSON.stringify(data.data.user));

        const user = data.data.user;
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userDepartment", user.department);
        localStorage.setItem(
          "userPermissions",
          JSON.stringify(user.permissions || [])
        );
        // Schedule proactive refresh
        this._scheduleAutoRefresh(data.token);
        // --- PATCH: CSRF token will be fetched automatically on first API request ---
        // No need to fetch immediately after login, it will be handled by authFetch
      } else if (this._debug) {
        throw new Error(
          `Login failed: ${response.status} ${
            response.statusText
          } :: ${JSON.stringify(data)}`
        );
      }

      return { response, data };
    } catch (error) {
      console.error("Login network error:", error);
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }
  }

  // Complete first login password setup
  async completeFirstLogin(newPassword) {
    let token = null;
    try {
      token = sessionStorage.getItem("firstLoginToken");
    } catch {
      /* ignore */
    }
    if (!token) throw new Error("Missing first login token");
    const res = await fetch(`${this.baseURL}/api/v1/users/first-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to set password");
    }
    if (data.token) {
      this._accessToken = data.token;
      try {
        sessionStorage.setItem(this._sessionKey, data.token);
      } catch {
        /* ignore */
      }
      const user = data.data?.user;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userDepartment", user.department || "");
        localStorage.setItem(
          "userPermissions",
          JSON.stringify(user.permissions || [])
        );
      }
      try {
        sessionStorage.removeItem("firstLoginToken");
        localStorage.removeItem("pendingFirstLoginUser");
      } catch {
        /* ignore */
      }
      this._scheduleAutoRefresh(data.token);
      // --- PATCH: CSRF token will be fetched automatically on first API request ---
      // No need to fetch immediately after password setup, it will be handled by authFetch
      return user || true;
    }
    return false;
  }

  // Request password reset (sends email/token)
  async requestPasswordReset(username) {
    const res = await fetch(`${this.baseURL}/api/v1/users/forgotPassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to request password reset");
    }
    return data;
  }

  // Reset password using token (unauthenticated)
  async resetPassword(token, password) {
    const res = await fetch(
      `${this.baseURL}/api/v1/users/resetPassword/${encodeURIComponent(token)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to reset password");
    }
    // If backend issues full session on success, persist like login
    if (data.token) {
      this._accessToken = data.token;
      try {
        sessionStorage.setItem(this._sessionKey, data.token);
      } catch {
        /* ignore */
      }
      const user = data.data?.user;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userDepartment", user.department || "");
        localStorage.setItem(
          "userPermissions",
          JSON.stringify(user.permissions || [])
        );
      }
      this._scheduleAutoRefresh(data.token);
    }
    return data;
  }

  // Logout user
  async logout() {
    try {
      await this.authFetch(`${this.baseURL}/api/v1/users/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear local storage
    this.clearAuthData();
  }

  // Clear authentication data
  clearAuthData() {
    this._accessToken = null;
    // Clear any pending refresh timer
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._refreshInFlight = false;
    try {
      sessionStorage.removeItem(this._sessionKey);
    } catch {
      /* ignore */
    }
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userDepartment");
    localStorage.removeItem("userPermissions");
  }

  // Update password
  async updatePassword(passwordData) {
    const response = await this.authFetch(
      `${this.baseURL}/api/v1/users/updateMyPassword`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      }
    );

    const data = await response.json();
    return { response, data };
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await this.authFetch(`${this.baseURL}/api/v1/users/me`);
      const data = await response.json();
      return { response, data };
    } catch (error) {
      console.error("Get profile network error:", error);
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    const response = await this.authFetch(
      `${this.baseURL}/api/v1/users/updateMe`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      }
    );

    const data = await response.json();
    return { response, data };
  }

  // Get user's active sessions
  async getMySessions() {
    const response = await this.authFetch(
      `${this.baseURL}/api/v1/sessions/my-sessions`
    );

    const data = await response.json();
    return { response, data };
  }

  // Invalidate session
  async invalidateSession(sessionId) {
    const response = await this.authFetch(
      `${this.baseURL}/api/v1/sessions/${sessionId}`,
      { method: "DELETE" }
    );

    const data = await response.json();
    return { response, data };
  }

  // Invalidate all my sessions
  async invalidateAllMySessions() {
    const response = await this.authFetch(
      `${this.baseURL}/api/v1/sessions/my-sessions/all`,
      { method: "DELETE" }
    );
    const data = await response.json();
    return { response, data };
  }

  // Logout all sessions (server invalidates all user sessions)
  async logoutAll() {
    try {
      await this.authFetch(`${this.baseURL}/api/v1/users/logoutAll`, {
        method: "POST",
      });
    } catch (error) {
      console.error("logoutAll error:", error);
    }
    this.clearAuthData();
  }

  // Get audit logs
  async getAuditLogs(options = {}) {
    const queryParams = new URLSearchParams(options).toString();
    const response = await this.authFetch(
      `${this.baseURL}/api/v1/audit/my-logs?${queryParams}`
    );

    const data = await response.json();
    return { response, data };
  }

  // Get user activities
  async getActivities() {
    try {
      const response = await this.authFetch(
        `${this.baseURL}/api/v1/users/activities`
      );
      const data = await response.json();
      return { response, data };
    } catch (error) {
      console.error("Get activities network error:", error);
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }
  }

  // Get user stats
  async getStats() {
    try {
      const response = await this.authFetch(
        `${this.baseURL}/api/v1/users/stats`
      );
      const data = await response.json();
      return { response, data };
    } catch (error) {
      console.error("Get stats network error:", error);
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    }
  }

  // Admin regenerate first-login token for a user still in mustChangePassword state
  async regenerateFirstLoginToken(userId) {
    const res = await this.authFetch(
      `${this.baseURL}/api/v1/users/${userId}/first-password-token`,
      { method: "POST" }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to regenerate token");
    }
    return data.firstLoginToken;
  }
}

// Add refresh capability
AuthService.prototype.refresh = async function () {
  if (this._refreshInFlight) {
    if (this._debug)
      console.log("[AuthService] Refresh already in progress, skipping");
    return false;
  }

  this._refreshInFlight = true;
  try {
    if (this._debug) console.log("[AuthService] Attempting token refresh");

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${this.baseURL}/api/v1/users/refresh`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (this._debug) {
        console.error(
          `[AuthService] Refresh failed with status: ${response.status}`
        );
      }
      return false;
    }

    const data = await response.json();

    if (data.token) {
      if (this._debug) console.log("[AuthService] Refresh successful");
      this._accessToken = data.token;
      try {
        sessionStorage.setItem(this._sessionKey, data.token);
      } catch {
        /* ignore */
      }
      // Persist user details if provided (helps survive full page refresh)
      const refreshedUser = data?.data?.user;
      if (refreshedUser) {
        localStorage.setItem("user", JSON.stringify(refreshedUser));
        localStorage.setItem("userRole", refreshedUser.role);
        localStorage.setItem("userDepartment", refreshedUser.department || "");
        localStorage.setItem(
          "userPermissions",
          JSON.stringify(refreshedUser.permissions || [])
        );
      }
      // Reschedule next refresh
      this._scheduleAutoRefresh(data.token);
      return true;
    }

    if (this._debug) {
      console.error("[AuthService] Refresh response missing token", data);
    }
    return false;
  } catch (error) {
    if (this._debug) {
      if (error.name === "AbortError") {
        console.error("[AuthService] Refresh request timed out");
      } else {
        console.error("[AuthService] Refresh network error:", error);
      }
    }
    return false;
  } finally {
    this._refreshInFlight = false;
  }
};

// Wrapper fetch with auto refresh once on 401
AuthService.prototype.authFetch = async function (url, options = {}) {
  const token = this.getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Attach CSRF token for unsafe methods
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"];
  const method = (options.method || "GET").toUpperCase();
  if (unsafe.includes(method)) {
    let csrf = getCsrfTokenFromCookie();
    // If missing, attempt a silent refresh to obtain one (refresh endpoint issues token)
    if (!csrf) {
      try {
        if (this._debug)
          console.log(
            "[AuthService] No CSRF token, attempting refresh before unsafe request"
          );
        await this.refresh();
      } catch {
        /* ignore refresh failure here; will proceed */
      }
      csrf = getCsrfTokenFromCookie();
    }
    if (csrf) headers["x-csrf-token"] = csrf;
    else if (this._debug)
      console.warn(
        "[AuthService] Proceeding without CSRF token (likely to 403)"
      );
  }
  const first = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
  // If 403 due to CSRF missing, try to fetch a fresh token once then retry (only for unsafe)
  if (first.status === 403 && unsafe.includes(method)) {
    // Attempt to call /api/v1/users/csrf to rotate token (requires auth cookies/session)
    try {
      const csrfResponse = await fetch(`${this.baseURL}/api/v1/users/csrf`, {
        credentials: "include",
      });
      if (!csrfResponse.ok) {
        console.warn("[AuthService] CSRF token refresh failed during retry");
      }
    } catch (error) {
      console.warn(
        "[AuthService] CSRF token refresh error during retry:",
        error.message
      );
    }
    const retryHeaders = { ...(options.headers || {}) };
    if (token) retryHeaders.Authorization = `Bearer ${token}`;
    const newCsrf = getCsrfTokenFromCookie();
    if (newCsrf) retryHeaders["x-csrf-token"] = newCsrf;
    const retry = await fetch(url, {
      ...options,
      headers: retryHeaders,
      credentials: "include",
    });
    if (retry.status !== 401) return retry;
  }
  if (first.status !== 401) return first;

  // Prevent multiple simultaneous refresh attempts
  if (this._refreshInFlight) {
    // Wait for ongoing refresh to complete
    let attempts = 0;
    while (this._refreshInFlight && attempts < 50) {
      // Max 5 seconds wait
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    // Try again with potentially new token
    const secondToken = this.getToken();
    if (secondToken && secondToken !== token) {
      headers.Authorization = `Bearer ${secondToken}`;
      return fetch(url, { ...options, headers, credentials: "include" });
    }
    return first; // Return original 401 if refresh didn't help
  }

  // Attempt refresh
  const refreshed = await this.refresh();
  if (!refreshed) {
    // Clear auth data if refresh failed
    this.clearAuthData();
    // For critical API calls, redirect to login
    if (
      typeof window !== "undefined" &&
      !url.includes("/login") &&
      !url.includes("/refresh")
    ) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
    return first; // give original 401
  }
  const secondToken = this.getToken();
  if (secondToken) headers.Authorization = `Bearer ${secondToken}`;
  return fetch(url, { ...options, headers, credentials: "include" });
};

// Debug mode controls
AuthService.prototype.setDebugMode = function (flag) {
  this._debug = !!flag;
  try {
    localStorage.setItem("DEBUG_MODE", this._debug ? "true" : "false");
  } catch {
    /* ignore */
  }
};

// Internal: schedule auto refresh before token expiry
AuthService.prototype._scheduleAutoRefresh = function (token) {
  if (!token) return;
  const payload = this._parseJwt(token);
  if (!payload || !payload.exp) return; // cannot schedule
  const expMs = payload.exp * 1000;
  const now = Date.now();
  // Refresh 60s before expiry (or immediately if already close)
  const refreshAt = Math.max(now + 5000, expMs - 60000);
  const delay = refreshAt - now;
  if (this._debug)
    console.log("[AuthService] schedule refresh in", delay, "ms");
  if (this._refreshTimer) clearTimeout(this._refreshTimer);
  this._refreshTimer = setTimeout(async () => {
    if (this._refreshInFlight) return;
    this._refreshInFlight = true;
    try {
      await this.refresh();
    } finally {
      this._refreshInFlight = false;
    }
  }, delay);
};

AuthService.prototype._parseJwt = function (token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
};

// Initialize auto refresh if token already in storage
AuthService.prototype.init = function () {
  const t = this.getToken();
  if (t) this._scheduleAutoRefresh(t);
};

const authServiceInstance = new AuthService();

// Auto-init on import (after instance creation)
setTimeout(() => {
  try {
    authServiceInstance.init();
  } catch {
    /* ignore */
  }
}, 0);

export default authServiceInstance;

// Helper to read csrfToken cookie (double-submit pattern)
function getCsrfTokenFromCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("csrfToken="));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
}
