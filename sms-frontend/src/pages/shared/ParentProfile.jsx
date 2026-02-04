import EnhancedTable from "../../components/EnhancedTable";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";

const ParentProfile = ({ role = "parent" }) => {
  const navigate = useNavigate();

  const roleTitles = {
    parent: "My Profile",
    admin: "Parent Profile",
    teacher: "Parent Profile",
    student: "Parent Profile",
  };

  const roleDescriptions = {
    parent: "View and manage your personal information",
    admin: "View parent profile details",
    teacher: "View parent information",
    student: "View parent information",
  };

  // Fetch current user profile
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

  // Get parent profile ID
  const parentId = me?.parentProfile?._id || me?.parentProfile || null;

  // Fetch parent profile details
  const { data: parentProfile, isLoading: parentLoading } = useQuery({
    queryKey: ["parent-profile", parentId],
    enabled: !!parentId,
    queryFn: async () => {
      const res = await authService.authFetch(
        `${API_BASE_URL}/api/v1/parents/${parentId}`
      );
      if (!res.ok) throw new Error("Failed to load parent profile");
      const json = await res.json();
      return json.data?.data || json.data || json;
    },
  });

  // Sample communication history (keeping for now as there's no API endpoint)
  const communicationHistory = [
    {
      id: 1,
      date: "2024-01-15",
      type: "Email",
      subject: "Parent-Teacher Conference Reminder",
      from: "School Administration",
      status: "Read",
    },
    {
      id: 2,
      date: "2024-01-10",
      type: "Phone",
      subject: "Academic Performance Update",
      from: "Teacher",
      status: "Completed",
    },
    {
      id: 3,
      date: "2024-01-08",
      type: "SMS",
      subject: "School Event Notification",
      from: "School Administration",
      status: "Read",
    },
    {
      id: 4,
      date: "2024-01-05",
      type: "Email",
      subject: "Report Card Available",
      from: "School Administration",
      status: "Read",
    },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      Active: "bg-green-100 text-green-800",
      Inactive: "bg-red-100 text-red-800",
      Suspended: "bg-yellow-100 text-yellow-800",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-800";
  };

  const getCommunicationBadge = (type) => {
    const typeConfig = {
      Email: "bg-blue-100 text-blue-800",
      Phone: "bg-green-100 text-green-800",
      SMS: "bg-purple-100 text-purple-800",
      InPerson: "bg-orange-100 text-orange-800",
    };
    return typeConfig[type] || "bg-gray-100 text-gray-800";
  };

  const getReadStatusBadge = (status) => {
    const statusConfig = {
      Read: "bg-green-100 text-green-800",
      Unread: "bg-red-100 text-red-800",
      Completed: "bg-blue-100 text-blue-800",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-800";
  };

  // Role-based permissions
  const canEditProfile = role === "parent" || role === "admin";
  const canViewCommunication = true; // All roles can view communication history
  const canContactParent = role !== "parent"; // Others can contact parent

  // Loading state
  if (meLoading || parentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!parentProfile && !meLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Profile Not Found
            </h2>
            <p className="text-gray-600">
              Unable to load parent profile information.
            </p>
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
            {roleTitles[role] || "Parent Profile"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Parent profile page"}
          </p>
        </div>
        {canEditProfile && (
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md himage.pngr:bg-indigo-700 transition-colors">
            Edit Profile
          </button>
        )}
        {canContactParent && (
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors ml-2">
            Contact Parent
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
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.name ||
                me?.profile?.firstName + " " + me?.profile?.lastName ||
                "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Parent ID
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.parentId || parentProfile?._id || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.email || me?.email || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.phone || me?.profile?.phone || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.dateOfBirth
                ? new Date(parentProfile.dateOfBirth).toLocaleDateString()
                : me?.profile?.dateOfBirth
                ? new Date(me.profile.dateOfBirth).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Occupation
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.occupation || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Employer
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.employer || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Education
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.education || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Marital Status
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {parentProfile?.maritalStatus || "N/A"}
            </p>
          </div>
        </div>

        {/* Languages */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Languages Spoken
          </h3>
          <div className="flex flex-wrap gap-2">
            {(parentProfile?.languages || ["English"]).map(
              (language, index) => (
                <span
                  key={index}
                  className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800"
                >
                  {language}
                </span>
              )
            )}
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
                {parentProfile?.emergencyContact?.name || "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Relationship
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {parentProfile?.emergencyContact?.relationship || "N/A"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {parentProfile?.emergencyContact?.phone || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Communication History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Communication History
        </h2>
        <EnhancedTable
          title="Recent Communications"
          data={communicationHistory}
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
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCommunicationBadge(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: "subject",
              label: "Subject",
              sortable: true,
              filterable: true,
            },
            {
              key: "from",
              label: "From",
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
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReadStatusBadge(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
          ]}
          actions={[
            ...(canViewCommunication
              ? [
                  {
                    label: "View",
                    onClick: (communication) => {
                      console.log("View communication:", communication);
                      // Implement view communication functionality
                    },
                    color: "text-blue-600",
                    hoverColor: "text-blue-900",
                  },
                ]
              : []),
          ]}
          pageSize={5}
          emptyMessage="No communication history found"
        />
      </div>
    </div>
  );
};

export default ParentProfile;
