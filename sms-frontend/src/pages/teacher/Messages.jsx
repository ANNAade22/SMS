const Messages = ({ role = "teacher" }) => {
  const roleTitles = {
    admin: "Admin - Messages",
    teacher: "Teacher - Messages",
    student: "Student - Messages",
    parent: "Parent - Messages",
  };

  const roleDescriptions = {
    admin: "Communicate with staff, teachers, students, and parents",
    teacher: "Communicate with students, parents, and colleagues",
    student: "Communicate with teachers and parents",
    parent: "Communicate with teachers and school administration",
  };

  const messages = [
    {
      id: 1,
      from: "Principal Johnson",
      subject: "Staff Meeting Tomorrow",
      preview:
        "Don't forget about the staff meeting scheduled for tomorrow at 9 AM...",
      date: "2025-09-14",
      time: "2:30 PM",
      unread: true,
      type: "Admin",
    },
    {
      id: 2,
      from: "Alice Johnson (Parent)",
      subject: "Question about Math Homework",
      preview:
        "Hi, Alice has a question about the algebra homework assigned yesterday...",
      date: "2025-09-14",
      time: "1:15 PM",
      unread: false,
      type: "Parent",
    },
    {
      id: 3,
      from: "Bob Smith",
      subject: "Absence Notification",
      preview: "I will be absent tomorrow due to a medical appointment...",
      date: "2025-09-13",
      time: "4:45 PM",
      unread: false,
      type: "Student",
    },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case "Admin":
        return "bg-red-100 text-red-800";
      case "Parent":
        return "bg-blue-100 text-blue-800";
      case "Student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {roleTitles[role] || "Messages"}
          </h1>
          <p className="text-gray-600 mt-1">
            {roleDescriptions[role] || "Messages page"}
          </p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
          Compose Message
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                  message.unread ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <p
                        className={`text-sm font-medium truncate ${
                          message.unread ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {message.from}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(
                          message.type
                        )}`}
                      >
                        {message.type}
                      </span>
                      {message.unread && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm truncate mt-1 ${
                        message.unread
                          ? "font-semibold text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      {message.subject}
                    </p>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {message.preview}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <p className="text-xs text-gray-500">{message.date}</p>
                    <p className="text-xs text-gray-400">{message.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
