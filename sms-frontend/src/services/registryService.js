// Central registry & subject service with CSRF + auth handling
import api from "./apiClient";
import authService from "./authService";

// Helper: read csrfToken cookie
// Simple response error handler to surface backend message
function handleError(err) {
  if (err.response) {
    const msg = err.response.data?.message || "Request failed";
    const e = new Error(msg);
    e.status = err.response.status;
    e.data = err.response.data;
    throw e;
  }
  throw err;
}

// USERS
export const addUser = async (userData) => {
  try {
    console.log("Attempting to create user:", userData);
    console.log(
      "Current CSRF token:",
      document.cookie.split(";").find((c) => c.trim().startsWith("csrfToken="))
    );
    const res = await api.post("/api/v1/users", userData);
    return res.data;
  } catch (e) {
    console.error("User creation failed:", e.response?.data || e.message);
    // If 401/403 (auth or CSRF), attempt refresh + CSRF rotation then retry once
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      console.log("Attempting to refresh auth and CSRF token...");
      try {
        if (status === 401) {
          await authService.refresh();
        }
        await api.get("/api/v1/users/csrf");
        console.log(
          "New CSRF token after refresh:",
          document.cookie
            .split(";")
            .find((c) => c.trim().startsWith("csrfToken="))
        );
        const retry = await api.post("/api/v1/users", userData);
        return retry.data;
      } catch (inner) {
        console.error("Retry failed:", inner.response?.data || inner.message);
        handleError(inner);
      }
    }
    handleError(e);
  }
};

export const listUsers = async () => {
  try {
    const res = await api.get("/api/v1/users");
    const data = res.data;
    const array =
      data?.data?.data || // factory getAll shape
      data?.data?.users ||
      data?.users ||
      [];
    return {
      users: Array.isArray(array) ? array : [],
      total: data.total,
      raw: data,
    };
  } catch (e) {
    handleError(e);
  }
};

export const removeUser = async (id) => {
  try {
    const res = await api.delete(`/api/v1/users/${id}`);
    return res.data;
  } catch (e) {
    handleError(e);
  }
};

// SUBJECTS
const SUBJECTS_BASE = "/api/v1/subjects";

export const getSubjects = async () => {
  try {
    const res = await api.get(SUBJECTS_BASE);
    return res.data;
  } catch (e) {
    handleError(e);
  }
};

export const getSubjectById = async (id) => {
  try {
    const res = await api.get(`${SUBJECTS_BASE}/${id}`);
    return res.data;
  } catch (e) {
    handleError(e);
  }
};

export const createSubject = async (subjectData) => {
  try {
    const res = await api.post(SUBJECTS_BASE, subjectData);
    return res.data;
  } catch (e) {
    if (e.status === 403) {
      try {
        await api.get("/api/v1/users/csrf");
        const retry = await api.post(SUBJECTS_BASE, subjectData);
        return retry.data;
      } catch (inner) {
        handleError(inner);
      }
    }
    handleError(e);
  }
};

export const updateSubject = async (id, subjectData) => {
  try {
    const res = await api.patch(`${SUBJECTS_BASE}/${id}`, subjectData);
    return res.data;
  } catch (e) {
    if (e.status === 403) {
      try {
        await api.get("/api/v1/users/csrf");
        const retry = await api.patch(`${SUBJECTS_BASE}/${id}`, subjectData);
        return retry.data;
      } catch (inner) {
        handleError(inner);
      }
    }
    handleError(e);
  }
};

export const deleteSubject = async (id) => {
  try {
    const res = await api.delete(`${SUBJECTS_BASE}/${id}`);
    return res.data;
  } catch (e) {
    if (e.status === 403) {
      try {
        await api.get("/api/v1/users/csrf");
        const retry = await api.delete(`${SUBJECTS_BASE}/${id}`);
        return retry.data;
      } catch (inner) {
        handleError(inner);
      }
    }
    handleError(e);
  }
};

// Future: central retry/rotation logic could be abstracted if more services added
