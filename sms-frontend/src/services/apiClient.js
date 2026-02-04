import axios from "axios";
import { API_BASE_URL } from "../config";
import authService from "./authService";

// Utility to read CSRF token from cookie
function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("csrfToken="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor: attach Authorization + CSRF
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const unsafe = ["post", "put", "patch", "delete", "delete"];
    if (unsafe.includes((config.method || "").toLowerCase())) {
      const csrf = getCsrfToken();
      console.log(
        `Making ${config.method?.toUpperCase()} request to ${config.url}`
      );
      console.log("CSRF token found:", csrf ? "Yes" : "No");
      if (csrf) config.headers["x-csrf-token"] = csrf;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      resolve(api(config));
    }
  });
  pendingQueue = [];
}

// Response interceptor: handle 401 + CSRF 403 retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response) return Promise.reject(error); // network or CORS

    // If 403 likely CSRF missing -> rotate once and retry for unsafe methods
    if (
      response.status === 403 &&
      !config.__isCsrfRetry &&
      ["post", "put", "patch", "delete"].includes(
        (config.method || "").toLowerCase()
      )
    ) {
      try {
        // Attempt to rotate CSRF token
        await api.get("/api/v1/users/csrf");
      } catch (e) {
        // If CSRF rotation fails due to expired auth, try refresh once then retry rotation
        if (e?.response?.status === 401) {
          try {
            const refreshed = await authService.refresh();
            if (refreshed) {
              await api.get("/api/v1/users/csrf");
            }
          } catch (_) {
            return Promise.reject(error);
          }
        } else {
          return Promise.reject(error);
        }
      }
      const csrf = getCsrfToken();
      if (csrf) config.headers["x-csrf-token"] = csrf;
      config.__isCsrfRetry = true;
      return api(config);
    }

    // 401 handling with single-flight refresh
    if (response.status === 401 && !config.__isRetryAuth) {
      console.log("401 error detected, attempting refresh...");
      if (isRefreshing) {
        console.log("Refresh already in progress, queuing request...");
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject, config });
        });
      }
      config.__isRetryAuth = true;
      isRefreshing = true;
      try {
        console.log("Attempting to refresh authentication...");
        const refreshed = await authService.refresh();
        const newToken = authService.getToken();
        console.log(
          "Refresh result:",
          refreshed,
          "New token:",
          newToken ? "Present" : "Missing"
        );
        processQueue(null, newToken);
        if (refreshed && newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
        console.log("Refresh failed, rejecting request");
        return Promise.reject(error);
      } catch (err) {
        console.log("Refresh error:", err.message);
        processQueue(err, null);
        authService.forceLogout?.();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
