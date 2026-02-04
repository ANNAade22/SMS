// Lightweight API wrapper hook that uses authService.authFetch with automatic refresh
import { useCallback } from "react";
import authService from "../services/authService";
import { API_BASE_URL } from "../config";

export function useApi() {
  const buildUrl = useCallback((path) => {
    if (!path.startsWith("/")) path = "/" + path;
    return `${API_BASE_URL}${path}`;
  }, []);

  const request = useCallback(
    async (path, { method = "GET", body, headers = {} } = {}) => {
      const opts = {
        method,
        headers: { "Content-Type": "application/json", ...headers },
      };
      if (body !== undefined)
        opts.body = typeof body === "string" ? body : JSON.stringify(body);
      const response = await authService.authFetch(buildUrl(path), opts);
      let data = null;
      try {
        data = await response.json();
      } catch {
        /* ignore */
      }
      return { response, data };
    },
    [buildUrl]
  );

  const fetchJson = request; // alias

  return {
    request,
    fetchJson,
    buildUrl,
    authFetch: (p, o) => authService.authFetch(buildUrl(p), o),
  };
}

export default useApi;
