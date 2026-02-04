import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import RoleAccess from "../../components/RoleAccess";
import { useAuth } from "../../hooks/useAuth";
import {
  FaUser,
  FaUserShield,
  FaEdit,
  FaTrash,
  FaEye,
  FaPlus,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
} from "react-icons/fa";

const AdminManagement = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Check if user is super_admin
  const isSuperAdmin = currentUser?.role === "super_admin";

  // Permission check for admin access
  if (!hasPermission("view_admin_management")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            You don't have permission to access the Admin Management section.
            <br />
            Only administrators with admin management permissions can view this
            page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={() => (window.location.href = "/admin/dashboard")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: "academic_admin",
      username: "",
      email: "",
      password: "",
      department: "academic",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const selectedRole = watch("role");
  const isAdminRole = selectedRole && selectedRole.includes("_admin");

  // Role-based access control
  const canViewAllAdmins = () => {
    return (
      currentUser?.role === "super_admin" ||
      currentUser?.role === "school_admin"
    );
  };

  const canCreateAdmins = () => {
    return (
      currentUser?.role === "super_admin" ||
      currentUser?.role === "school_admin" ||
      currentUser?.role === "it_admin"
    );
  };

  const canDeleteAdmins = () => {
    return (
      currentUser?.role === "super_admin" ||
      currentUser?.role === "school_admin"
    );
  };

  const getVisibleRoles = () => {
    if (currentUser?.role === "super_admin") {
      return [
        "super_admin",
        "school_admin",
        "academic_admin",
        "exam_admin",
        "finance_admin",
        "student_affairs_admin",
        "it_admin",
      ];
    }
    if (currentUser?.role === "school_admin") {
      return [
        "academic_admin",
        "exam_admin",
        "finance_admin",
        "student_affairs_admin",
        "it_admin",
      ];
    }
    if (currentUser?.role === "it_admin") {
      return [
        "academic_admin",
        "exam_admin",
        "finance_admin",
        "student_affairs_admin",
      ];
    }
    // Department admins can only see their own department
    if (currentUser?.role?.includes("_admin")) {
      return [currentUser.role];
    }
    return [];
  };

  const getVisibleDepartments = () => {
    if (
      currentUser?.role === "super_admin" ||
      currentUser?.role === "school_admin"
    ) {
      return [
        "academic",
        "examination",
        "finance",
        "student_affairs",
        "it",
        "general",
      ];
    }
    if (currentUser?.role === "it_admin") {
      return ["academic", "examination", "finance", "student_affairs"];
    }
    // Department admins can only see their own department
    if (currentUser?.role?.includes("_admin")) {
      const roleToDept = {
        academic_admin: "academic",
        exam_admin: "examination",
        finance_admin: "finance",
        student_affairs_admin: "student_affairs",
        it_admin: "it",
      };
      return [roleToDept[currentUser.role] || "general"];
    }
    return [];
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users/admins`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch admins");
      }

      const data = await response.json();
      const adminUsers = data.data?.admins || [];

      setAdmins(adminUsers);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (formData) => {
    try {
      const userData = {
        role: formData.role,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        department: formData.department,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || "",
        },
      };

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create admin");
      }

      toast.success(`Admin "${formData.username}" created successfully`);
      setShowCreateModal(false);
      reset();
      fetchAdmins();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Failed to create admin");
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) {
      return;
    }

    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users/admins/${adminId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete admin");
      }

      toast.success("Admin deleted successfully");
      fetchAdmins();
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error(error.message || "Failed to delete admin");
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: "bg-red-100 text-red-800 border-red-200",
      school_admin: "bg-red-100 text-red-800 border-red-200",
      academic_admin: "bg-indigo-100 text-indigo-800 border-indigo-200",
      exam_admin: "bg-purple-100 text-purple-800 border-purple-200",
      finance_admin: "bg-yellow-100 text-yellow-800 border-yellow-200",
      student_affairs_admin: "bg-pink-100 text-pink-800 border-pink-200",
      it_admin: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getDepartmentColor = (department) => {
    const colors = {
      academic: "bg-blue-100 text-blue-800",
      examination: "bg-purple-100 text-purple-800",
      finance: "bg-yellow-100 text-yellow-800",
      student_affairs: "bg-pink-100 text-pink-800",
      it: "bg-gray-100 text-gray-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[department] || "bg-gray-100 text-gray-800";
  };

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.profile?.firstName &&
        admin.profile.firstName
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (admin.profile?.lastName &&
        admin.profile.lastName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === "all" || admin.role === roleFilter;
    const matchesDepartment =
      departmentFilter === "all" || admin.department === departmentFilter;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  // Check if user has permission to view admin management
  if (!canViewAllAdmins() && !currentUser?.role?.includes("_admin")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaUserShield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to view admin management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage administrative users and their roles
              </p>
            </div>
            {canCreateAdmins() && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <FaPlus /> Create Admin
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, username, or email..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Roles</option>
                {getVisibleRoles().map((role) => (
                  <option key={role} value={role}>
                    {role
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Departments</option>
                {getVisibleDepartments().map((dept) => (
                  <option key={dept} value={dept}>
                    {dept
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Admin List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Admin Users ({filteredAdmins.length})
            </h2>
          </div>

          {filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <FaUserShield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No admins found
              </h3>
              <p className="mt-2 text-gray-500">
                {searchTerm ||
                roleFilter !== "all" ||
                departmentFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first admin user"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAdmins.map((admin) => (
                <div key={admin._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <FaUser className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {admin.profile?.firstName && admin.profile?.lastName
                              ? `${admin.profile.firstName} ${admin.profile.lastName}`
                              : admin.username}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(
                              admin.role
                            )}`}
                          >
                            {admin.role.replace("_", " ").toUpperCase()}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(
                              admin.department
                            )}`}
                          >
                            <FaBuilding className="mr-1" />
                            {admin.department.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <FaEnvelope className="mr-1" />
                            {admin.email}
                          </span>
                          {admin.profile?.phone && (
                            <span className="flex items-center">
                              <FaPhone className="mr-1" />
                              {admin.profile.phone}
                            </span>
                          )}
                          <span className="flex items-center">
                            <FaCalendarAlt className="mr-1" />
                            {admin.lastLogin
                              ? new Date(admin.lastLogin).toLocaleDateString()
                              : "Never logged in"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowViewModal(true);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-2"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      {canDeleteAdmins() && admin.role !== "super_admin" && (
                        <button
                          onClick={() => handleDeleteAdmin(admin._id)}
                          className="text-red-400 hover:text-red-600 p-2"
                          title="Delete Admin"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Admin Modal */}
        {showCreateModal && canCreateAdmins() && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Admin
              </h2>

              <form
                onSubmit={handleSubmit(handleCreateAdmin)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      {...register("role", { required: "Role is required" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {getVisibleRoles().map((role) => (
                        <option key={role} value={role}>
                          {role
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    {errors.role && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.role.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <select
                      {...register("department", {
                        required: "Department is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {getVisibleDepartments().map((dept) => (
                        <option key={dept} value={dept}>
                          {dept
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    {errors.department && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.department.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    {...register("username", {
                      required: "Username is required",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register("email", { required: "Email is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Must be at least 8 characters",
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      {...register("firstName", {
                        required: "First name is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      {...register("lastName", {
                        required: "Last name is required",
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register("phone")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      reset();
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Admin Modal */}
        {showViewModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Admin Details
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <FaUser className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedAdmin.profile?.firstName &&
                      selectedAdmin.profile?.lastName
                        ? `${selectedAdmin.profile.firstName} ${selectedAdmin.profile.lastName}`
                        : selectedAdmin.username}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(
                          selectedAdmin.role
                        )}`}
                      >
                        {selectedAdmin.role.replace("_", " ").toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(
                          selectedAdmin.department
                        )}`}
                      >
                        {selectedAdmin.department
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAdmin.username}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAdmin.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAdmin.profile?.phone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Login
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAdmin.lastLogin
                        ? new Date(selectedAdmin.lastLogin).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Capabilities
                  </label>
                  <RoleAccess
                    role={selectedAdmin.role}
                    permissions={selectedAdmin.permissions}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManagement;
