import { useState, useEffect } from "react";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import { useAuth } from "../../hooks/useAuth";
import {
  FaUser,
  FaIdCard,
  FaUserTag,
  FaCheckCircle,
  FaCalendarAlt,
  FaShieldAlt,
  FaEdit,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import RoleAccess from "../../components/RoleAccess";

const AdminProfile = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    profile: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    fetchUserProfile();

    // Listen for storage changes (when user logs in/out)
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") {
        fetchUserProfile();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [authUser]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users/me`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const result = await response.json();
      const userData = result.data.data;

      // Clear any previous user data
      setUser(null);

      // Set new user data
      setUser(userData);
      setEditForm({
        username: userData.username,
        profile: {
          firstName: userData.profile?.firstName || "",
          lastName: userData.profile?.lastName || "",
          phone: userData.profile?.phone || "",
          address: userData.profile?.address || "",
        },
      });
    } catch (err) {
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      username: user.username,
      profile: {
        firstName: user.profile?.firstName || "",
        lastName: user.profile?.lastName || "",
        phone: user.profile?.phone || "",
        address: user.profile?.address || "",
      },
    });
  };

  const handleSave = async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users/updateMe`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const result = await response.json();
      const updatedUser = result.data.data;
      setUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("profile.")) {
      const profileField = name.split(".")[1];
      setEditForm((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value,
        },
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-600">No user data available</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 mb-8 text-white">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
            <FaUser className="text-4xl text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {user?.profile?.firstName && user?.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.username}
            </h1>
            <p className="text-xl opacity-90 capitalize">{user?.role}</p>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium mt-2 bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{/* Access label shown in Role card below */}Active</span>
            </div>
          </div>
          <div className="ml-auto">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <FaEdit />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                >
                  <FaSave />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                >
                  <FaTimes />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User ID Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaIdCard className="text-blue-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">User ID</h3>
          </div>
          <p className="text-gray-600 font-mono text-sm">{user._id}</p>
        </div>

        {/* Username Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaUser className="text-green-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Username</h3>
          </div>
          {isEditing ? (
            <input
              type="text"
              name="username"
              value={editForm.username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-600">{user.username}</p>
          )}
        </div>

        {/* First Name Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaUser className="text-blue-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">First Name</h3>
          </div>
          {isEditing ? (
            <input
              type="text"
              name="profile.firstName"
              value={editForm.profile.firstName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter first name"
            />
          ) : (
            <p className="text-gray-600">
              {user.profile?.firstName || "Not set"}
            </p>
          )}
        </div>

        {/* Last Name Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaUser className="text-green-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Last Name</h3>
          </div>
          {isEditing ? (
            <input
              type="text"
              name="profile.lastName"
              value={editForm.profile.lastName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter last name"
            />
          ) : (
            <p className="text-gray-600">
              {user.profile?.lastName || "Not set"}
            </p>
          )}
        </div>

        {/* Phone Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaUser className="text-purple-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Phone</h3>
          </div>
          {isEditing ? (
            <input
              type="tel"
              name="profile.phone"
              value={editForm.profile.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone number"
            />
          ) : (
            <p className="text-gray-600">{user.profile?.phone || "Not set"}</p>
          )}
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaUser className="text-orange-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Address</h3>
          </div>
          {isEditing ? (
            <textarea
              name="profile.address"
              value={editForm.profile.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter address"
              rows="3"
            />
          ) : (
            <p className="text-gray-600">
              {user.profile?.address || "Not set"}
            </p>
          )}
        </div>

        {/* Role Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaUserTag className="text-purple-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Role</h3>
          </div>
          <RoleAccess role={user?.role} permissions={user?.permissions} />
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaCheckCircle className="text-orange-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">
              Account Status
            </h3>
          </div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Active</span>
          </div>
        </div>

        {/* Created Date Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaCalendarAlt className="text-indigo-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Created</h3>
          </div>
          <p className="text-gray-600">{formatDate(user.createdAt)}</p>
        </div>

        {/* Security Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FaShieldAlt className="text-red-500 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Security</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Password last changed:{" "}
            {user.passwordChangedAt
              ? formatDate(user.passwordChangedAt)
              : "Never"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
