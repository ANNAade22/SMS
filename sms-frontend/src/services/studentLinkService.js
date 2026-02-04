import api from "./apiClient";

export async function linkExistingStudentUser(payload) {
  const body = { ...payload, linkExisting: true };
  const { data } = await api.post("/api/v1/students", body);
  return data?.data?.student || data?.student;
}

export async function fetchUnlinkedStudentUsers() {
  const { data } = await api.get(
    "/api/v1/users?role=student&unlinked=true&limit=500"
  );
  const arr = data?.data?.data || data?.data?.users || data?.users || [];
  return Array.isArray(arr) ? arr.filter((u) => u.role === "student") : [];
}

export async function fetchParents(limit = 500) {
  const { data } = await api.get(`/api/v1/parents?limit=${limit}`);
  const arr = data?.data?.data || data?.data?.parents || data?.parents || [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchClasses(limit = 500) {
  const { data } = await api.get(`/api/v1/classes?limit=${limit}`);
  const arr = data?.data?.data || data?.data?.classes || data?.classes || [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchGrades(limit = 200) {
  const { data } = await api.get(`/api/v1/grades?limit=${limit}`);
  const arr = data?.data?.grades || data?.data?.data || data?.grades || [];
  return Array.isArray(arr) ? arr : [];
}

export async function fetchGradesWithId(limit = 500) {
  const { data } = await api.get(`/api/v1/grades?limit=${limit}`);
  const arr = data?.data?.data || data?.data?.grades || data?.grades || [];
  return arr.map((g) => ({
    _id: g._id || g.id,
    name: g.name || "",
  }));
}
