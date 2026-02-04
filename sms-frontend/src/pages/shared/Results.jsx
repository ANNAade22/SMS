import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import EnhancedTable from "../../components/EnhancedTable";
import resultsService from "../../services/resultsService";
import semesterService from "../../services/semesterService";

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

const Results = () => {
  const [selectedSemester, setSelectedSemester] = useState(null);
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();
  const role = currentUser?.role || "admin";

  const roleTitles = {
    admin: t("results.adminTitle") || "Admin - Results Management",
    teacher: t("results.teacherTitle") || "Teacher - Results",
    student: t("results.studentTitle") || "Student - My Results",
    parent: t("results.parentTitle") || "Parent - Results",
  };
  const roleDescriptions = {
    admin: t("results.adminDescription") || "Manage and record student results",
    teacher:
      t("results.teacherDescription") ||
      "Record and manage results for your classes",
    student:
      t("results.studentDescription") ||
      "View your academic progress and results",
    parent: t("results.parentDescription") || "View your children's results",
  };

  // Fetch student results
  const {
    data: studentResults,
    isLoading: resultsLoading,
    error: resultsError,
  } = useQuery({
    queryKey: ["student-results"],
    queryFn: async () => {
      if (role !== "student") return [];

      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/results/student/my-results`
      );

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Error response:", errorData);
        throw new Error(
          `Failed to fetch student results: ${res.status} ${res.statusText}`
        );
      }

      const json = await res.json();
      return json.data.semesters || [];
    },
    enabled: role === "student",
  });

  // Student view with beautiful semester cards
  if (role === "student") {
    if (resultsLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (resultsError) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold">
              Error Loading Results
            </h3>
            <p className="text-red-700 mt-2">{resultsError.message}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600">
                Show technical details
              </summary>
              <pre className="text-xs bg-red-100 p-2 mt-2 rounded overflow-auto">
                {JSON.stringify(resultsError, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      );
    }

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
              className={`transition-all duration-1000 ease-out ${gpa >= 3.5
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
                    className={`h-2 rounded-full transition-all duration-1000 ${subject.averageScore >= 90
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
                        className={`text-sm font-medium ${result.percentage >= 90
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
    <AdminResultsView
      role={role}
      roleTitles={roleTitles}
      roleDescriptions={roleDescriptions}
    />
  );
};

function AdminResultsView({ role, roleTitles, roleDescriptions }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const getInitialForm = () => ({
    assessmentTitle: "",
    class: "",
    subject: "",
    student: "",
    grade: "",
    section: "",
    examType: "Quiz",
    gradingPeriod: "Continuous Assessment",
    date: new Date().toISOString().slice(0, 10),
    score: 0,
    totalMarks: 100,
    status: "Pending",
    remarks: "",
  });
  const [form, setForm] = useState(getInitialForm());

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch current semester
  const { data: currentSemester } = useQuery({
    queryKey: ["current-semester"],
    queryFn: semesterService.getCurrentSemester,
    retry: false, // Don't retry on 404 errors
  });

  // Fetch all semesters for filter
  const {
    data: semesters = [],
    error: semestersError,
    isLoading: semestersLoading,
  } = useQuery({
    queryKey: ["semesters"],
    queryFn: semesterService.getAllSemesters,
  });

  const getStudentLabel = (st) => {
    const name =
      st?.name ||
      [st?.firstName, st?.lastName].filter(Boolean).join(" ") ||
      st?.fullName ||
      st?.user?.name ||
      st?.user?.username ||
      "Unnamed";
    const idPart = st?.admissionNo || st?.rollNo || st?.studentId || "";
    return idPart ? `${name} (${idPart})` : name;
  };

  const load = async () => {
    try {
      setLoading(true);
      let data;
      if (selectedSemester) {
        // Filter by selected semester
        data = await resultsService.list({
          semester: selectedSemester.semester,
          academicYear: selectedSemester.academicYear,
        });
      } else {
        // Load results from current semester (when "All Semesters (Current)" is selected)
        // Don't send any parameters to let backend use current semester logic
        data = await resultsService.list({});
      }
      setRows(data);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedSemester]);

  const calcLetterGrade = (pct) => {
    if (pct >= 95) return "A+";
    if (pct >= 90) return "A";
    if (pct >= 85) return "A-";
    if (pct >= 80) return "B+";
    if (pct >= 75) return "B";
    if (pct >= 70) return "B-";
    if (pct >= 65) return "C+";
    if (pct >= 60) return "C";
    if (pct >= 55) return "C-";
    if (pct >= 50) return "D";
    return "F";
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === "score" || name === "totalMarks") {
        const scoreNum = Number(name === "score" ? value : next.score);
        const totalNum = Number(
          name === "totalMarks" ? value : next.totalMarks
        );
        if (totalNum > 0) {
          const pct = (scoreNum / totalNum) * 100;
          next.grade = calcLetterGrade(pct);
          next.status = Number.isFinite(scoreNum) ? "Graded" : next.status;
        }
      }
      return next;
    });

    // When class changes, fetch students for that class
    if (name === "class") {
      fetchStudentsForClass(value);
    }
    // When student changes, auto-fill class from student profile
    if (name === "student") {
      fetchStudentDetails(value);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await resultsService.create({
        ...form,
        date: new Date(form.date).toISOString(),
        score: Number(form.score),
        totalMarks: Number(form.totalMarks),
      });
      setOpen(false);
      await load();
    } catch (e) {
      alert(e.message || "Failed to create result");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "assessmentTitle", header: "Title" },
    { key: "examType", header: "Type" },
    { key: "gradingPeriod", header: "Period" },
    { key: "semester", header: "Semester" },
    {
      key: "date",
      header: "Date",
      render: (value, row) => {
        if (!value) return "N/A";
        const date = new Date(value);
        return isNaN(date.getTime())
          ? "Invalid Date"
          : date.toLocaleDateString();
      },
    },
    {
      key: "score",
      header: "Score",
      render: (value, row) => {
        const score = value ?? "N/A";
        const totalMarks = row?.totalMarks ?? "N/A";
        return `${score}/${totalMarks}`;
      },
    },
    { key: "grade", header: "Grade" },
    { key: "status", header: "Status" },
  ];

  const openModal = async () => {
    setForm(getInitialForm());
    setOpen(true);
    await loadOptions();
  };

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      // Fetch classes
      const cRes = await authService.authFetch(
        `${API_BASE_URL}/api/v1/classes`
      );
      const cJson = cRes.ok ? await cRes.json() : { data: { data: [] } };
      setClassOptions(cJson?.data?.data || []);
      // Fetch subjects (filter by class if selected)
      if (form.class) await fetchSubjectsForClass(form.class);
      else {
        const sRes = await authService.authFetch(
          `${API_BASE_URL}/api/v1/subjects`
        );
        const sJson = sRes.ok ? await sRes.json() : { data: { data: [] } };
        setSubjectOptions(sJson?.data?.data || []);
      }
      // Fetch students (filtered by class if selected, otherwise all)
      await fetchStudentsForClass(form.class);
    } catch (e) {
      console.error("Failed to load options", e);
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchStudentsForClass = async (classId) => {
    try {
      // List students filtered by class if backend supports; otherwise list all
      const url = `${API_BASE_URL}/api/v1/students${classId ? `?class=${encodeURIComponent(classId)}` : ""
        }`;
      const res = await authService.authFetch(url);
      const json = res.ok ? await res.json() : { data: { data: [] } };
      const list =
        json?.data?.data ||
        json?.data?.students ||
        json?.students ||
        json?.results ||
        json?.data ||
        [];
      setStudentOptions(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load students", e);
      setStudentOptions([]);
    }
  };

  const fetchSubjectsForClass = async (classId) => {
    try {
      const url = `${API_BASE_URL}/api/v1/subjects${classId ? `?class=${encodeURIComponent(classId)}` : ""
        }`;
      const res = await authService.authFetch(url);
      const json = res.ok ? await res.json() : { data: { data: [] } };
      const options = json?.data?.data || [];
      setSubjectOptions(options);
      // Auto-select if only one subject available
      if (
        (!form.subject || !options.find((o) => o._id === form.subject)) &&
        options.length === 1
      ) {
        setForm((f) => ({ ...f, subject: options[0]._id }));
      }
    } catch (e) {
      console.error("Failed to load subjects", e);
      setSubjectOptions([]);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    if (!studentId) return;
    try {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/${studentId}`
      );
      if (!res.ok) return;
      const json = await res.json();
      const studentDoc = json?.data?.data;
      const classId = studentDoc?.class?._id || studentDoc?.class;
      const section = studentDoc?.section || studentDoc?.class?.section;
      if (classId) {
        setForm((f) => ({ ...f, class: classId }));
        // Refresh students for this class to keep dropdown in sync
        fetchStudentsForClass(classId);
      }
      if (section) {
        setForm((f) => ({ ...f, section }));
      }
    } catch (e) {
      console.error("Failed to fetch student details", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("results.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] ||
              t("results.description") ||
              "Results management page"}
          </p>
          {currentSemester ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">Current Semester:</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {currentSemester.semester} {currentSemester.academicYear}
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">Current Semester:</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                No Active Semester
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(role === "super_admin" ||
            role === "school_admin" ||
            role === "academic_admin" ||
            role === "exam_admin") && (
              <button
                onClick={openModal}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Create Result
              </button>
            )}
        </div>
      </div>

      {/* Semester Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Filter by Semester:
            </span>
          </div>
          <select
            value={
              selectedSemester
                ? `${selectedSemester.semester}-${selectedSemester.academicYear}`
                : ""
            }
            onChange={(e) => {
              if (e.target.value === "") {
                setSelectedSemester(null);
              } else {
                // Handle academic year with dashes (e.g., "2025-2027")
                const parts = e.target.value.split("-");
                const semester = parts[0]; // "Semester 1"
                const academicYear = parts.slice(1).join("-"); // "2025-2027"
                setSelectedSemester({ semester, academicYear });
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Semesters (Current)</option>
            {semesters && semesters.length > 0 ? (
              semesters.map((semester) => (
                <option
                  key={semester._id}
                  value={`${semester.semester}-${semester.academicYear}`}
                >
                  {semester.semester} {semester.academicYear}
                </option>
              ))
            ) : (
              <option value="" disabled>
                {semestersLoading
                  ? "Loading semesters..."
                  : "No semesters available"}
              </option>
            )}
          </select>
          {selectedSemester && (
            <button
              onClick={() => setSelectedSemester(null)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        {!loading && rows.length === 0 && !currentSemester ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Results Found
            </h3>
            <p className="text-gray-500 mb-4">
              There are no results available. This could be because:
            </p>
            <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
              <li>• No active semester is currently set</li>
              <li>• No results have been recorded yet</li>
              <li>• Results are filtered by a specific semester</li>
            </ul>
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        ) : (
          <EnhancedTable
            title="Results"
            data={rows}
            columns={columns}
            pageSize={8}
            loading={loading}
          />
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Create Result</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  name="assessmentTitle"
                  value={form.assessmentTitle}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Class
                  </label>
                  <select
                    name="class"
                    value={form.class}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={!!form.student && !!form.class}
                    required
                  >
                    <option value="">Select class…</option>
                    {classOptions.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {form.student && form.class && (
                    <p className="mt-1 text-xs text-gray-500">
                      Auto-filled from selected student.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select subject…</option>
                    {subjectOptions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Student
                  </label>
                  <select
                    name="student"
                    value={form.student}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select student…</option>
                    {studentOptions.map((st) => (
                      <option key={st._id} value={st._id}>
                        {getStudentLabel(st)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Exam Type
                  </label>
                  <select
                    name="examType"
                    value={form.examType}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    {[
                      "Quiz",
                      "Midterm",
                      "Final",
                      "Assignment",
                      "Project",
                      "Lab Exam",
                      "Other",
                    ].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Grading Period
                  </label>
                  <select
                    name="gradingPeriod"
                    value={form.gradingPeriod}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    {["Continuous Assessment", "Mid-term", "Final"].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Section
                  </label>
                  <input
                    name="section"
                    value={form.section}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={!!form.student && !!form.section}
                  />
                  {form.student && form.section && (
                    <p className="mt-1 text-xs text-gray-500">
                      Auto-filled from selected student.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Score
                  </label>
                  <input
                    type="number"
                    name="score"
                    value={form.score}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    name="totalMarks"
                    value={form.totalMarks}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Grade
                  </label>
                  <input
                    name="grade"
                    value={form.grade}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-calculated from score and total marks.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    {["Graded", "Pending", "Incomplete"].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-md text-white ${submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-3">
              Tip: Pick a student first — class auto-fills and locks. Grade
              auto-calculates from score.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Results;
