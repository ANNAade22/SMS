import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp } from "lucide-react";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import EnhancedTable from "../../components/EnhancedTable";

const LoadingSpinner = ({ size = "sm", color = "blue" }) => {
  const sizeClasses = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
    white: "text-white",
  };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
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
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

const Results = ({ role = "admin" }) => {
  const roleTitles = {
    admin: "Admin - Results Management",
    teacher: "Teacher - Results",
    student: "Student - My Results",
    parent: "Parent - Results",
  };
  const roleDescriptions = {
    admin: "Manage and record student results",
    teacher: "Record and manage results for your classes",
    student: "View your academic progress and results",
    parent: "View your children's results",
  };

  // Student-specific state
  const [selectedSemester, setSelectedSemester] = useState(null);

  // Fetch student results
  const { data: studentResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["student-results"],
    queryFn: async () => {
      if (role !== "student") return [];
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/results/student/my-results`
      );
      if (!res.ok) throw new Error("Failed to fetch student results");
      const json = await res.json();
      return json.data.semesters || [];
    },
    enabled: role === "student",
  });

  // Student view with beautiful semester cards
  if (role === "student") {
    // Grade color mappings
    const getGradeColor = (grade) => {
      const colors = {
        "A+": "bg-green-100 text-green-800 border-green-200",
        A: "bg-green-100 text-green-700 border-green-200",
        "A-": "bg-green-50 text-green-700 border-green-200",
        "B+": "bg-blue-100 text-blue-800 border-blue-200",
        B: "bg-blue-100 text-blue-700 border-blue-200",
        "B-": "bg-blue-50 text-blue-700 border-blue-200",
        "C+": "bg-yellow-100 text-yellow-800 border-yellow-200",
        C: "bg-yellow-100 text-yellow-700 border-yellow-200",
        "C-": "bg-yellow-50 text-yellow-700 border-yellow-200",
        D: "bg-orange-100 text-orange-800 border-orange-200",
        F: "bg-red-100 text-red-800 border-red-200",
      };
      return colors[grade] || "bg-gray-100 text-gray-700 border-gray-200";
    };

    // GPA progress circle component
    const GPACircle = ({ gpa, size = "lg" }) => {
      const percentage = (gpa / 4.0) * 100;
      const circumference = 2 * Math.PI * 35;
      const strokeDasharray = circumference;
      const strokeDashoffset =
        circumference - (percentage / 100) * circumference;

      const sizeClasses = {
        sm: "w-16 h-16",
        md: "w-20 h-20",
        lg: "w-24 h-24",
      };

      return (
        <div className={`relative ${sizeClasses[size]}`}>
          <svg
            className="transform -rotate-90 w-full h-full"
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ease-out ${
                gpa >= 3.5
                  ? "text-green-500"
                  : gpa >= 3.0
                  ? "text-blue-500"
                  : gpa >= 2.5
                  ? "text-yellow-500"
                  : gpa >= 2.0
                  ? "text-orange-500"
                  : "text-red-500"
              }`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {gpa.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">GPA</div>
            </div>
          </div>
        </div>
      );
    };

    // Semester card component
    const SemesterCard = ({ semester }) => (
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={() => setSelectedSemester(semester)}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {semester.semester} {semester.academicYear}
            </h3>
            <p className="text-sm text-gray-600">
              {semester.subjects.length} Subject
              {semester.subjects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <GPACircle gpa={semester.gpa || 0} size="md" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Overall %</div>
            <div className="text-lg font-semibold text-gray-900">
              {semester.overallPercentage
                ? semester.overallPercentage.toFixed(1)
                : 0}
              %
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Assessments</div>
            <div className="text-lg font-semibold text-gray-900">
              {semester.resultCount}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {semester.subjects.slice(0, 3).map((subject, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getGradeColor(
                subject.letterGrade
              )}`}
            >
              {subject.subject.name}: {subject.letterGrade}
            </span>
          ))}
          {semester.subjects.length > 3 && (
            <span className="text-xs text-gray-500">
              +{semester.subjects.length - 3} more
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center text-sm text-blue-600">
          <span>View Details</span>
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    );

    // Subject detail view
    const SubjectDetailView = ({ semester }) => (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setSelectedSemester(null)}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Semesters
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {semester.semester} {semester.academicYear}
            </h2>
            <p className="text-gray-600">Detailed Results</p>
          </div>
        </div>

        {/* Semester Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center justify-center">
              <GPACircle gpa={semester.gpa || 0} size="lg" />
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">
                Overall Percentage
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {semester.overallPercentage
                  ? semester.overallPercentage.toFixed(1)
                  : 0}
                %
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">
                Total Subjects
              </div>
              <div className="text-2xl font-bold text-green-900">
                {semester.subjects.length}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">
                Assessments
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {semester.resultCount}
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {semester.subjects.map((subject, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {subject.subject.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {subject.subject.code} • {subject.results.length} Assessment
                    {subject.results.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getGradeColor(
                    subject.letterGrade
                  )}`}
                >
                  {subject.letterGrade}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Average</span>
                  <span>{subject.averageScore.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      subject.averageScore >= 90
                        ? "bg-green-500"
                        : subject.averageScore >= 80
                        ? "bg-blue-500"
                        : subject.averageScore >= 70
                        ? "bg-yellow-500"
                        : subject.averageScore >= 60
                        ? "bg-orange-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(subject.averageScore, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {subject.results.map((result, resultIndex) => (
                  <div
                    key={resultIndex}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {result.assessmentTitle}
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.examType} •{" "}
                        {new Date(result.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {result.score}/{result.totalMarks}
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          result.percentage >= 90
                            ? "text-green-600"
                            : result.percentage >= 80
                            ? "text-blue-600"
                            : result.percentage >= 70
                            ? "text-yellow-600"
                            : result.percentage >= 60
                            ? "text-orange-600"
                            : "text-red-600"
                        }`}
                      >
                        {result.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {selectedSemester ? (
          <SubjectDetailView semester={selectedSemester} />
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Academic Results
              </h1>
              <p className="text-gray-600">
                Track your academic progress across semesters
              </p>
            </div>

            {resultsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" color="blue" />
              </div>
            ) : !studentResults || studentResults.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results yet
                </h3>
                <p className="text-gray-500">
                  Your academic results will appear here once grades are
                  published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentResults.map((semester, index) => (
                  <SemesterCard key={index} semester={semester} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Admin/Teacher view with table interface (simplified for now)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Results"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Results management page"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>
        <EnhancedTable title="Results" data={[]} columns={[]} pageSize={8} />
      </div>
    </div>
  );
};

export default Results;
