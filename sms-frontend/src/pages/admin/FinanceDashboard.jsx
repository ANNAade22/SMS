import React from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  CurrencyDollarIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const FinanceDashboard = () => {
  const { user } = useAuth();

  const roleTitles = {
    finance_admin: "Finance Administrator",
    super_admin: "Super Administrator",
  };

  const roleTitle = roleTitles[user?.role] || "Finance Administrator";

  const quickActions = [
    {
      title: "Fee Management",
      description: "Manage student fees and fee assignments",
      icon: CurrencyDollarIcon,
      href: "/finance-admin/finance",
      color: "bg-green-500",
    },
    {
      title: "Payment Tracking",
      description: "Track and manage payments",
      icon: ChartBarIcon,
      href: "/finance-admin/finance-enhanced",
      color: "bg-blue-500",
    },
    {
      title: "Student Records",
      description: "View student financial records",
      icon: UsersIcon,
      href: "/finance-admin/students",
      color: "bg-purple-500",
    },
    {
      title: "Parent Information",
      description: "Access parent contact information",
      icon: UsersIcon,
      href: "/finance-admin/parents",
      color: "bg-indigo-500",
    },
    {
      title: "Financial Reports",
      description: "Generate financial reports",
      icon: DocumentTextIcon,
      href: "/finance-admin/finance",
      color: "bg-yellow-500",
    },
    {
      title: "Events",
      description: "View school events",
      icon: CalendarDaysIcon,
      href: "/finance-admin/events",
      color: "bg-pink-500",
    },
    {
      title: "Announcements",
      description: "View school announcements",
      icon: SpeakerWaveIcon,
      href: "/finance-admin/announcements",
      color: "bg-red-500",
    },
    {
      title: "Messages",
      description: "Send and receive messages",
      icon: ChatBubbleLeftRightIcon,
      href: "/finance-admin/messages",
      color: "bg-teal-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Finance Administration Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.name || "Finance Admin"}! Manage financial
              operations and student records.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Role</p>
            <p className="text-lg font-semibold text-gray-900">{roleTitle}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <a
            key={index}
            href={action.href}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className={`${action.color} p-3 rounded-lg`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {action.description}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-green-600">+0% from last month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Active Students
              </p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-blue-600">+0% from last month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Outstanding Fees
              </p>
              <p className="text-2xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-yellow-600">0 students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Financial Activity
        </h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">No recent activity</p>
              <p className="text-xs text-gray-500">
                Financial data will appear here
              </p>
            </div>
            <span className="text-xs text-gray-400">Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
