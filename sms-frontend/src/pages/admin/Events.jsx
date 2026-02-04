import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { API_BASE_URL } from "../../config";
import authService from "../../services/authService";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit3,
  Trash2,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  CalendarDays,
} from "lucide-react";

// Zod validation schema for event form
const eventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1000, "Description must be less than 1000 characters"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    audience: z.string().min(1, "Audience is required"),
    status: z.string().min(1, "Status is required"),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime);
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

const AdminEvents = ({ role = "admin" }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [audienceOptions, setAudienceOptions] = useState({
    general: [],
    classes: [],
    teachers: [],
    students: [],
    parents: [],
  });
  const [showManageAllModal, setShowManageAllModal] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [filterCategory, setFilterCategory] = useState("all");

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      category: "Professional Development",
      audience: "",
      status: "Planning",
    },
  });

  useEffect(() => {
    fetchEvents();
    fetchAudienceOptions();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/events`
      );
      if (response.status === 401) {
        toast.error("Unauthorized — please sign in again.");
        setEvents([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data?.data?.data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const fetchAudienceOptions = async () => {
    // Set simple audience options instead of fetching from API
    const simpleOptions = {
      general: [
        { value: "All Students", label: "All Students" },
        { value: "All Teachers", label: "All Teachers" },
        { value: "All Parents", label: "All Parents" },
        { value: "All Staff", label: "All Staff" },
        { value: "School Community", label: "School Community" },
      ],
      classes: [],
      teachers: [],
      students: [],
      parents: [],
    };

    setAudienceOptions(simpleOptions);
  };

  const handleCreateEvent = () => {
    reset({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      location: "",
      category: "Professional Development",
      audience: "",
      status: "Planning",
    });
    setEditingEvent(null);
    setShowCreateModal(true);
  };

  const handleEditEvent = (event) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    setValue("title", event.title);
    setValue("description", event.description);
    setValue("startTime", startTime.toISOString().slice(0, 16)); // Format for datetime-local input
    setValue("endTime", endTime.toISOString().slice(0, 16));
    setValue("location", event.location);
    setValue("category", event.category);
    setValue("audience", event.audience);
    setValue("status", event.status);

    setEditingEvent(event);
    setShowCreateModal(true);
  };

  const handleViewEvent = (event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  const handleManageAllEvents = async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/events`
      );
      if (!response.ok) throw new Error("Failed to fetch all events");
      const data = await response.json();
      setAllEvents(data?.data?.data || []);
      setShowManageAllModal(true);
    } catch (error) {
      console.error("Error fetching all events:", error);
      toast.error("Failed to load events for management");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEvents.length === 0) {
      toast.warning("Please select events to delete");
      return;
    }

    try {
      for (const eventId of selectedEvents) {
        await authService.authFetch(
          `${API_BASE_URL}/api/v1/events/${eventId}`,
          {
            method: "DELETE",
          }
        );
      }

      toast.success(`Successfully deleted ${selectedEvents.length} events`);
      setSelectedEvents([]);
      handleManageAllEvents(); // Refresh the list
    } catch (error) {
      console.error("Error bulk deleting events:", error);
      toast.error("Failed to delete selected events");
    }
  };

  const handleSelectEvent = (eventId) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    const filteredEvents = allEvents.filter(
      (event) => filterCategory === "all" || event.category === filterCategory
    );

    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map((event) => event._id));
    }
  };

  const handleSaveEvent = async (data) => {
    // Check if there are any validation errors
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      const eventData = {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        location: data.location,
        category: data.category,
        audience: data.audience,
        status: data.status,
      };

      let response;
      if (editingEvent) {
        // Update existing event
        response = await authService.authFetch(
          `${API_BASE_URL}/api/v1/events/${editingEvent._id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
          }
        );
      } else {
        // Create new event
        response = await authService.authFetch(
          `${API_BASE_URL}/api/v1/events`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
          }
        );
      }

      if (!response.ok) {
        throw new Error("Failed to save event");
      }

      await fetchEvents(); // Refresh the events list
      setShowCreateModal(false);
      toast.success(
        editingEvent
          ? "Event updated successfully!"
          : "Event created successfully!"
      );
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    setDeletingEvent(event);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!deletingEvent) return;

    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/events/${deletingEvent._id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      await fetchEvents(); // Refresh the events list
      toast.success("Event deleted successfully!");
      setShowDeleteConfirm(false);
      setDeletingEvent(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <CalendarDays className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("events.adminTitle") || "Admin - Events"}
            </h1>
            <p className="text-gray-600 mt-1">
              {t("events.adminDescription") ||
                "Manage all school events and activities."}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {(user?.role === "admin" ||
            user?.role === "super_admin" ||
            user?.role === "school_admin") && (
              <button
                onClick={handleCreateEvent}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                <span>Create Event</span>
              </button>
            )}
          {(user?.role === "admin" ||
            user?.role === "super_admin" ||
            user?.role === "school_admin") && (
              <button
                onClick={() => handleManageAllEvents()}
                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Settings className="h-5 w-5" />
                <span>Manage All Events</span>
              </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-indigo-100 rounded-full">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
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
                  Create an event to manage all events as Admin.
                </p>
              </div>
              <button
                onClick={handleCreateEvent}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                <span className="text-2xl font-bold">Create Event</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div
                key={event._id}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-indigo-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {event.title}
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {event.description}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
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
                            {new Date(event.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(event.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${event.status === "Completed"
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
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleViewEvent(event)}
                    className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  {(user?.role === "admin" ||
                    user?.role === "super_admin" ||
                    user?.role === "school_admin") && (
                      <button
                        onClick={() => handleEditEvent(event)}
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
                        onClick={() => handleDeleteEvent(event)}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  {editingEvent ? (
                    <Edit3 className="h-6 w-6 text-indigo-600" />
                  ) : (
                    <Plus className="h-6 w-6 text-indigo-600" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((data) => {
                handleSaveEvent(data);
              })}
            >
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    {...register("title")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter event title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    {...register("category")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Professional Development">
                      Professional Development
                    </option>
                    <option value="Curriculum">Curriculum</option>
                    <option value="Orientation">Orientation</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Training">Training</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    {...register("startTime")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.startTime && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.startTime.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    {...register("endTime")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.endTime && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.endTime.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    {...register("location")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter location"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.location.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Audience *
                  </label>
                  <select
                    {...register("audience")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select audience</option>
                    {audienceOptions.general.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter event description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingEvent ? (
                    <Edit3 className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Saving..."
                      : editingEvent
                        ? "Update"
                        : "Create"}{" "}
                    Event
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Event Modal */}
      {showViewModal && viewingEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Eye className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Event Details
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
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg">
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
                    <Calendar className="h-5 w-5 text-indigo-600" />
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
                    <Clock className="h-5 w-5 text-indigo-600" />
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
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">
                        {viewingEvent.location || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-indigo-600" />
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
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${viewingEvent.status === "Completed"
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
                <div className="flex space-x-3">
                  {(user?.role === "admin" ||
                    user?.role === "super_admin" ||
                    user?.role === "school_admin") && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          handleEditEvent(viewingEvent);
                        }}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    )}
                  {(user?.role === "admin" ||
                    user?.role === "super_admin" ||
                    user?.role === "school_admin") && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          handleDeleteEvent(viewingEvent);
                        }}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingEvent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-white/30">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete Event</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <strong>&quot;{deletingEvent.title}&quot;</strong>? This action
              cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage All Events Modal */}
      {showManageAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                    <Settings className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Manage All Events</h2>
                    <p className="text-indigo-100 mt-1">
                      Complete administrative control over school events
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManageAllModal(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Enhanced Filters and Actions */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-semibold text-gray-700">
                        Filter by Category:
                      </label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                      >
                        <option value="all">All Events</option>
                        <option value="Professional Development">
                          Professional Development
                        </option>
                        <option value="Curriculum">Curriculum</option>
                        <option value="Orientation">Orientation</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Training">Training</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg">
                      <span className="font-medium">
                        {
                          allEvents.filter(
                            (event) =>
                              filterCategory === "all" ||
                              event.category === filterCategory
                          ).length
                        }
                      </span>
                      <span>events found</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {selectedEvents.length > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Selected ({selectedEvents.length})</span>
                      </button>
                    )}
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200 transition-all duration-200"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {selectedEvents.length ===
                          allEvents.filter(
                            (event) =>
                              filterCategory === "all" ||
                              event.category === filterCategory
                          ).length
                          ? "Deselect All"
                          : "Select All"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Events List */}
              <div className="max-h-[500px] overflow-y-auto">
                <div className="grid gap-4">
                  {allEvents
                    .filter(
                      (event) =>
                        filterCategory === "all" ||
                        event.category === filterCategory
                    )
                    .map((event) => (
                      <div
                        key={event._id}
                        className={`bg-white rounded-xl border-2 p-5 hover:shadow-lg transition-all duration-200 ${selectedEvents.includes(event._id)
                            ? "border-indigo-400 bg-indigo-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={selectedEvents.includes(event._id)}
                              onChange={() => handleSelectEvent(event._id)}
                              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                  {event.title}
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                  {event.description}
                                </p>
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${event.status === "Completed"
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
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span className="text-blue-800 font-medium">
                                  {new Date(
                                    event.startTime
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span className="text-green-800 font-medium">
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
                              <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg">
                                <Users className="h-4 w-4 text-purple-600" />
                                <span className="text-purple-800 font-medium">
                                  {event.audience}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded-lg">
                                <span className="text-orange-800 font-medium">
                                  {event.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {allEvents.filter(
                  (event) =>
                    filterCategory === "all" ||
                    event.category === filterCategory
                ).length === 0 && (
                    <div className="text-center py-12">
                      <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No events found
                      </h3>
                      <p className="text-gray-600">
                        Try adjusting your filter criteria
                      </p>
                    </div>
                  )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowManageAllModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
