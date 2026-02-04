// src/components/RealtimeActivityFeed.jsx
import { useState, useEffect } from "react";

const RealtimeActivityFeed = ({
  activities = [],
  isLoading = false,
  maxItems = 10,
  showTimestamp = true,
}) => {
  const [visibleActivities, setVisibleActivities] = useState([]);
  const [newActivityCount, setNewActivityCount] = useState(0);

  useEffect(() => {
    if (activities.length > 0) {
      // Add new activities with animation
      const newActivities = activities.slice(0, maxItems);
      setVisibleActivities(newActivities);

      // Reset new activity count when activities are viewed
      if (newActivityCount > 0) {
        setNewActivityCount(0);
      }
    }
  }, [activities, maxItems, newActivityCount]);

  useEffect(() => {
    // Simulate real-time updates (in a real app, this would come from WebSocket or Server-Sent Events)
    const interval = setInterval(() => {
      // This is just for demo - in real app, you'd receive updates from backend
      setNewActivityCount((prev) => prev + 1);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case "user":
        return "👤";
      case "assignment":
        return "📝";
      case "exam":
        return "📋";
      case "announcement":
        return "📢";
      case "system":
        return "⚙️";
      case "login":
        return "🔐";
      case "logout":
        return "🚪";
      default:
        return "📌";
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "user":
        return "bg-blue-100 text-blue-800";
      case "assignment":
        return "bg-green-100 text-green-800";
      case "exam":
        return "bg-purple-100 text-purple-800";
      case "announcement":
        return "bg-yellow-100 text-yellow-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      case "login":
        return "bg-indigo-100 text-indigo-800";
      case "logout":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";

    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return activityTime.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activities
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="px-6 py-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Activities
        </h2>
        {newActivityCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {newActivityCount} new
          </span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {visibleActivities.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No recent activities</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visibleActivities.map((activity, index) => (
              <div
                key={activity.id || index}
                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getActivityColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.action || activity.description}
                      </p>
                      {showTimestamp && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatTime(activity.timestamp || activity.time)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-500">
                        by{" "}
                        {activity.user === "Unknown user"
                          ? "System"
                          : activity.user || "System"}
                      </p>

                      {activity.type && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getActivityColor(
                            activity.type
                          )}`}
                        >
                          {activity.type}
                        </span>
                      )}
                    </div>

                    {activity.details && (
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {visibleActivities.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {}}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View all activities →
          </button>
        </div>
      )}
    </div>
  );
};

export default RealtimeActivityFeed;
