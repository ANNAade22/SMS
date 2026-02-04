import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordAtLoginSchema } from "../utils/formSchemas";
import Modal from "./ui/Modal";
import authService from "../services/authService";
import {
  EyeIcon,
  EyeSlashIcon,
  AcademicCapIcon,
  UserIcon,
  LockClosedIcon,
  BookOpenIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
// Clean implementation starts here
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [resetOpen, setResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { syncAuthState } = useAuth();
  const {
    register: regChange,
    handleSubmit: submitChange,
    reset: resetChange,
    setFocus,
    formState: { errors: errChange },
  } = useForm({ resolver: zodResolver(changePasswordAtLoginSchema) });

  // Focus first field when modal opens
  useEffect(() => {
    if (resetOpen) {
      // Defer to ensure inputs are mounted
      setTimeout(() => setFocus("username"), 0);
    }
  }, [resetOpen, setFocus]);

  // Focus first invalid field on validation error
  useEffect(() => {
    const keys = Object.keys(errChange || {});
    if (keys.length > 0) setFocus(keys[0]);
  }, [errChange, setFocus]);

  const handleLoginError = (_status, data) => {
    const message = data?.message || "Login failed. Please try again.";
    if (message.includes("username and password")) {
      toast.error("Please provide both username and password.");
    } else if (message.includes("Invalid") || message.includes("incorrect")) {
      toast.error("Invalid username or password. Please try again.");
    } else if (message.includes("deactivated")) {
      toast.error(
        "Your account has been deactivated. Please contact administrator."
      );
    } else if (message.includes("locked") || message.includes("attempts")) {
      toast.error(
        "Account is temporarily locked due to too many failed attempts. Please try again later or contact administrator."
      );
    } else if (message.includes("Too many") || message.includes("rate limit")) {
      toast.error(
        "Too many login attempts. Please wait a few minutes before trying again."
      );
    } else {
      toast.error(message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({
        username: username.trim().toLowerCase(),
        password,
      });
      if (result.passwordChangeRequired) {
        // Auto-open modal for password setup, prefill old password
        resetChange({
          username,
          currentPassword: password,
          password: "",
          passwordConfirm: "",
        });
        setResetOpen(true);
        return; // Don't navigate yet
      }
      if (result.success) {
        const user = result.user;
        let displayName =
          user.profile?.firstName || user.profile?.lastName || "";
        // After login, fetch enriched profile (populated teacher/student/parent)
        try {
          const { response, data } = await authService.getProfile();
          if (response.ok && data?.data?.data) {
            const full = data.data.data;
            displayName =
              full?.teacherProfile?.name ||
              full?.studentProfile?.name ||
              full?.parentProfile?.name ||
              full?.profile?.firstName ||
              full?.profile?.lastName ||
              user.username;
          } else {
            displayName = displayName || user.username;
          }
        } catch {
          displayName = displayName || user.username;
        }
        // If still no surname for teachers, fetch direct teacher profile
        if (
          (!displayName || displayName === user.username) &&
          user.role === "teacher"
        ) {
          try {
            const res = await authService.authFetch(
              `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/teachers/me`
            );
            if (res.ok) {
              const j = await res.json();
              const t = j?.data?.data;
              const n = t?.name || t?.surname || "";
              if (n) displayName = n;
            }
          } catch {
            /* ignore */
          }
        }
        toast.success(`Welcome back, ${displayName}!`);
        // Special redirect for exam_admin to go directly to exams
        if (user.role === "exam_admin") {
          navigate("/admin/exams");
        } else if (user.role === "finance_admin") {
          // Special redirect for finance_admin to go directly to finance page
          navigate("/admin/finance");
        } else {
          const map = {
            super_admin: "admin",
            school_admin: "admin",
            academic_admin: "admin",
            student_affairs_admin: "admin",
            it_admin: "admin",
            teacher: "teacher",
            student: "student",
            parent: "parent",
          };
          const seg = map[user.role] || "admin";
          navigate(`/${seg}/dashboard`);
        }
      } else {
        handleLoginError(null, { message: result.error });
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex"
    >
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute top-20 left-16 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-24 w-16 h-16 bg-yellow-300/20 rounded-lg rotate-45 animate-bounce"></div>
        <div className="absolute bottom-32 left-20 w-12 h-12 bg-pink-300/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-60 right-16 w-24 h-6 bg-green-300/20 rounded-full animate-pulse delay-500"></div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-12 text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-2xl mx-auto">
              <img
                src="/logo.jpeg"
                alt="Logo"
                className="w-16 h-16 object-contain rounded-lg"
              />
            </div>
            <h1 className="text-4xl font-bold mb-2">Advanced Education Management</h1>
            <p className="text-xl text-indigo-100">School Management System</p>
          </div>

          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <BookOpenIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Academic Excellence</h3>
                <p className="text-indigo-200 text-sm">
                  Streamline curriculum and track student progress
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Community Connection</h3>
                <p className="text-indigo-200 text-sm">
                  Unite teachers, students, and parents
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Data-Driven Insights</h3>
                <p className="text-indigo-200 text-sm">
                  Make informed decisions with analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
              <img
                src="/logo.jpeg"
                alt="Logo"
                className="w-12 h-12 object-contain rounded-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Advanced Education Management
            </h1>
            <p className="text-gray-600">School Management System</p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back!
            </h2>
            <p className="text-gray-600">
              Please sign in to access your dashboard
            </p>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-amber-800">
                  Demo Access
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Username:{" "}
                  <span className="font-mono bg-amber-100 px-1 rounded">
                    student1
                  </span>
                  <br />
                  Password:{" "}
                  <span className="font-mono bg-amber-100 px-1 rounded">
                    Password123!
                  </span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-r-xl transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-white font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  Sign in to Dashboard
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
              onClick={() => setResetOpen(true)}
            >
              Change Password (old -&gt; new)
            </button>
            {!authService.getToken() &&
              !sessionStorage.getItem("firstLoginToken") && (
                <p className="mt-2 text-xs text-gray-500">
                  You must be logged in or in first-time setup to change
                  password. Use forgot password instead.
                </p>
              )}
          </div>

          {resetOpen && (
            <Modal
              title="Change Password"
              onClose={() => {
                setResetOpen(false);
                setSubmitting(false);
                resetChange();
              }}
              size="sm"
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen(false);
                      setSubmitting(false);
                      resetChange();
                    }}
                    className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button
                    form="change-at-login-form"
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? "Updating..." : "Change Password"}
                  </button>
                </>
              }
            >
              <form
                id="change-at-login-form"
                onSubmit={submitChange(async (vals) => {
                  setSubmitting(true);
                  try {
                    let firstToken = sessionStorage.getItem("firstLoginToken");
                    let hasAuth = !!authService.getToken();
                    if (!firstToken && !hasAuth) {
                      const loginResult = await login({
                        username: (vals.username || "").trim().toLowerCase(),
                        password: vals.currentPassword,
                      });
                      if (!loginResult.success) {
                        toast.error(
                          loginResult.error || "Invalid username or password."
                        );
                        return;
                      }
                      hasAuth = true;
                    }
                    let successMsg;
                    if (firstToken) {
                      await authService.completeFirstLogin(vals.password);
                      successMsg = "Password set successfully! Welcome.";
                      sessionStorage.removeItem("firstLoginToken");
                    } else {
                      const upd = await authService.updatePassword({
                        currentPassword: vals.currentPassword,
                        password: vals.password,
                      });
                      if (!upd.response.ok)
                        throw new Error(
                          upd.data?.message || "Failed to change password"
                        );
                      successMsg = "Password changed successfully!";
                    }
                    toast.success(successMsg);

                    // Sync context after change
                    syncAuthState();

                    setResetOpen(false);
                    const u = authService.getUser();
                    if (u?.role) {
                      // Special redirect for exam_admin to go directly to exams
                      if (u.role === "exam_admin") {
                        navigate("/admin/exams");
                      } else {
                        const map = {
                          super_admin: "admin",
                          school_admin: "admin",
                          academic_admin: "admin",
                          finance_admin: "admin",
                          student_affairs_admin: "admin",
                          it_admin: "admin",
                          teacher: "teacher",
                          student: "student",
                          parent: "parent",
                        };
                        const seg = map[u.role] || "admin";
                        navigate(`/${seg}/dashboard`);
                      }
                    }
                  } catch (e) {
                    toast.error(e.message || "Failed to change password");
                  } finally {
                    setSubmitting(false);
                  }
                })}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    {...regChange("username")}
                    defaultValue={username}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Username"
                  />
                  {errChange.username && (
                    <p className="text-red-500 text-xs mt-1">
                      {errChange.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    {...regChange("currentPassword")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errChange.currentPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errChange.currentPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    {...regChange("password")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errChange.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {errChange.password.message}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Min 8 chars with uppercase, lowercase, numbers and special characters.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    {...regChange("passwordConfirm")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errChange.passwordConfirm && (
                    <p className="text-red-500 text-xs mt-1">
                      {errChange.passwordConfirm.message}
                    </p>
                  )}
                </div>
              </form>
            </Modal>
          )}

          <div className="mt-8 text-center text-xs text-gray-500">
            <p>
              © 2025 Advanced Education Management. Empowering education through technology.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
