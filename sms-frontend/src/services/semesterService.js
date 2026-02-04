import authService from "./authService";
import { API_BASE_URL } from "../config";

const semesterService = {
  // Get all semesters
  getAllSemesters: async () => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters`
    );
    if (!response.ok) throw new Error("Failed to fetch semesters");
    const data = await response.json();
    return data.data.data;
  },

  // Get current active semester
  getCurrentSemester: async () => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters/current`
    );
    if (!response.ok) throw new Error("Failed to fetch current semester");
    const data = await response.json();
    return data.data.data; // Will be null if no active semester
  },

  // Create new semester
  createSemester: async (semesterData) => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(semesterData),
      }
    );
    if (!response.ok) throw new Error("Failed to create semester");
    const data = await response.json();
    return data.data.data;
  },

  // Update semester
  updateSemester: async (id, semesterData) => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(semesterData),
      }
    );
    if (!response.ok) throw new Error("Failed to update semester");
    const data = await response.json();
    return data.data.data;
  },

  // Close current semester
  closeCurrentSemester: async () => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters/close-current`,
      {
        method: "POST",
      }
    );
    if (!response.ok) throw new Error("Failed to close semester");
    const data = await response.json();
    return data.data.data;
  },

  // Start new semester
  startNewSemester: async (semesterData) => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters/start-new`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(semesterData),
      }
    );
    if (!response.ok) throw new Error("Failed to start new semester");
    const data = await response.json();
    return data.data.data;
  },

  // Get semester statistics
  getSemesterStats: async (semester, academicYear) => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters/${semester}/${academicYear}/stats`
    );
    if (!response.ok) throw new Error("Failed to fetch semester stats");
    const data = await response.json();
    return data.data.data;
  },

  // Get student CGPA
  getStudentCGPA: async (studentId) => {
    const response = await authService.authFetch(
      `${API_BASE_URL}/api/v1/semesters/student/${studentId}/cgpa`
    );
    if (!response.ok) throw new Error("Failed to fetch student CGPA");
    const data = await response.json();
    return data.data.data;
  },
};

export default semesterService;
