import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import {
  HomeIcon,
  AcademicCapIcon,
  UsersIcon,
  UserGroupIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  PresentationChartLineIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  UserPlusIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const Menu = ({
  role = "admin",
  userRole = "super_admin",
  onMenuItemClick,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Check if user has permission for specific menu items
  const hasPermission = (permission) => {
    if (role !== "admin") return true; // Non-admin roles use simple visibility

    // Super admin has all permissions
    if (userRole === "super_admin") return true;

    // Define permissions for each admin role
    const rolePermissions = {
      school_admin: [
        "view_dashboard",
        "view_teachers",
        "view_students",
        "view_parents",
        "view_subjects",
        "view_classes",
        "view_finance",
        "view_lessons",
        "view_exams",
        "view_assignments",
        "view_results",
        "view_semester",
        "view_events",
        "view_sessions",
        "view_messages",
        "view_announcements",
        "view_registration",
        "view_admin_management",
        "view_audit",
        "view_settings",
        "manage_student_records",
      ],
      academic_admin: [
        "view_dashboard",
        "view_teachers",
        "view_students",
        "view_subjects",
        "view_classes",
        "view_lessons",
        "view_exams",
        "view_assignments",
        "view_results",
        "view_semester",
        "view_events",
        "view_messages",
        "view_announcements",
        "manage_student_records",
      ],
      exam_admin: [
        "view_students", // Read-only access to students
        "view_teachers",
        "view_exams",
        "view_assignments",
        "view_results",
        "view_events",
        "view_messages",
        "view_announcements",
      ],
      finance_admin: [
        "view_dashboard",
        "view_students",
        "view_parents",
        "view_finance",
        "view_events",
        "view_messages",
        "view_announcements",
      ],
      student_affairs_admin: [
        "view_dashboard",
        "view_students",
        "view_parents",
        "view_events",
        "view_messages",
        "view_announcements",
        "manage_student_records",
      ],
      it_admin: [
        "view_dashboard",
        "view_teachers",
        "view_students",
        "view_parents",
        "view_subjects",
        "view_classes",
        "view_lessons",
        "view_exams",
        "view_assignments",
        "view_results",
        "view_semester",
        "view_events",
        "view_sessions",
        "view_messages",
        "view_announcements",
        "view_registration",
        "view_admin_management",
        "view_audit",
        "view_settings",
      ],
    };

    return rolePermissions[userRole]?.includes(permission) || false;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: clear local storage and redirect
      localStorage.clear();
      navigate("/");
    }
  };

  // Dynamic menu items based on role
  const getMenuItems = (role) => {
    const basePath =
      role === "admin"
        ? "/admin"
        : role === "finance_admin"
          ? "/finance-admin"
          : role === "teacher"
            ? "/teacher"
            : role === "student"
              ? "/student"
              : "/parent";

    return [
      {
        title: "Menu",
        items: [
          {
            icon: HomeIcon,
            label: "Dashboard",
            href: `${basePath}/dashboard`,
            visible: ["admin", "teacher", "student", "parent"],
            permission: "view_dashboard",
          },
          {
            icon: AcademicCapIcon,
            label: "Teachers",
            href: `${basePath}/teachers`,
            visible: ["admin"],
            permission: "view_teachers",
          },
          {
            icon: UsersIcon,
            label: "Students",
            href: `${basePath}/students`,
            visible: ["admin", "teacher"],
            permission: "view_students",
          },
          {
            icon: UserGroupIcon,
            label: "Parents",
            href: `${basePath}/parents`,
            visible: ["admin"],
            permission: "view_parents",
          },
          {
            icon: BookOpenIcon,
            label: "Subjects",
            href: `${basePath}/subjects`,
            visible: ["admin"],
            permission: "view_subjects",
          },
          {
            icon: UserCircleIcon,
            label: "Profile",
            href: `${basePath}/profile`,
            visible: ["student"],
          },
          {
            icon: BuildingOfficeIcon,
            label: "Classes",
            href: `${basePath}/classes`,
            visible: ["admin"],
            permission: "view_classes",
          },
          {
            icon: CurrencyDollarIcon,
            label: "Finance",
            href: `${basePath}/finance`,
            visible: ["admin"],
            permission: "view_finance",
          },
          {
            icon: DocumentTextIcon,
            label: "Lessons",
            href: `${basePath}/lessons`,
            visible: ["admin"],
            permission: "view_lessons",
          },
          {
            icon: ClipboardDocumentListIcon,
            label: "Exams",
            href: `${basePath}/exams`,
            visible: ["admin", "teacher", "student"],
            permission: "view_exams",
          },
          {
            icon: ClipboardDocumentCheckIcon,
            label: "Assignments",
            href: `${basePath}/assignments`,
            visible: ["admin", "teacher", "student", "parent"],
            permission: "view_assignments",
          },
          {
            icon: PresentationChartLineIcon,
            label: "Results",
            href: `${basePath}/results`,
            visible: ["admin", "student", "parent"],
            permission: "view_results",
          },
          {
            icon: CalendarDaysIcon,
            label: "Semester Management",
            href: `${basePath}/semester-management`,
            visible: ["admin"],
            permission: "view_semester",
          },
          {
            icon: CalendarDaysIcon,
            label: "Events",
            href: `${basePath}/events`,
            visible: ["admin", "teacher", "student", "parent"],
            permission: "view_events",
          },
          {
            icon: Cog6ToothIcon,
            label: "Sessions",
            href: `${basePath}/sessions`,
            visible: ["admin"],
            permission: "view_sessions",
          },
          {
            icon: Cog6ToothIcon,
            label: "Staff Sessions",
            href: `${basePath}/staff-sessions`,
            visible: ["admin"],
            permission: "view_sessions",
          },
          {
            icon: ChatBubbleLeftRightIcon,
            label: "Messages",
            href: `${basePath}/messages`,
            visible: ["admin", "teacher", "student", "parent"],
            permission: "view_messages",
          },
          {
            icon: SpeakerWaveIcon,
            label: "Announcements",
            href: `${basePath}/announcements`,
            visible: ["admin", "teacher", "student", "parent"],
            permission: "view_announcements",
          },
          {
            icon: UserPlusIcon,
            label: "Registration",
            href: `${basePath}/registration`,
            visible: ["admin"],
            permission: "view_registration",
          },
          {
            icon: UserGroupIcon,
            label: "Admin Management",
            href: `${basePath}/admin-management`,
            visible: ["admin"],
            permission: "view_admin_management",
          },
          {
            icon: ShieldCheckIcon,
            label: "Audit Logs",
            href: `${basePath}/audit-logs`,
            visible: ["admin"],
            permission: "view_audit",
          },
          {
            icon: ExclamationTriangleIcon,
            label: "Token Events",
            href: `${basePath}/audit/first-login-tokens`,
            visible: ["admin"],
            permission: "view_audit",
          },
        ],
      },
      {
        title: "OTHER",
        items: [
          {
            icon: UserCircleIcon,
            label: "Profile",
            href: `${basePath}/profile`,
            visible: ["admin", "teacher", "student", "parent"],
          },
          {
            icon: Cog6ToothIcon,
            label: "Settings",
            href: `${basePath}/settings`,
            visible: ["admin"],
            permission: "view_settings",
          },
          {
            icon: ArrowRightOnRectangleIcon,
            label: "Logout",
            href: "/logout",
            visible: ["admin", "teacher", "student", "parent"],
          },
        ],
      },
    ];
  };

  const menuItems = getMenuItems(role);

  return (
    <div className="mt-6 text-sm px-4">
      {menuItems.map((section) => (
        <div className="flex flex-col gap-3 mb-6" key={section.title}>
          <span className="text-neutral-500 font-semibold my-2 text-xs lg:text-sm px-2 lg:px-0 uppercase tracking-wider text-center lg:text-left">
            {section.title}
          </span>
          {section.items.map((item) => {
            // Check role visibility
            const isRoleVisible = item.visible.includes(role);

            // Check permission for admin roles
            const hasItemPermission =
              !item.permission || hasPermission(item.permission);

            if (isRoleVisible && hasItemPermission) {
              const IconComponent = item.icon;

              if (item.label === "Logout") {
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setShowLogoutConfirm(true);
                    }}
                    className="group relative flex items-center py-3 px-4 rounded-xl transition-all duration-300 w-full overflow-hidden bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-red-300/50 active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                  >
                    <div className="relative z-10 flex items-center w-full">
                      <div className="relative flex-shrink-0">
                        <IconComponent className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                        <div className="absolute inset-0 w-5 h-5 bg-white/30 rounded-full scale-0 group-hover:scale-110 group-hover:animate-ping"></div>
                      </div>
                      <span className="flex-1 text-center text-sm font-semibold tracking-wide group-hover:tracking-wider transition-all duration-300">
                        {item.label}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </button>
                );
              }

              return (
                <Link
                  to={item.href}
                  key={item.label}
                  onClick={onMenuItemClick}
                  className={`group flex items-center py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${location.pathname === item.href
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-md"
                    }`}
                >
                  <IconComponent
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${location.pathname === item.href
                        ? "text-white"
                        : "text-gray-500 group-hover:text-indigo-600"
                      }`}
                  />
                  <span
                    className={`flex-1 text-center text-sm font-medium transition-colors ${location.pathname === item.href
                        ? "text-white"
                        : "group-hover:text-indigo-700"
                      }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }
            return null;
          })}
        </div>
      ))}

      {/* Logout Modal Portal - Renders at document body level to cover entire page */}
      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300"
              onClick={() => setShowLogoutConfirm(false)}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-sm transform transition-all duration-300 scale-100 opacity-100">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Content */}
                <div className="p-6">
                  {/* Icon and Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirm Logout
                    </h3>
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Are you sure you want to log out of your account?
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      You&apos;ll need to sign in again to access your
                      dashboard.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                      onClick={() => setShowLogoutConfirm(false)}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-lg hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2"
                      onClick={async () => {
                        setShowLogoutConfirm(false);
                        await handleLogout();
                        onMenuItemClick?.();
                      }}
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Menu;
