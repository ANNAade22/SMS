import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import { toast } from "react-toastify";

const rules = [
  { test: (v) => v.length >= 10, label: "At least 10 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "Uppercase letter" },
  { test: (v) => /[a-z]/.test(v), label: "Lowercase letter" },
  { test: (v) => /\d/.test(v), label: "Digit" },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: "Symbol" },
];

export default function FirstLogin() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const score = rules.reduce((acc, r) => acc + (r.test(pwd) ? 1 : 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const user = await authService.completeFirstLogin(pwd);
      if (user) {
        toast.success("Password set successfully");
        // Derive route by role
        const role = user.role;
        const roleMap = {
          super_admin: "admin",
          school_admin: "admin",
          academic_admin: "admin",
          exam_admin: "admin",
          finance_admin: "admin",
          student_affairs_admin: "admin",
          it_admin: "admin",
          teacher: "teacher",
          student: "student",
          parent: "parent",
        };
        const seg = roleMap[role] || "admin";
        navigate(`/${seg}/dashboard`);
      } else {
        toast.error("Failed to set password");
      }
    } catch (err) {
      toast.error(err.message || "Failed to set password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md space-y-6 border border-gray-200">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">First-Time Password Setup</h1>
          <p className="text-sm text-gray-600">
            Create a new secure password to activate your account.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="space-y-1">
            <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
              <div
                className={`h-2 transition-all ${
                  score <= 2
                    ? "bg-red-500 w-1/5"
                    : score === 3
                    ? "bg-yellow-500 w-3/5"
                    : score === 4
                    ? "bg-green-500 w-4/5"
                    : score === 5
                    ? "bg-emerald-600 w-full"
                    : "w-0"
                }`}
              ></div>
            </div>
            <ul className="text-[11px] text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
              {rules.map((r) => (
                <li
                  key={r.label}
                  className={r.test(pwd) ? "text-emerald-600" : ""}
                >
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
          <button
            disabled={submitting}
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Setting..." : "Set Password"}
          </button>
        </form>
        <p className="text-xs text-gray-500">
          This token will expire in 15 minutes. If it expires ask an
          administrator to regenerate it.
        </p>
      </div>
    </div>
  );
}
