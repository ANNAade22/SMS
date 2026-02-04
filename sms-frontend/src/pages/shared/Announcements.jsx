import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { announcementFormSchema } from "../../utils/formSchemas";
import EnhancedTable from "../../components/EnhancedTable";
import SkeletonLoader from "../../components/SkeletonLoader";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const LoadingSpinner = ({ size = "sm", color = "blue" }) => {
  const sizeClasses = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
  };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

const Announcements = ({ role = "admin" }) => {
  const navigate = useNavigate();
  const roleTitles = {
    admin: "Admin - Announcements Management",
    teacher: "Teacher - My Announcements",
    student: "Student - Announcements",
    parent: "Parent - Announcements",
  };
  const roleDescriptions = {
    admin: "Manage all announcements in the school system",
    teacher: "Create and manage announcements for your classes",
    student: "Read school and class announcements",
    parent: "Read announcements related to your children",
  };

  const [data, setData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audienceOptions, setAudienceOptions] = useState([
    "All Users",
    "School Staff",
    "Administrative Staff",
    "Teachers",
    "Students",
    "Parents",
    "All Students",
    "All Teachers",
    "All Parents",
  ]);

  // Fetch announcements on component mount
  useEffect(() => {
    // Check authentication
    if (!authService.getToken()) {
      navigate("/login");
      return;
    }
    fetchAnnouncements();
    fetchAudienceOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchAudienceOptions = useCallback(async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements/audience-options`
      );
      if (!response.ok) throw new Error("Failed to fetch audience options");
      const data = await response.json();
      // Use API data if it has more than 1 option, otherwise use fallback
      if (data.data.audienceOptions && data.data.audienceOptions.length > 1) {
        setAudienceOptions(data.data.audienceOptions);
      } else {
        console.log("API returned limited options, using fallback");
        setAudienceOptions([
          "All Users",
          "School Staff",
          "Administrative Staff",
          "Teachers",
          "Students",
          "Parents",
          "All Students",
          "All Teachers",
          "All Parents",
        ]);
      }
    } catch (error) {
      console.error("Error fetching audience options:", error);
      // Keep the default options that were set in useState
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }

      const result = await response.json();
      setData(result.data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      // Fallback to mock data if API fails
      const mockData = [
        {
          _id: "1",
          title: "School Reopening Date",
          content: "School will reopen on September 10th.",
          date: "2025-09-01",
          priority: "High",
          audience:
            role === "student"
              ? "All Students"
              : role === "parent"
                ? "All Parents"
                : "All Users",
          status: "Published",
          isPinned: true,
          createdAt: "2025-09-01T10:00:00.000Z",
        },
        {
          _id: "2",
          title: "PTA Meeting",
          content: "Monthly PTA meeting on September 20th.",
          date: "2025-09-05",
          priority: "Medium",
          audience:
            role === "student"
              ? "All Students"
              : role === "parent"
                ? "All Parents"
                : "All Users",
          status: "Published",
          isPinned: false,
          createdAt: "2025-09-05T10:00:00.000Z",
        },
      ];
      setData(mockData);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "Medium",
      audience: "All Students",
      status: "Draft",
    },
  });

  const onAdd = async (form) => {
    setIsSubmittingAdd(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const item = {
        id: Date.now(),
        ...form,
        date: new Date().toISOString().split("T")[0],
      };
      setData((prev) => [...prev, item]);
      setShowAddModal(false);
      reset();
      toast.success(`Announcement "${item.title}" created`);
    } catch {
      toast.error("Failed to create announcement");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const onEdit = async (form) => {
    if (!editingItem) return;
    setIsSubmittingEdit(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const updated = { ...editingItem, ...form };
      setData((prev) =>
        prev.map((d) => (d.id === editingItem.id ? updated : d))
      );
      setShowEditModal(false);
      setEditingItem(null);
      reset();
      toast.success(`Announcement "${updated.title}" updated`);
    } catch {
      toast.error("Failed to update announcement");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const onDelete = async (item) => {
    try {
      await new Promise((r) => setTimeout(r, 400));
      setData((prev) => prev.filter((d) => d.id !== item.id));
      toast.success("Announcement deleted");
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  const columns = [
    { key: "title", label: "Title" },
    { key: "audience", label: "Audience" },
    { key: "priority", label: "Priority" },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val === "Published"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
            }`}
        >
          {val}
        </span>
      ),
    },
    { key: "date", label: "Date" },
  ];

  const actions = [
    {
      label: "View",
      onClick: (item) => {
        setViewingItem(item);
        setShowViewModal(true);
      },
    },
    ...(role === "admin" ||
      role === "teacher" ||
      role === "super_admin" ||
      role === "school_admin"
      ? [
        {
          label: "Edit",
          onClick: (item) => {
            setEditingItem(item);
            reset(item);
            setShowEditModal(true);
          },
        },
      ]
      : []),
    ...(role === "admin" || role === "super_admin" || role === "school_admin"
      ? [
        {
          label: "Delete",
          color: "text-red-600",
          hoverColor: "text-red-900",
          onClick: onDelete,
        },
      ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Announcements
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Announcements Management Page"}
          </p>
        </div>
        <div className="flex space-x-3">
          {(role === "admin" ||
            role === "teacher" ||
            role === "super_admin" ||
            role === "school_admin") && (
              <button
                onClick={() => {
                  setShowAddModal(true);
                  reset();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Add Announcement
              </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>
        {isLoading ? (
          <SkeletonLoader variant="table" className="p-4" />
        ) : (
          <EnhancedTable
            title="Announcements"
            data={data}
            columns={columns}
            actions={actions}
            pageSize={8}
            emptyMessage="No announcements found"
          />
        )}
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Add Announcement
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    {...register("title")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter title"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content *
                  </label>
                  <textarea
                    rows={4}
                    {...register("content")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter content"
                  />
                  {errors.content && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.content.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      {...register("priority")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Audience *
                    </label>
                    <select
                      {...register("audience")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Audience</option>
                      {audienceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.audience && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.audience.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {isSubmittingAdd ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner size="sm" color="green" /> Saving...
                      </span>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Announcement
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit(onEdit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    {...register("title")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content *
                  </label>
                  <textarea
                    rows={4}
                    {...register("content")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.content && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.content.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      {...register("priority")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Audience *
                    </label>
                    <select
                      {...register("audience")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Audience</option>
                      {audienceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.audience && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.audience.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    {isSubmittingEdit ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner size="sm" /> Updating...
                      </span>
                    ) : (
                      "Update"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showViewModal && viewingItem && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Announcement Details
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-medium">{viewingItem.title}</span>
                </div>
                <div>
                  <span className="text-gray-600">Content:</span>
                  <p className="mt-1">{viewingItem.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Audience:</span>
                    <div className="font-medium">{viewingItem.audience}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <div className="font-medium">{viewingItem.priority}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="font-medium">{viewingItem.status}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <div className="font-medium">{viewingItem.date}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
