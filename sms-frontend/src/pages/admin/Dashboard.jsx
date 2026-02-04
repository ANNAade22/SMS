import DynamicStatsCard from "../../components/DynamicStatsCard";
import DashboardChart from "../../components/DashboardChart";
import FinanceAdminMonitor from "../../components/FinanceAdminMonitor";
import { useDashboard } from "../../hooks/useDashboard";
import { useAuth } from "../../hooks/useAuth";

const Dashboard = ({ role = "admin" }) => {
  const { stats, activities, charts, isLoading, error } = useDashboard();
  const { user } = useAuth();

  const roleTitles = {
    admin: "Admin Dashboard",
    teacher: "Teacher Dashboard",
    student: "Student Dashboard",
    parent: "Parent Dashboard",
  };

  const roleDescriptions = {
    admin: "School management system overview",
    teacher: "Your teaching activities and student progress",
    student: "Your academic progress and assignments",
    parent: "Your children's academic information",
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {roleTitles[role] || "Dashboard"}
            </h1>
            <p className="text-gray-600 mt-1">
              {roleDescriptions[role] || "Overview"}
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard data
              </h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Dashboard"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Overview"}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
            Role:{" "}
            {role === "admin"
              ? "Admin"
              : role === "teacher"
              ? "Teacher"
              : role === "student"
              ? "Student"
              : "Parent"}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats &&
          stats.map((stat, index) => (
            <DynamicStatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              changeType={stat.changeType}
              icon={stat.icon}
              color={stat.color}
              isLoading={isLoading}
            />
          ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts &&
          charts.map((chart, index) => (
            <DashboardChart
              key={index}
              type={chart.type}
              data={chart.data}
              title={chart.title}
              height={300}
            />
          ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <span className="text-2xl mb-2 block">➕</span>
              <span className="text-sm font-medium">Add Student</span>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <span className="text-2xl mb-2 block">📝</span>
              <span className="text-sm font-medium">Create Exam</span>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <span className="text-2xl mb-2 block">📢</span>
              <span className="text-sm font-medium">Post Announcement</span>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-center">
              <span className="text-2xl mb-2 block">📊</span>
              <span className="text-sm font-medium">View Reports</span>
            </div>
          </button>
        </div>
      </div>

      {/* Finance Admin Monitoring - Only for Super Admin */}
      {user?.role === "super_admin" && <FinanceAdminMonitor />}
    </div>
  );
};

export default Dashboard;
