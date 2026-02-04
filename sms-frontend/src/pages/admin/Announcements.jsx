import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import authService from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  Search,
  Loader2,
  Star,
  Pin,
  PinOff,
  Shield,
} from "lucide-react";

// Zod validation schema for announcement form
const announcementSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(1000, "Content must be less than 1000 characters"),
  priority: z.string().min(1, "Priority is required"),
  audience: z.string().min(1, "Audience is required"),
  status: z.string().min(1, "Status is required"),
  isPinned: z.boolean().optional(),
});

const AdminAnnouncements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "Medium",
      audience: "All Users",
      status: "Draft",
      isPinned: false,
    },
  });

  // Computed filtered announcements
  const filteredAnnouncements = announcements
    .filter((announcement) => {
      const matchesSearch =
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        filterPriority === "All" || announcement.priority === filterPriority;
      const matchesStatus =
        filterStatus === "All" || announcement.status === filterStatus;
      return matchesSearch && matchesPriority && matchesStatus;
    })
    .sort((a, b) => {
      // Pinned announcements come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // If both are pinned or both are not pinned, sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }
    fetchAnnouncements();
    fetchAudienceOptions();
  }, [navigate]);

  const fetchAudienceOptions = async () => {
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
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements`
      );
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();
      setAnnouncements(data.data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
      const mockAnnouncements = [
        {
          _id: "1",
          title: "School Reopening Announcement",
          content:
            "Dear students, faculty, and parents, we are excited to announce that school will reopen on September 10th, 2025. All safety protocols will be strictly followed.",
          priority: "High",
          audience: "All Users",
          status: "Published",
          isPinned: true,
          createdBy: "Admin",
          createdAt: "2025-09-01T10:00:00.000Z",
        },
        {
          _id: "2",
          title: "New Academic Year Schedule",
          content:
            "The complete academic calendar for 2025-2026 has been published. Please review the schedule and plan accordingly. Classes begin September 10th.",
          priority: "High",
          audience: "All Students",
          status: "Published",
          isPinned: true,
          createdBy: "Admin",
          createdAt: "2025-09-02T10:00:00.000Z",
        },
        {
          _id: "3",
          title: "Teacher Professional Development",
          content:
            "All teachers are required to attend the professional development workshop on September 15th. Topics include new curriculum standards and teaching methodologies.",
          priority: "Medium",
          audience: "All Teachers",
          status: "Published",
          isPinned: false,
          createdBy: "Admin",
          createdAt: "2025-09-03T10:00:00.000Z",
        },
        {
          _id: "4",
          title: "Parent-Teacher Conference",
          content:
            "Parent-teacher conferences will be held on September 20th and 21st. Please schedule your appointments through the school portal.",
          priority: "Medium",
          audience: "All Parents",
          status: "Published",
          isPinned: false,
          createdBy: "Admin",
          createdAt: "2025-09-04T10:00:00.000Z",
        },
        {
          _id: "5",
          title: "Library Renovation Notice",
          content:
            "The school library will be closed for renovation from September 12th to September 20th. Alternative study spaces will be available.",
          priority: "Low",
          audience: "All Students",
          status: "Draft",
          isPinned: false,
          createdBy: "Admin",
          createdAt: "2025-09-05T10:00:00.000Z",
        },
      ];
      setAnnouncements(mockAnnouncements);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "High":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "Medium":
        return <Info className="h-4 w-4 text-yellow-500" />;
      case "Low":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "border-red-200 bg-red-50 text-red-700";
      case "Medium":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "Low":
        return "border-green-200 bg-green-50 text-green-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Published":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      case "Scheduled":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCreateAnnouncement = () => {
    reset({
      title: "",
      content: "",
      priority: "Medium",
      audience: "All Users",
      status: "Draft",
      isPinned: false,
    });
    setEditingAnnouncement(null);
    setShowCreateModal(true);
  };

  const handleEditAnnouncement = (announcement) => {
    setValue("title", announcement.title);
    setValue("content", announcement.content);
    setValue("priority", announcement.priority);
    setValue("audience", announcement.audience);
    setValue("status", announcement.status);
    setValue("isPinned", announcement.isPinned || false);

    setEditingAnnouncement(announcement);
    setShowCreateModal(true);
  };

  const handleViewAnnouncement = (announcement) => {
    setViewingAnnouncement(announcement);
    setShowViewModal(true);
  };

  const togglePinAnnouncement = async (announcementId) => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements/${announcementId}/toggle-pin`,
        { method: "PATCH" }
      );
      if (!response.ok) throw new Error("Failed to toggle pin status");
      const result = await response.json();
      setAnnouncements(
        announcements.map((ann) =>
          ann._id === announcementId ? result.data.announcement : ann
        )
      );
      toast.success("Announcement pin status updated");
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update pin status");
    }
  };

  const handleDeleteAnnouncement = (announcement) => {
    setDeletingAnnouncement(announcement);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAnnouncement = async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/announcements/${deletingAnnouncement._id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete announcement");
      setAnnouncements(
        announcements.filter((ann) => ann._id !== deletingAnnouncement._id)
      );
      setShowDeleteConfirm(false);
      setDeletingAnnouncement(null);
      toast.success("Announcement deleted successfully");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handleSaveAnnouncement = async (data) => {
    try {
      const url = editingAnnouncement
        ? `${API_BASE_URL}/api/v1/announcements/${editingAnnouncement._id}`
        : `${API_BASE_URL}/api/v1/announcements`;
      const method = editingAnnouncement ? "PATCH" : "POST";
      const response = await authService.authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save announcement");
      const result = await response.json();
      if (editingAnnouncement) {
        setAnnouncements(
          announcements.map((ann) =>
            ann._id === editingAnnouncement._id ? result.data.announcement : ann
          )
        );
        toast.success("Announcement updated successfully");
      } else {
        setAnnouncements([result.data.announcement, ...announcements]);
        toast.success("Announcement created successfully");
      }
      setShowCreateModal(false);
      setEditingAnnouncement(null);
      reset();
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast.error("Failed to save announcement");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin - Announcements Management
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage system-wide announcements for all users
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {(user?.role === "admin" ||
            user?.role === "super_admin" ||
            user?.role === "school_admin") && (
            <button
              onClick={handleCreateAnnouncement}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              <span>Create System Announcement</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Loading announcements...
                </p>
                <p className="text-sm text-gray-600">
                  Please wait while we fetch your announcements
                </p>
              </div>
            </div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <Megaphone className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  No announcements found
                </p>
                <p className="text-sm text-gray-600">
                  Create your first system announcement to get started
                </p>
              </div>
              <button
                onClick={handleCreateAnnouncement}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Announcement</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement._id}
                className={`bg-white rounded-xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 ${
                  announcement.isPinned
                    ? "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        {announcement.isPinned ? (
                          <Pin className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Megaphone className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        {announcement.title}
                        {announcement.isPinned && (
                          <Star className="h-4 w-4 text-blue-600 fill-current" />
                        )}
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-4 leading-relaxed line-clamp-3">
                      {announcement.content}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {new Date(
                              announcement.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{announcement.audience}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          {getPriorityIcon(announcement.priority)}
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                              announcement.priority
                            )}`}
                          >
                            {announcement.priority} Priority
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              announcement.status
                            )}`}
                          >
                            {announcement.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleViewAnnouncement(announcement)}
                    className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => togglePinAnnouncement(announcement._id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      announcement.isPinned
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {announcement.isPinned ? (
                      <>
                        <PinOff className="h-4 w-4" />
                        <span>Unpin</span>
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4" />
                        <span>Pin</span>
                      </>
                    )}
                  </button>
                  {(user?.role === "admin" ||
                    user?.role === "super_admin" ||
                    user?.role === "school_admin") && (
                    <button
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                  {(user?.role === "admin" ||
                    user?.role === "super_admin" ||
                    user?.role === "school_admin") && (
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement)}
                      className="flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAnnouncement
                    ? "Edit Announcement"
                    : "Create System Announcement"}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit(handleSaveAnnouncement)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    {...register("title")}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter announcement title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content *
                  </label>
                  <textarea
                    {...register("content")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter announcement content"
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.content.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      {...register("priority")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                    {errors.priority && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.priority.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Audience *
                    </label>
                    <select
                      {...register("audience")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Audience</option>
                      {audienceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.audience && (
                      <p className="mt-1 text-sm text-red-600">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.status.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    {...register("isPinned")}
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Pin this announcement (appears at top)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingAnnouncement ? "Update" : "Create"} Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingAnnouncement && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  View Announcement
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {viewingAnnouncement.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(
                          viewingAnnouncement.createdAt
                        ).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{viewingAnnouncement.audience}</span>
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                        viewingAnnouncement.priority
                      )}`}
                    >
                      {viewingAnnouncement.priority} Priority
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        viewingAnnouncement.status
                      )}`}
                    >
                      {viewingAnnouncement.status}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {viewingAnnouncement.content}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    {getPriorityIcon(viewingAnnouncement.priority)}
                    <div>
                      <p className="text-sm text-gray-500">Priority</p>
                      <p className="font-medium">
                        {viewingAnnouncement.priority}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Target Audience</p>
                      <p className="font-medium">
                        {viewingAnnouncement.audience}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">
                        {viewingAnnouncement.status}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {(user?.role === "admin" ||
                    user?.role === "super_admin" ||
                    user?.role === "school_admin") && (
                    <button
                      onClick={() => {
                        handleEditAnnouncement(viewingAnnouncement);
                        setShowViewModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit Announcement
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingAnnouncement && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Delete Announcement
                </h2>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;
                {deletingAnnouncement.title}&quot;? This action cannot be
                undone.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAnnouncement}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
