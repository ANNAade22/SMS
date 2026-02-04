// src/components/DynamicStatsCard.jsx
import { useState, useEffect } from "react";

const DynamicStatsCard = ({
  title,
  value,
  icon,
  color = "bg-blue-500",
  change,
  changeType = "neutral",
  isLoading = false,
  animationDelay = 0,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay]);

  useEffect(() => {
    if (!isVisible || isLoading) return;

    // Animate number counting up
    const numericValue =
      typeof value === "string"
        ? parseInt(value.replace(/[^\d]/g, "")) || 0
        : value || 0;

    const duration = 1000; // 1 second
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setAnimatedValue(numericValue);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isVisible, isLoading]);

  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case "increase":
        return "↗️";
      case "decrease":
        return "↘️";
      default:
        return "→";
    }
  };

  const formatValue = (val) => {
    if (typeof value === "string" && value.includes(",")) {
      // If original value has commas, format with commas
      return val.toLocaleString();
    }
    return val.toString();
  };

  const getProgressWidth = () => {
    if (!isVisible) return "0%";

    const numericValue =
      typeof value === "string"
        ? parseInt(value.replace(/[^\d]/g, "")) || 0
        : value || 0;

    // If value is 0, progress bar should be empty
    if (numericValue === 0) return "0%";

    // Define reasonable maximums for different types of data
    let maxValue = 1000; // Default maximum

    if (title.toLowerCase().includes("student")) {
      maxValue = 2000; // Schools typically have up to 2000 students
    } else if (title.toLowerCase().includes("teacher")) {
      maxValue = 200; // Schools typically have up to 200 teachers
    } else if (title.toLowerCase().includes("parent")) {
      maxValue = 2000; // Parents roughly match student count
    } else if (
      title.toLowerCase().includes("admin") ||
      title.toLowerCase().includes("staff")
    ) {
      maxValue = 50; // Schools typically have up to 50 admin/staff
    } else if (title.toLowerCase().includes("class")) {
      maxValue = 100; // Schools typically have up to 100 classes
    } else if (title.toLowerCase().includes("subject")) {
      maxValue = 50; // Schools typically have up to 50 subjects
    } else if (title.toLowerCase().includes("assignment")) {
      maxValue = 100; // Reasonable maximum for pending assignments
    } else if (title.toLowerCase().includes("event")) {
      maxValue = 200; // Schools typically have up to 200 events
    }

    // Calculate percentage, cap at 100%
    const percentage = Math.min((numericValue / maxValue) * 100, 100);
    return `${percentage}%`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}
          >
            <div className="w-6 h-6 bg-white bg-opacity-30 rounded"></div>
          </div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-20 h-8 bg-gray-200 rounded mb-2"></div>
        <div className="w-24 h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-6 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white text-xl`}
        >
          {typeof icon === "string" && icon.startsWith("/") ? (
            <img src={icon} alt={title} className="w-6 h-6" />
          ) : (
            <span>{icon}</span>
          )}
        </div>
        {change && (
          <div
            className={`flex items-center text-sm font-medium ${getChangeColor()}`}
          >
            <span className="mr-1">{getChangeIcon()}</span>
            <span>{change}</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <h3 className="text-2xl font-bold text-gray-900">
          {formatValue(animatedValue)}
        </h3>
      </div>

      <p className="text-sm text-gray-600 font-medium">{title}</p>

      {/* Progress bar for visual appeal */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-1000 ${color}`}
            style={{
              width: getProgressWidth(),
              backgroundColor: color.replace("bg-", "").replace("-500", ""),
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default DynamicStatsCard;
