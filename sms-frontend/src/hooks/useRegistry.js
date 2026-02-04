import { useCallback, useState } from "react";
import { addUser, listUsers, removeUser } from "../services/registryService";

export function useRegistry() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { users: fetched } = await listUsers();
      if (Array.isArray(fetched)) setUsers(fetched);
    } catch (e) {
      setError(e.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await addUser(payload);
        const created = res?.data?.user || res?.user || res?.user;
        if (created) {
          setUsers((prev) => [created, ...prev]);
        } else {
          // If backend shape unexpected, refetch
          fetchUsers();
        }
        return res;
      } catch (e) {
        setError(e.message || "Failed to add user");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await removeUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id && u._id !== id));
    } catch (e) {
      setError(e.message || "Failed to remove user");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    deleteUser,
    setUsers,
    setError,
  };
}

export default useRegistry;
