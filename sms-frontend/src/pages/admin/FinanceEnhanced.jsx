import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FinanceEnhanced = () => {
  // Basic state
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState({
    totalFeesCollected: 0,
    totalPayments: 0,
    outstandingFees: 0,
    outstandingCount: 0,
    overdueFees: 0,
    overdueCount: 0,
    avgDaysOverdue: 0,
  });

  // Fees state
  const [fees, setFees] = useState([]);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [feeForm, setFeeForm] = useState({
    name: "",
    category: "",
    amount: "",
    description: "",
    dueDate: "",
    isRecurring: false,
    recurringInterval: "monthly",
  });

  // Payments state
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    student: "",
    feeAssignmentId: "",
    amount: "",
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Fee assignments state
  const [feeAssignments, setFeeAssignments] = useState([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    studentId: "",
    feeId: "",
    dueDate: "",
    notes: "",
  });

  // Students state
  const [students, setStudents] = useState([]);
  const [feeAssignmentsForPayment, setFeeAssignmentsForPayment] = useState([]);

  // Reports state
  const [reportType, setReportType] = useState("revenue");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportData, setReportData] = useState(null);
  const [reportInitialized, setReportInitialized] = useState(false);

  // Automated reminders state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    reminderType: "overdue",
    daysOverdue: 1,
    message: "",
    studentIds: [],
    classIds: [],
  });

  // Audit logs state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    startDate: "",
    endDate: "",
    action: "",
    resource: "",
  });

  // View modals state
  const [showViewAssignmentModal, setShowViewAssignmentModal] = useState(false);
  const [showViewPaymentModal, setShowViewPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Signature state
  const [signatureType, setSignatureType] = useState("text");
  const [signatureText, setSignatureText] = useState("School Administrator");
  const [signatureImage, setSignatureImage] = useState(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/financial-reports/dashboard`
      );
      const data = await response.json();

      if (data.status === "success") {
        setDashboardData(data.data.summary);
        setFees(data.data.feesByCategory || []);
        setFeeAssignments(data.data.classSummary || []);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all fees
  const loadAllFees = useCallback(async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fees?limit=100&sort=-createdAt`
      );
      const data = await response.json();

      if (data.status === "success") {
        setFees(data.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading fees:", error);
      toast.error("Failed to load fees");
    }
  }, []);

  // Load students
  const loadStudents = useCallback(async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/students?limit=1000`
      );
      const data = await response.json();

      if (data.status === "success") {
        setStudents(data.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
    }
  }, []);

  // Load fee assignments for payment
  const loadFeeAssignmentsForPayment = useCallback(async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fee-assignments?limit=1000&populate=student,fee`
      );
      const data = await response.json();

      if (data.status === "success") {
        setFeeAssignmentsForPayment(data.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading fee assignments:", error);
    }
  }, []);

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilters.startDate)
        params.append("startDate", auditFilters.startDate);
      if (auditFilters.endDate) params.append("endDate", auditFilters.endDate);
      if (auditFilters.action) params.append("action", auditFilters.action);
      if (auditFilters.resource)
        params.append("resource", auditFilters.resource);

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/audit/financial?${params.toString()}`
      );
      const data = await response.json();

      if (data.status === "success") {
        setAuditLogs(data.data?.logs || []);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.error("Failed to load audit logs");
    }
  }, [auditFilters]);

  // Generate automated reminders
  const generateAutomatedReminders = async () => {
    try {
      setLoading(true);
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/payment-reminders/automated`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reminderType: reminderForm.reminderType,
            daysOverdue: reminderForm.daysOverdue,
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        toast.success(data.data.message);
        setShowReminderModal(false);
        setReminderForm({
          reminderType: "overdue",
          daysOverdue: 1,
          message: "",
          studentIds: [],
          classIds: [],
        });
      } else {
        toast.error(data.message || "Failed to generate reminders");
      }
    } catch (error) {
      console.error("Error generating reminders:", error);
      toast.error("Failed to generate reminders");
    } finally {
      setLoading(false);
    }
  };

  // Generate bulk reminders
  const generateBulkReminders = async () => {
    try {
      setLoading(true);
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/payment-reminders/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentIds: reminderForm.studentIds,
            classIds: reminderForm.classIds,
            reminderType: reminderForm.reminderType,
            message: reminderForm.message,
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        toast.success(data.data.message);
        setShowReminderModal(false);
      } else {
        toast.error(data.message || "Failed to generate bulk reminders");
      }
    } catch (error) {
      console.error("Error generating bulk reminders:", error);
      toast.error("Failed to generate bulk reminders");
    } finally {
      setLoading(false);
    }
  };

  // Generate detailed report
  const generateDetailedReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (reportStartDate) params.append("startDate", reportStartDate);
      if (reportEndDate) params.append("endDate", reportEndDate);
      params.append("reportType", reportType);

      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/financial-reports/detailed?${params.toString()}`
      );
      const data = await response.json();

      if (data.status === "success") {
        setReportData(data.data);
        setReportInitialized(true);
        toast.success("Report generated successfully");
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const handleExportReport = () => {
    if (!reportData) {
      toast.error("No report data to export");
      return;
    }

    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.append("startDate", reportStartDate);
      if (reportEndDate) params.append("endDate", reportEndDate);
      params.append("reportType", reportType);
      params.append("format", "csv");

      const url = `${API_BASE_URL}/api/v1/financial-reports/detailed?${params.toString()}`;
      window.open(url, "_blank");
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  // Initialize data
  useEffect(() => {
    loadDashboardData();
    loadAllFees();
    loadStudents();
  }, [loadDashboardData, loadAllFees, loadStudents]);

  // Load fee assignments when payment modal opens
  useEffect(() => {
    if (showPaymentModal) {
      loadFeeAssignmentsForPayment();
    }
  }, [showPaymentModal, loadFeeAssignmentsForPayment]);

  // Load audit logs when audit modal opens
  useEffect(() => {
    if (showAuditModal) {
      loadAuditLogs();
    }
  }, [showAuditModal, loadAuditLogs]);

  const tabs = [
    { id: "overview", name: "Overview", icon: "📊" },
    { id: "fees", name: "Fee Management", icon: "💰" },
    { id: "payments", name: "Payments", icon: "💳" },
    { id: "assignments", name: "Fee Assignments", icon: "📋" },
    { id: "reports", name: "Reports", icon: "📈" },
    { id: "reminders", name: "Reminders", icon: "🔔" },
    { id: "audit", name: "Audit Trail", icon: "🔍" },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Finance Management
        </h1>
        <p className="text-gray-600">
          Comprehensive financial management and reporting system
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Collected
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboardData.totalFeesCollected?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⏰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Outstanding
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboardData.outstandingFees?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboardData.overdueFees?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Payments
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.totalPayments || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowReminderModal(true)}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-3xl mb-2 block">🔔</span>
                  <h4 className="font-medium text-gray-900">
                    Generate Reminders
                  </h4>
                  <p className="text-sm text-gray-600">
                    Create automated payment reminders
                  </p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("reports")}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-3xl mb-2 block">📈</span>
                  <h4 className="font-medium text-gray-900">
                    Generate Reports
                  </h4>
                  <p className="text-sm text-gray-600">
                    Create detailed financial reports
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowAuditModal(true)}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <div className="text-center">
                  <span className="text-3xl mb-2 block">🔍</span>
                  <h4 className="font-medium text-gray-900">
                    View Audit Trail
                  </h4>
                  <p className="text-sm text-gray-600">
                    Track financial activities
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === "reminders" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Automated Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Reminders
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Overdue Reminders
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Automatically generate reminders for overdue fees
                </p>
                <button
                  onClick={() => {
                    setReminderForm({
                      ...reminderForm,
                      reminderType: "overdue",
                    });
                    generateAutomatedReminders();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Generate Overdue Reminders
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Due Date Reminders
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Send reminders before fees are due
                </p>
                <button
                  onClick={() => {
                    setReminderForm({
                      ...reminderForm,
                      reminderType: "due_date",
                    });
                    generateAutomatedReminders();
                  }}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Generate Due Date Reminders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Financial Audit Trail
              </h3>
              <button
                onClick={() => setShowAuditModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                View Detailed Logs
              </button>
            </div>

            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🔍</span>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Audit Trail
              </h4>
              <p className="text-gray-600 mb-4">
                Track all financial activities and changes
              </p>
              <button
                onClick={() => setShowAuditModal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                View Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated Reminders Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Generate Automated Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Type
                </label>
                <select
                  value={reminderForm.reminderType}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      reminderType: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="overdue">Overdue Fees</option>
                  <option value="due_date">Due Date Reminders</option>
                  <option value="login_reminder">Login Reminders</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days Overdue (for overdue reminders)
                </label>
                <input
                  type="number"
                  value={reminderForm.daysOverdue}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      daysOverdue: parseInt(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (optional)
                </label>
                <textarea
                  value={reminderForm.message}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      message: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Enter custom message for reminders..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={generateAutomatedReminders}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Generating..." : "Generate Reminders"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border border-gray-200 w-11/12 md:w-4/5 lg:w-3/4 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Financial Audit Trail
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={auditFilters.startDate}
                  onChange={(e) =>
                    setAuditFilters({
                      ...auditFilters,
                      startDate: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={auditFilters.endDate}
                  onChange={(e) =>
                    setAuditFilters({
                      ...auditFilters,
                      endDate: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={auditFilters.action}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, action: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Actions</option>
                  <option value="FEE_CREATE">Fee Created</option>
                  <option value="FEE_UPDATE">Fee Updated</option>
                  <option value="PAYMENT_CREATE">Payment Created</option>
                  <option value="FEE_ASSIGNMENT_CREATE">
                    Assignment Created
                  </option>
                  <option value="PAYMENT_REMINDER_CREATE">
                    Reminder Created
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <select
                  value={auditFilters.resource}
                  onChange={(e) =>
                    setAuditFilters({
                      ...auditFilters,
                      resource: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Resources</option>
                  <option value="FEE">Fees</option>
                  <option value="PAYMENT">Payments</option>
                  <option value="FEE_ASSIGNMENT">Assignments</option>
                  <option value="PAYMENT_REMINDER">Reminders</option>
                </select>
              </div>
            </div>

            <button
              onClick={loadAuditLogs}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors mb-4"
            >
              Apply Filters
            </button>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user?.username || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {JSON.stringify(log.details, null, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {auditLogs.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">📋</span>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No Audit Logs Found
                </h4>
                <p className="text-gray-600">
                  No financial activities match your current filters.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceEnhanced;
