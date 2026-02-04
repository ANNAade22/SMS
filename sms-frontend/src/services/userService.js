import api from "./apiClient";

export async function changePassword({ currentPassword, password }) {
  const { data } = await api.patch("/api/v1/users/updateMyPassword", {
    currentPassword,
    password,
  });
  return data;
}

export default { changePassword };
