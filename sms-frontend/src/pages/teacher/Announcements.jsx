import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import {
  Megaphone,
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
} from "lucide-react";

const TeacherAnnouncements = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

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
    // Check authentication
    const token = authService.getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAnnouncements();
  }, [navigate]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await authService.authFetch(
        `${window.location.origin.replace(
          /:\d+$/,
          ":8000"
        )}/api/v1/announcements`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch announcements");
      }

      const data = await response.json();
      setAnnouncements(data.data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
      // Fallback to mock data if API fails
      const mockAnnouncements = [
        {
          _id: "1",
          title: "Mathematics Mid-term Exam Schedule",
          content:
            "The mid-term examination for Mathematics will be held on September 15th, 2025. Please ensure all students are prepared and have reviewed all chapters covered so far.",
          priority: "High",
          audience: "10th Grade Mathematics A",
          status: "Published",
          isPinned: true,
          createdBy: "John Smith",
          createdAt: "2025-09-01T10:00:00.000Z",
        },
        {
          _id: "2",
          title: "Advanced Mathematics Project Due Date",
          content:
            "The trigonometry project is due on September 25th, 2025. Students should submit their work through the online portal. Late submissions will not be accepted.",
          priority: "Medium",
          audience: "11th Grade Advanced Mathematics",
          status: "Published",
          isPinned: false,
          createdBy: "John Smith",
          createdAt: "2025-09-05T10:00:00.000Z",
        },
        {
          _id: "3",
          title: "Calculus Quiz Reminder",
          content:
            "Don't forget about the Calculus quiz scheduled for September 10th, 2025. Review chapters 1-3 thoroughly. The quiz will cover derivatives and integrals.",
          priority: "Medium",
          audience: "12th Grade Calculus",
          status: "Published",
          isPinned: false,
          createdBy: "John Smith",
          createdAt: "2025-09-08T10:00:00.000Z",
        },
        {
          _id: "4",
          title: "Welcome Back to School!",
          content:
            "Welcome back students! We're excited for another great year. Remember to check your schedules and be prepared for the first day of classes.",
          priority: "Low",
          audience: "All Students",
          status: "Published",
          isPinned: true,
          createdBy: "John Smith",
          createdAt: "2025-09-02T10:00:00.000Z",
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

  const handleViewAnnouncement = (announcement) => {
    setViewingAnnouncement(announcement);
    setShowViewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
            <Megaphone className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teacher - Announcements
            </h1>
            <p className="text-gray-600 mt-1">
              View important announcements and stay updated with school news
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Teachers can only view announcements */}
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              <div className="p-4 bg-purple-100 rounded-full">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
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
                  Announcements will appear here when they are published
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement._id}
                className={`bg-white rounded-xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 ${
                  announcement.isPinned
                    ? "border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        {announcement.isPinned ? (
                          <Pin className="h-5 w-5 text-purple-600" />
                        ) : (
                          <Megaphone className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        {announcement.title}
                        {announcement.isPinned && (
                          <Star className="h-4 w-4 text-purple-600 fill-current" />
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Announcement Modal */}
      {showViewModal && viewingAnnouncement && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Announcement Details
                </h2>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  {viewingAnnouncement.title}
                  {viewingAnnouncement.isPinned && (
                    <Star className="h-5 w-5 text-purple-600 fill-current" />
                  )}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {viewingAnnouncement.content}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(
                          viewingAnnouncement.createdAt
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Audience</p>
                      <p className="font-medium">
                        {viewingAnnouncement.audience}
                      </p>
                    </div>
                  </div>
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
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">
                        {viewingAnnouncement.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                      viewingAnnouncement.priority
                    )}`}
                  >
                    {getPriorityIcon(viewingAnnouncement.priority)}
                    <span className="ml-1">
                      {viewingAnnouncement.priority} Priority
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      viewingAnnouncement.status
                    )}`}
                  >
                    {viewingAnnouncement.status}
                  </span>
                  {viewingAnnouncement.isPinned && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      <Pin className="h-3 w-3 mr-1" />
                      Pinned
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAnnouncements;
