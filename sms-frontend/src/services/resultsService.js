// src/services/resultsService.js
import { API_BASE_URL } from "../config";
import authService from "./authService";

const resultsService = {
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/v1/results${query ? `?${query}` : ""}`;
    const res = await authService.authFetch(url);
    if (!res.ok) throw new Error(`Failed to load results: ${res.status}`);
    const json = await res.json();
    // factory.getAll usually returns { data: { data: [...] } }
    return json?.data?.data || [];
  },

  async create(payload) {
    const res = await authService.authFetch(`${API_BASE_URL}/api/v1/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to create result: ${res.status} ${msg}`);
    }
    const json = await res.json();
    return json?.data?.data;
  },
};

export default resultsService;
