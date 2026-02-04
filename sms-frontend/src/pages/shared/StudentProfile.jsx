import EnhancedTable from "../../components/EnhancedTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";

const StudentProfile = ({ role = "student" }) => {
  const queryClient = useQueryClient();
  const roleTitles = {
    student: "My Profile",
    admin: "Student Profile",
    teacher: "Student Profile",
    parent: "Child Profile",
  };

  const roleDescriptions = {
    student: "View and manage your personal information",
    admin: "View student profile details",
    teacher: "View student information and progress",
    parent: "View your child's profile and information",
  };

  // Data loading
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/users/me`
      );
      const json = await res.json();
      return json.data?.data || json.data || json;
    },
  });

  // Prefer explicit id from query string for teacher/admin/parent views
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const queryId = searchParams.get("id");
  const studentId =
    queryId || me?.studentProfile?._id || me?.studentProfile || null;

  const { data: studentDoc, isLoading: studentLoading } = useQuery({
    queryKey: ["student", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      // For students, use the dedicated my-profile endpoint
      if (role === "student") {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/students/my-profile`
        );
        if (!res.ok) throw new Error("Failed to load student profile");
        const json = await res.json();
        return json.data?.data || json.data || json;
      }

      // For admin/teacher/parent, use the regular endpoint
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students/${studentId}`
      );
      if (!res.ok) throw new Error("Failed to load student profile");
      const json = await res.json();
      return json.data?.data || json.data || json;
    },
  });

  // Results/grades for academic records
  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["results", studentId, role],
    enabled: role === "student" ? true : !!studentId,
    queryFn: async () => {
      // Helper to flatten student-semester results from /results/student/my-results
      const flattenStudentSemesters = (semesters) => {
        const out = [];
        (semesters || []).forEach((sem) => {
          const subjects = Array.isArray(sem.subjects) ? sem.subjects : [];
          subjects.forEach((sub) => {
            const rlist = Array.isArray(sub.results) ? sub.results : [];
            rlist.forEach((r) => {
              out.push({
                _id: r._id,
                subject: sub.subject, // has name/code
                class: undefined, // not included in grouped payload
                grade: r.grade,
                totalMarks: r.totalMarks,
                score: r.score,
                examType: r.examType,
                date: r.date,
                status: r.status,
              });
            });
          });
        });
        return out;
      };

      // For students, use the dedicated endpoint
      if (role === "student") {
        const res = await authService.authFetch(
          `${API_BASE_URL}/api/v1/results/student/my-results`
        );
        if (!res.ok) throw new Error("Failed to load results");
        const json = await res.json();
        const semesters =
          json.data?.semesters || json.data?.data?.semesters || [];
        return flattenStudentSemesters(semesters);
      }

      // For admin/teacher/parent, query by student id (RBAC enforced by backend)
      const url = new URL(`${API_BASE_URL}/api/v1/results`);
      url.searchParams.set("student", studentId);
      url.searchParams.set("sort", "-date");
      url.searchParams.set("limit", "100");
      const res = await authService.authFetch(url.toString());

      // Fallback: if forbidden, try student-self endpoint to show at least own results
      if (res.status === 403) {
        const alt = await authService.authFetch(
          `${API_BASE_URL}/api/v1/results/student/my-results`
        );
        if (!alt.ok) throw new Error("Failed to load results");
        const j2 = await alt.json();
        const semesters = j2.data?.semesters || j2.data?.data?.semesters || [];
        return flattenStudentSemesters(semesters);
      }

      if (!res.ok) throw new Error("Failed to load results");
      const json = await res.json();
      return json.data?.data || json.data || [];
    },
  });

  const formatDate = (val) => {
    try {
      if (!val) return "—";
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const canSyncDob = !!(
    !studentDoc?.birthday &&
    me?.profile?.dateOfBirth &&
    (role === "student" || role === "admin")
  );

  const onSyncDob = async () => {
    if (!studentId || !me?.profile?.dateOfBirth) return;

    // For students, use the my-profile endpoint for updates
    const endpoint =
      role === "student"
        ? `${API_BASE_URL}/api/v1/students/my-profile`
        : `${API_BASE_URL}/api/v1/students/${studentId}`;

    const res = await authService.authFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday: me.profile.dateOfBirth }),
    });
    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    }
  };

  const academicRecords = (results || []).map((r) => ({
    id: r._id,
    subject: r.subject?.name || "",
    teacher: r.class?.name || "", // no direct teacher in result; show class name
    grade: r.grade,
    assignments: r.totalMarks ?? 100,
    completedAssignments: r.score ?? 0,
    averageScore: r.totalMarks
      ? Math.round((r.score / r.totalMarks) * 100)
      : undefined,
    examType: r.examType,
    date: r.date,
    status: r.status,
  }));

  // Behavior records are not implemented in backend yet (see notes below)
  const behaviorRecords = [];

  // Parent info (single parent object in current model)
  const parent = studentDoc?.parent || null;

  const getGradeBadge = (grade) => {
    const gradeConfig = {
      "A+": "bg-green-100 text-green-800",
      A: "bg-green-100 text-green-800",
      "A-": "bg-blue-100 text-blue-800",
      "B+": "bg-blue-100 text-blue-800",
      B: "bg-yellow-100 text-yellow-800",
      "B-": "bg-yellow-100 text-yellow-800",
      "C+": "bg-orange-100 text-orange-800",
      C: "bg-orange-100 text-orange-800",
      "C-": "bg-red-100 text-red-800",
      D: "bg-red-100 text-red-800",
      F: "bg-red-100 text-red-800",
    };
    return gradeConfig[grade] || "bg-gray-100 text-gray-800";
  };

  const getBehaviorBadge = (type) => {
    const typeConfig = {
      Positive: "bg-green-100 text-green-800",
      Warning: "bg-yellow-100 text-yellow-800",
      Negative: "bg-red-100 text-red-800",
    };
    return typeConfig[type] || "bg-gray-100 text-gray-800";
  };

  // Role-based permissions
  const canEditProfile = role === "admin"; // Only admins can edit student profiles
  const canContactStudent = role !== "student"; // Others can contact student
  const canViewBehavior = role === "admin" || role === "teacher";
  const canViewParents = role === "admin" || role === "teacher";

  // Contact button for non-student roles
  const showContactButton = canContactStudent;

  if (meLoading || studentLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm text-gray-600">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Student Profile"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Student profile page"}
          </p>
        </div>
        {canEditProfile && (
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
            Edit Profile
          </button>
        )}
        {showContactButton && (
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors ml-2">
            Contact Student
          </button>
        )}
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <p className="mt-1 text-sm text-gray-900">{`${
              studentDoc?.name || ""
            }${studentDoc?.surname ? " " + studentDoc.surname : ""}`}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Student ID
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {me?.username || studentDoc?._id}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Student Code
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.studentCode || "—"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.email || ""}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.phone || ""}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-gray-900">
                {formatDate(studentDoc?.birthday || me?.profile?.dateOfBirth)}
              </p>
              {canSyncDob && (
                <button
                  type="button"
                  onClick={onSyncDob}
                  className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  title="Save this date to the student profile"
                >
                  Save to profile
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Grade
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.grade?.name || ""}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Class
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.class?.name || ""}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Blood Type
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.bloodType || ""}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Transportation
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {studentDoc?.transportation || "—"}
            </p>
          </div>
        </div>
        {/* Emergency Contact */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Emergency Contact
          </h3>
          {studentDoc?.emergencyContact &&
          (studentDoc.emergencyContact.name ||
            studentDoc.emergencyContact.phone ||
            studentDoc.emergencyContact.email ||
            studentDoc.emergencyContact.relationship) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {studentDoc.emergencyContact.name || ""}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relationship
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {studentDoc.emergencyContact.relationship || ""}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {studentDoc.emergencyContact.phone || ""}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {studentDoc.emergencyContact.email || ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No emergency contact on file.
            </div>
          )}
        </div>
      </div>

      {/* Academic Records */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Academic Records
        </h2>
        <EnhancedTable
          title="Current Semester Grades"
          data={academicRecords}
          columns={[
            {
              key: "subject",
              label: "Subject",
              sortable: true,
              filterable: true,
            },
            {
              key: "examType",
              label: "Type",
              sortable: true,
              filterable: true,
            },
            {
              key: "grade",
              label: "Grade",
              sortable: true,
              filterable: true,
              render: (value) => (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGradeBadge(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: "date",
              label: "Date",
              sortable: true,
              render: (value) => (
                <span className="text-sm text-gray-900">
                  {value ? new Date(value).toLocaleDateString() : ""}
                </span>
              ),
            },
            {
              key: "averageScore",
              label: "Score",
              sortable: true,
              render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                  {typeof value === "number" ? `${value}%` : ""}
                </span>
              ),
            },
          ]}
          actions={[]}
          pageSize={5}
          emptyMessage={
            resultsLoading ? "Loading results..." : "No academic records found"
          }
        />
      </div>

      {/* Behavior Records */}
      {canViewBehavior && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Behavior Records
          </h2>
          <EnhancedTable
            title="Recent Behavior Incidents"
            data={behaviorRecords}
            columns={[
              {
                key: "date",
                label: "Date",
                sortable: true,
                render: (value) => (
                  <span className="text-sm text-gray-900">
                    {new Date(value).toLocaleDateString()}
                  </span>
                ),
              },
              {
                key: "type",
                label: "Type",
                sortable: true,
                filterable: true,
                render: (value) => (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBehaviorBadge(
                      value
                    )}`}
                  >
                    {value}
                  </span>
                ),
              },
              {
                key: "description",
                label: "Description",
                sortable: false,
              },
              {
                key: "points",
                label: "Points",
                sortable: true,
                render: (value) => (
                  <span
                    className={`text-sm font-medium ${
                      value > 0
                        ? "text-green-600"
                        : value < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {value > 0 ? "+" : ""}
                    {value}
                  </span>
                ),
              },
              {
                key: "teacher",
                label: "Reported By",
                sortable: true,
                filterable: true,
              },
            ]}
            pageSize={4}
            emptyMessage="No behavior records found"
          />
        </div>
      )}

      {/* Parent Information */}
      {canViewParents && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Parent Information
          </h2>
          {parent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <p className="mt-1 text-sm text-gray-900">{parent.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {parent.email || ""}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {parent.phone || ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No parent assigned.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
