import React from "react";

const toTitle = (str = "") =>
  str
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));

const getAccessLabel = (role) => {
  switch (role) {
    case "super_admin":
      return "Full Access";
    case "school_admin":
      return "Wide Access";
    case "academic_admin":
      return "Academic Admin Access";
    case "exam_admin":
      return "Examination Admin Access";
    case "finance_admin":
      return "Finance Admin Access";
    case "student_affairs_admin":
      return "Student Affairs Admin Access";
    case "it_admin":
      return "IT Admin Access";
    case "teacher":
      return "Teaching Access";
    case "student":
      return "Student Access";
    default:
      return "Limited Access";
  }
};

const defaultCapabilities = {
  super_admin: [
    "Manage everything",
    "All departments",
    "User/Role management",
    "System settings",
  ],
  school_admin: [
    "Manage most operations",
    "All departments",
    "User management",
  ],
  academic_admin: [
    "Curriculum management",
    "Assign teachers",
    "Approve grades",
  ],
  exam_admin: [
    "Create/edit/delete exams",
    "Manage schedules",
    "View/generate reports",
  ],
  finance_admin: ["Manage fees and payments", "Financial reporting"],
  student_affairs_admin: [
    "Manage student records",
    "Admissions & events",
    "Disciplinary handling",
  ],
  it_admin: [
    "Manage system",
    "View logs",
    "Configure settings",
    "User management",
  ],
  teacher: ["Subjects & grading", "View student progress"],
  student: ["View courses", "Assignments & grades"],
  parent: ["View child progress", "Communicate"],
};

export default function RoleAccess({ role, permissions }) {
  const label = getAccessLabel(role);
  const caps =
    Array.isArray(permissions) && permissions.length
      ? permissions.map(toTitle)
      : defaultCapabilities[role] || ["Limited capabilities"];

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="capitalize font-medium">{role || "N/A"}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <ul className="mt-3 list-disc list-inside text-sm text-gray-600 space-y-1">
        {caps.slice(0, 6).map((cap) => (
          <li key={cap}>{cap}</li>
        ))}
        {caps.length > 6 && <li>and more…</li>}
      </ul>
    </div>
  );
}
