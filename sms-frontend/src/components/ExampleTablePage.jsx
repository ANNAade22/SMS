import EnhancedTable from "../components/EnhancedTable";

const ExampleTablePage = () => {
  // Sample data - replace with your actual data
  const sampleData = [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "Admin",
      status: "Active",
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "User",
      status: "Inactive",
      createdAt: "2024-01-20",
    },
    // Add more sample data as needed
  ];

  // Column configuration
  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      filterable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      filterable: true,
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Admin"
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === "Active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  // Action handlers
  const handleEdit = (item) => {
    // Implement edit logic
  };

  const handleDelete = (item) => {
    // Implement delete logic
  };

  const handleBulkDelete = (selectedIds) => {
    // Implement bulk delete logic
  };

  const handleRowClick = (item) => {
    // Implement navigation or modal logic
  };

  // Action buttons configuration
  const actions = [
    {
      label: "Edit",
      onClick: handleEdit,
      color: "text-indigo-600",
      hoverColor: "text-indigo-900",
    },
    {
      label: "Delete",
      onClick: handleDelete,
      color: "text-red-600",
      hoverColor: "text-red-900",
    },
  ];

  // Bulk actions configuration
  const bulkActions = [
    {
      label: "Delete Selected",
      onClick: handleBulkDelete,
      className: "bg-red-600 text-white hover:bg-red-700",
    },
  ];

  return (
    <div className="p-6">
      <EnhancedTable
        title="Example Data Table"
        data={sampleData}
        columns={columns}
        actions={actions}
        bulkActions={bulkActions}
        selectable={true}
        onRowClick={handleRowClick}
        pageSize={10}
      />
    </div>
  );
};

export default ExampleTablePage;
