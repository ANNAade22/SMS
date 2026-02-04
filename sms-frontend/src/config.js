// src/config.js
// Centralized API base URL for easy updates

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
