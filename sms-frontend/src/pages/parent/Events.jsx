import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { toast } from "react-toastify";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  CalendarDays,
  X,
} from "lucide-react";

const ParentEvents = ({ role = "parent" }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/events`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      const allEvents = data.data.data || [];

      // Filter events based on parent's role - parents should see:
      // 1. Events for parents
      // 2. Events for students (their children)
      // 3. General events for the whole school community
      const filteredEvents = allEvents.filter((event) => {
        const audience = event.audience?.toLowerCase() || "";
        return (
          audience.includes("parent") ||
          audience.includes("student") ||
          audience.includes("school community") ||
          audience.includes("all staff")
        );
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvent = (event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
                <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Events
                </h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg">
                  School events and activities relevant to parents
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Role: {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-green-100 rounded-full">
                    <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Loading events...
                    </p>
                    <p className="text-sm text-gray-600">
                      Please wait while we fetch your events
                    </p>
                  </div>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <CalendarDays className="h-12 w-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      No events found
                    </p>
                    <p className="text-sm text-gray-600">
                      Events will appear here when they are scheduled
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {events.map((event) => (
                  <div
                    key={event._id}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-green-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                          <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          </div>
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                            {event.title}
                          </h3>
                        </div>
                        <p className="text-gray-700 mb-4 leading-relaxed text-sm sm:text-base">
                          {event.description}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>
                                {new Date(event.startTime).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>
                                {new Date(event.startTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}{" "}
                                -{" "}
                                {new Date(event.endTime).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{event.location || "TBD"}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span>{event.audience}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <span
                              className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                                event.status === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : event.status === "In Progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : event.status === "Cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {event.status === "Completed" && (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              {event.status === "In Progress" && (
                                <Loader2 className="h-3 w-3 mr-1" />
                              )}
                              {event.status === "Cancelled" && (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {event.status}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {event.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleViewEvent(event)}
                        className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base font-medium"
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
        </div>
      </div>

      {/* View Event Modal */}
      {showViewModal && viewingEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Event Details
                </h2>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors self-start sm:self-auto"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {viewingEvent.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {viewingEvent.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(viewingEvent.startTime).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">
                        {new Date(viewingEvent.startTime).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}{" "}
                        -{" "}
                        {new Date(viewingEvent.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">
                        {viewingEvent.location || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Audience</p>
                      <p className="font-medium">{viewingEvent.audience}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      viewingEvent.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : viewingEvent.status === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : viewingEvent.status === "Cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {viewingEvent.status === "Completed" && (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    {viewingEvent.status === "In Progress" && (
                      <Loader2 className="h-4 w-4 mr-1" />
                    )}
                    {viewingEvent.status === "Cancelled" && (
                      <AlertCircle className="h-4 w-4 mr-1" />
                    )}
                    {viewingEvent.status}
                  </span>
                  <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                    {viewingEvent.category}
                  </span>
                </div>
                <div />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentEvents;
