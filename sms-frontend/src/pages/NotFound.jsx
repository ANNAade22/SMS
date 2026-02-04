import { Link } from "react-router-dom";
import {
  Home,
  Search,
  BookOpen,
  Users,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated 404 Text */}
        <div className="relative mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 text-9xl font-bold text-blue-200 animate-ping">
            404
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
          {/* Illustration */}
          <div className="mb-8">
            <div className="relative">
              <div className="w-32 h-32 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Search className="w-16 h-16 text-blue-600 animate-bounce" />
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
              <div className="absolute -bottom-2 -left-4 w-6 h-6 bg-green-400 rounded-full animate-bounce delay-200"></div>
              <div className="absolute top-8 right-8 w-4 h-4 bg-red-400 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Looks like you&apos;ve wandered into uncharted territory! The page
            you&apos;re looking for doesn&apos;t exist in our School Management
            System. Don&apos;t worry, let&apos;s get you back on track!
          </p>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link
              to="/"
              className="group bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <Home className="w-8 h-8 mx-auto mb-2 group-hover:animate-bounce" />
              <span className="font-semibold">Go Home</span>
            </Link>

            <Link
              to="/admin/dashboard"
              className="group bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <GraduationCap className="w-8 h-8 mx-auto mb-2 group-hover:animate-bounce" />
              <span className="font-semibold">Admin Panel</span>
            </Link>

            <Link
              to="/student/dashboard"
              className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <Users className="w-8 h-8 mx-auto mb-2 group-hover:animate-bounce" />
              <span className="font-semibold">Student Portal</span>
            </Link>
          </div>

          {/* Fun Facts Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center">
              <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
              Did You Know?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="font-semibold text-indigo-600">📚</span> Our
                SMS manages over 1,000 students!
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="font-semibold text-indigo-600">👨‍🏫</span> We
                have 50+ dedicated teachers!
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="font-semibold text-indigo-600">📊</span> Track
                grades, assignments & more!
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="font-semibold text-indigo-600">🎯</span> 95%
                student satisfaction rate!
              </div>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-gray-500 text-sm">
          <p>© 2025 School Management System. All rights reserved.</p>
          <p className="mt-1">Need help? Contact our support team!</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
