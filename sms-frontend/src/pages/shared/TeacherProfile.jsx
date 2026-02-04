import EnhancedTable from "../../components/EnhancedTable";

const TeacherProfile = ({ role = "teacher" }) => {
  const roleTitles = {
    admin: "Teacher Profile",
    teacher: "My Profile",
    student: "Teacher Profile",
    parent: "Teacher Profile",
  };

  const roleDescriptions = {
    admin: "View and manage teacher information",
    teacher: "View and manage your teaching profile",
    student: "View teacher information",
    parent: "View teacher information",
  };

  // Sample teacher profile data
  const teacherProfile = {
    id: 1,
    name: "Ms. Sarah Johnson",
    email: "sarah.johnson@school.com",
    phone: "+1 234 567 8002",
    employeeId: "TCH2024001",
    department: "Mathematics",
    position: "Senior Teacher",
    hireDate: "2018-08-15",
    qualifications: "M.Sc. Mathematics, B.Ed.",
    experience: "8 years",
    specialization: "Advanced Calculus, Statistics",
    address: "789 Teacher Residence, Springfield, IL 62701",
    emergencyContact: {
      name: "Robert Johnson",
      relationship: "Husband",
      phone: "+1 234 567 8003",
    },
    performance: {
      rating: 4.8,
      totalStudents: 245,
      averageClassSize: 28,
      completionRate: "98%",
    },
    status: "Active",
  };

  // Sample subjects taught
  const subjectsTaught = [
    {
      id: 1,
      name: "Mathematics A",
      grade: "Grade 10",
      class: "10A",
      students: 32,
      schedule: "Mon, Wed, Fri - 9:00 AM",
      room: "Room 201",
      status: "Active",
    },
    {
      id: 2,
      name: "Mathematics B",
      grade: "Grade 11",
      class: "11B",
      students: 28,
      schedule: "Tue, Thu - 10:30 AM",
      room: "Room 201",
      status: "Active",
    },
    {
      id: 3,
      name: "Advanced Mathematics",
      grade: "Grade 12",
      class: "12A",
      students: 24,
      schedule: "Mon, Wed - 2:00 PM",
      room: "Room 301",
      status: "Active",
    },
    {
      id: 4,
      name: "Statistics",
      grade: "Grade 11",
      class: "11C",
      students: 26,
      schedule: "Fri - 11:00 AM",
      room: "Room 201",
      status: "Active",
    },
  ];

  // Sample class schedule
  const classSchedule = [
    {
      id: 1,
      day: "Monday",
      time: "9:00 AM - 10:00 AM",
      subject: "Mathematics A",
      class: "10A",
      room: "Room 201",
      status: "Scheduled",
    },
    {
      id: 2,
      day: "Monday",
      time: "2:00 PM - 3:00 PM",
      subject: "Advanced Mathematics",
      class: "12A",
      room: "Room 301",
      status: "Scheduled",
    },
    {
      id: 3,
      day: "Tuesday",
      time: "10:30 AM - 11:30 AM",
      subject: "Mathematics B",
      class: "11B",
      room: "Room 201",
      status: "Scheduled",
    },
    {
      id: 4,
      day: "Wednesday",
      time: "9:00 AM - 10:00 AM",
      subject: "Mathematics A",
      class: "10A",
      room: "Room 201",
      status: "Scheduled",
    },
    {
      id: 5,
      day: "Wednesday",
      time: "2:00 PM - 3:00 PM",
      subject: "Advanced Mathematics",
      class: "12A",
      room: "Room 301",
      status: "Scheduled",
    },
    {
      id: 6,
      day: "Thursday",
      time: "10:30 AM - 11:30 AM",
      subject: "Mathematics B",
      class: "11B",
      room: "Room 201",
      status: "Scheduled",
    },
    {
      id: 7,
      day: "Friday",
      time: "9:00 AM - 10:00 AM",
      subject: "Mathematics A",
      class: "10A",
      room: "Room 201",
      status: "Scheduled",
    },
    {
      id: 8,
      day: "Friday",
      time: "11:00 AM - 12:00 PM",
      subject: "Statistics",
      class: "11C",
      room: "Room 201",
      status: "Scheduled",
    },
  ];

  // Sample student performance data
  const studentPerformance = [
    {
      id: 1,
      studentName: "Emma Johnson",
      class: "10A",
      subject: "Mathematics A",
      grade: "A",
      lastAssessment: "95/100",
      status: "Excellent",
    },
    {
      id: 2,
      studentName: "Michael Chen",
      class: "10A",
      subject: "Mathematics A",
      grade: "B+",
      lastAssessment: "87/100",
      status: "Good",
    },
    {
      id: 3,
      studentName: "Sophia Rodriguez",
      class: "11B",
      subject: "Mathematics B",
      grade: "A-",
      lastAssessment: "91/100",
      status: "Excellent",
    },
    {
      id: 4,
      studentName: "James Wilson",
      class: "11B",
      subject: "Mathematics B",
      grade: "B",
      lastAssessment: "82/100",
      status: "Good",
    },
    {
      id: 5,
      studentName: "Olivia Brown",
      class: "12A",
      subject: "Advanced Mathematics",
      grade: "A+",
      lastAssessment: "98/100",
      status: "Outstanding",
    },
  ];

  const getGradeBadge = (grade) => {
    const gradeConfig = {
      "A+": "bg-green-100 text-green-800",
      A: "bg-green-100 text-green-800",
      "A-": "bg-green-100 text-green-800",
      "B+": "bg-blue-100 text-blue-800",
      B: "bg-blue-100 text-blue-800",
      "B-": "bg-blue-100 text-blue-800",
      "C+": "bg-yellow-100 text-yellow-800",
      C: "bg-yellow-100 text-yellow-800",
      "C-": "bg-yellow-100 text-yellow-800",
      D: "bg-red-100 text-red-800",
      F: "bg-red-100 text-red-800",
    };
    return gradeConfig[grade] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Excellent: "bg-green-100 text-green-800",
      Outstanding: "bg-green-100 text-green-800",
      Good: "bg-blue-100 text-blue-800",
      Satisfactory: "bg-yellow-100 text-yellow-800",
      NeedsImprovement: "bg-red-100 text-red-800",
      Scheduled: "bg-blue-100 text-blue-800",
      Active: "bg-green-100 text-green-800",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-800";
  };

  // Role-based permissions
  const canEditProfile = role === "teacher" || role === "admin";
  const canViewStudents = role === "teacher" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Teacher Profile"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Teacher profile page"}
          </p>
        </div>
        {canEditProfile && (
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
            Edit Profile
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
            <p className="mt-1 text-sm text-gray-900">{teacherProfile.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Employee ID
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {teacherProfile.employeeId}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {teacherProfile.department}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Position
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {teacherProfile.position}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-sm text-gray-900">{teacherProfile.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <p className="mt-1 text-sm text-gray-900">{teacherProfile.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hire Date
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(teacherProfile.hireDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Experience
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {teacherProfile.experience}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Qualifications
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {teacherProfile.qualifications}
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">
                {teacherProfile.performance.rating}
              </div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {teacherProfile.performance.totalStudents}
              </div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {teacherProfile.performance.averageClassSize}
              </div>
              <div className="text-sm text-gray-600">Avg Class Size</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {teacherProfile.performance.completionRate}
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {teacherProfile.emergencyContact.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Relationship
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {teacherProfile.emergencyContact.relationship}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {teacherProfile.emergencyContact.phone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Taught */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Subjects Taught
        </h2>
        <EnhancedTable
          title="Current Subjects"
          data={subjectsTaught}
          columns={[
            {
              key: "name",
              label: "Subject",
              sortable: true,
              filterable: true,
            },
            {
              key: "grade",
              label: "Grade",
              sortable: true,
              filterable: true,
            },
            {
              key: "class",
              label: "Class",
              sortable: true,
              filterable: true,
            },
            {
              key: "students",
              label: "Students",
              sortable: true,
              render: (value) => (
                <span className="text-sm font-medium">{value}</span>
              ),
            },
            {
              key: "schedule",
              label: "Schedule",
              sortable: false,
            },
            {
              key: "room",
              label: "Room",
              sortable: true,
              filterable: true,
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              filterable: true,
              render: (value) => (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
          ]}
          pageSize={4}
          emptyMessage="No subjects assigned"
        />
      </div>

      {/* Class Schedule */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Weekly Schedule
        </h2>
        <EnhancedTable
          title="Class Schedule"
          data={classSchedule}
          columns={[
            {
              key: "day",
              label: "Day",
              sortable: true,
              filterable: true,
            },
            {
              key: "time",
              label: "Time",
              sortable: true,
            },
            {
              key: "subject",
              label: "Subject",
              sortable: true,
              filterable: true,
            },
            {
              key: "class",
              label: "Class",
              sortable: true,
              filterable: true,
            },
            {
              key: "room",
              label: "Room",
              sortable: true,
              filterable: true,
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              filterable: true,
              render: (value) => (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
          ]}
          pageSize={8}
          emptyMessage="No classes scheduled"
        />
      </div>

      {/* Student Performance */}
      {canViewStudents && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Student Performance
          </h2>
          <EnhancedTable
            title="Recent Student Performance"
            data={studentPerformance}
            columns={[
              {
                key: "studentName",
                label: "Student Name",
                sortable: true,
                filterable: true,
              },
              {
                key: "class",
                label: "Class",
                sortable: true,
                filterable: true,
              },
              {
                key: "subject",
                label: "Subject",
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
                key: "lastAssessment",
                label: "Last Assessment",
                sortable: true,
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                filterable: true,
                render: (value) => (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                      value
                    )}`}
                  >
                    {value}
                  </span>
                ),
              },
            ]}
            pageSize={5}
            emptyMessage="No student performance data available"
          />
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;
