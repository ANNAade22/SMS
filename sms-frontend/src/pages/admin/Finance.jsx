import React, { useState, useEffect, useCallback } from "react";
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import authService from "../../services/authService";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";
import PermissionWrapper from "../../components/PermissionWrapper";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { PaymentsPage } from "../../components/finance-tables/payments/page";
import { FeeAssignmentsPage } from "../../components/finance-tables/fee-assignments/page";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Memoized input components for better performance
const MemoizedInput = React.memo(({ value, onChange, ...props }) => (
  <input value={value} onChange={onChange} {...props} />
));
MemoizedInput.displayName = "MemoizedInput";

const MemoizedTextarea = React.memo(({ value, onChange, ...props }) => (
  <textarea value={value} onChange={onChange} {...props} />
));
MemoizedTextarea.displayName = "MemoizedTextarea";

const Finance = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fee Management State
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingFee, setEditingFee] = useState(null);

  // Payment Management State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Assignment Management State
  const [showBulkAssignmentModal, setShowBulkAssignmentModal] = useState(false);

  // Assignment Management State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // View Modal States
  const [showViewAssignmentModal, setShowViewAssignmentModal] = useState(false);
  const [showViewPaymentModal, setShowViewPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [showDeleteAssignmentModal, setShowDeleteAssignmentModal] =
    useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Signature States
  const [signatureType, setSignatureType] = useState("text"); // "text", "upload", "draw"
  const [signatureText, setSignatureText] = useState("Finance Manager");
  const [signatureImage, setSignatureImage] = useState(null);

  // Form States
  const [feeForm, setFeeForm] = useState({
    name: "",
    description: "",
    category: "tuition",
    amount: "",
    academicYear: "",
    semester: "annual",
    dueDate: "",
    lateFeeAmount: "",
    lateFeeDays: 7,
    isActive: true,
  });

  const [paymentForm, setPaymentForm] = useState({
    feeAssignmentId: "",
    student: "",
    amount: "",
    paymentMethod: "cash",
    referenceNumber: "",
    notes: "",
    bankDetails: {
      bankName: "",
      accountNumber: "",
      transactionId: "",
    },
  });

  const [assignmentForm, setAssignmentForm] = useState({
    studentId: "",
    feeId: "",
    assignedAmount: "",
    dueDate: "",
    notes: "",
  });

  const [bulkAssignmentForm, setBulkAssignmentForm] = useState({
    feeId: "",
    assignedAmount: "",
    dueDate: "",
    notes: "",
    assignTo: "all", // all, classes, grades, students
    classIds: [],
    gradeIds: [],
    studentIds: [],
  });

  const [students, setStudents] = useState([]);
  const [allFees, setAllFees] = useState([]);
  const [feeAssignmentsForPayment, setFeeAssignmentsForPayment] = useState([]);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);

  // Report states
  const [reportFilters, setReportFilters] = useState({
    type: "monthly",
    startDate: "",
    endDate: "",
  });
  const [reportData, setReportData] = useState({
    revenueTrend: [],
    feeCategories: [],
    paymentMethods: [],
    monthlyRevenue: [],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportInitialized, setReportInitialized] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadStudents();
    loadAllFees();
    loadClasses();
    loadGrades();
  }, []);

  // Generate report data only when explicitly requested
  // Removed automatic generation to prevent infinite loops

  // Generate dynamic report data
  const generateReportData = () => {
    setReportLoading(true);

    try {
      // Generate revenue trend data (last 12 months)
      const monthlyRevenue = [];
      const currentDate = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthName = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        // Calculate revenue for this month from payments
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthlyPayments = payments.filter((payment) => {
          const paymentDate = new Date(payment.paymentDate);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        });

        const monthlyAmount = monthlyPayments.reduce(
          (sum, payment) => sum + (payment.amount || 0),
          0
        );

        monthlyRevenue.push({
          month: monthName,
          amount: monthlyAmount,
        });
      }

      // Generate fee categories data from actual fees
      const feeCategories = [];
      const categoryTotals = {};

      fees.forEach((fee) => {
        if (!categoryTotals[fee.category]) {
          categoryTotals[fee.category] = 0;
        }
        categoryTotals[fee.category] += fee.amount || 0;
      });

      Object.entries(categoryTotals).forEach(([category, amount]) => {
        const percentage =
          fees.length > 0
            ? (amount / fees.reduce((sum, f) => sum + (f.amount || 0), 0)) * 100
            : 0;
        feeCategories.push({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          amount: amount,
          percentage: Math.round(percentage),
        });
      });

      // Generate payment methods data
      const paymentMethods = [];
      const methodCounts = {};

      payments.forEach((payment) => {
        const method = payment.paymentMethod || "cash";
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      Object.entries(methodCounts).forEach(([method, count]) => {
        const percentage =
          payments.length > 0 ? (count / payments.length) * 100 : 0;
        paymentMethods.push({
          method: method.charAt(0).toUpperCase() + method.slice(1),
          count: count,
          percentage: Math.round(percentage),
        });
      });

      setReportData({
        revenueTrend: monthlyRevenue,
        feeCategories: feeCategories,
        paymentMethods: paymentMethods,
        monthlyRevenue: monthlyRevenue,
      });
      setReportInitialized(true);
    } catch (error) {
      console.error("Error generating report data:", error);
    } finally {
      setReportLoading(false);
    }
  };

  // Report filter handlers
  const handleReportFilterChange = (field, value) => {
    setReportFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateReport = () => {
    generateReportData();
    toast.success("Report generated successfully!");
  };

  const handleExportReport = () => {
    // Create CSV content
    const csvContent = [
      ["Report Type", "Date Range", "Generated On"],
      [
        reportFilters.type,
        `${reportFilters.startDate} to ${reportFilters.endDate}`,
        new Date().toLocaleDateString(),
      ],
      [""],
      ["Monthly Revenue Trend"],
      ["Month", "Amount"],
      ...reportData.revenueTrend.map((item) => [item.month, item.amount]),
      [""],
      ["Fee Categories"],
      ["Category", "Amount", "Percentage"],
      ...reportData.feeCategories.map((item) => [
        item.name,
        item.amount,
        `${item.percentage}%`,
      ]),
      [""],
      ["Payment Methods"],
      ["Method", "Count", "Percentage"],
      ...reportData.paymentMethods.map((item) => [
        item.method,
        item.count,
        `${item.percentage}%`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success("Report exported successfully!");
  };

  // Payment action handlers
  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowViewPaymentModal(true);
  };

  const handleEditPayment = (payment) => {
    setPaymentForm({
      student: payment.student?._id || payment.studentId,
      feeAssignmentId: payment.feeAssignment?._id || payment.feeAssignmentId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber || "",
      notes: payment.notes || "",
      bankDetails: {
        bankName: payment.bankDetails?.bankName || "",
        accountNumber: payment.bankDetails?.accountNumber || "",
        transactionId: payment.bankDetails?.transactionId || "",
      },
    });
    setEditingPayment(payment);
    setShowPaymentModal(true);
  };

  const handleDeletePayment = (payment) => {
    setPaymentToDelete(payment);
    setShowDeletePaymentModal(true);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;

    try {
      const response = await authService.authFetch(
        `/api/v1/payments/${paymentToDelete._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Payment deleted successfully");
        setShowDeletePaymentModal(false);
        setPaymentToDelete(null);
        // Trigger table refresh
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error("Failed to delete payment");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Error deleting payment");
    }
  };

  // Assignment action handlers
  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowViewAssignmentModal(true);
  };

  const handleEditAssignment = (assignment) => {
    // Set the assignment form with current data
    setAssignmentForm({
      studentId: assignment.student?._id || assignment.studentId,
      feeId: assignment.fee?._id || assignment.feeId,
      assignedAmount: assignment.assignedAmount,
      dueDate: assignment.dueDate,
      description: assignment.description || "",
    });
    setShowAssignmentModal(true);
  };

  const handleDeleteAssignment = (assignment) => {
    setAssignmentToDelete(assignment);
    setShowDeleteAssignmentModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const response = await authService.authFetch(
        `/api/v1/fee-assignments/${assignmentToDelete._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Assignment deleted successfully");
        setShowDeleteAssignmentModal(false);
        setAssignmentToDelete(null);
        // Trigger table refresh
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error("Failed to delete assignment");
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Error deleting assignment");
    }
  };

  const handleRecordPayment = (assignment) => {
    // Set the payment form with assignment data
    setPaymentForm({
      student: assignment.student?._id || assignment.studentId,
      feeAssignmentId: assignment._id,
      amount: assignment.remainingAmount,
      paymentMethod: "",
      referenceNumber: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  // Payment action handlers

  const handlePrintReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowInvoiceModal(true);
  };

  // Signature handling functions
  const handleSignatureTypeChange = (type) => {
    setSignatureType(type);
  };

  const handleSignatureTextChange = (text) => {
    setSignatureText(text);
  };

  const handleSignatureImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignatureImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSignature = () => {
    setSignatureImage(null);
    setSignatureText("Finance Manager");
    setSignatureType("text");
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        feesResponse,
        paymentsResponse,
        assignmentsResponse,
        feeStatsResponse,
        paymentStatsResponse,
      ] = await Promise.all([
        authService.authFetch(
          `${API_BASE_URL}/api/v1/fees?limit=10&sort=-createdAt`
        ),
        authService.authFetch(
          `${API_BASE_URL}/api/v1/payments?limit=10&sort=-paymentDate`
        ),
        authService.authFetch(
          `${API_BASE_URL}/api/v1/fee-assignments?limit=10&sort=-createdAt`
        ),
        authService.authFetch(`${API_BASE_URL}/api/v1/fees/statistics`),
        authService.authFetch(`${API_BASE_URL}/api/v1/payments/statistics`),
      ]);

      const [feesData, paymentsData, assignmentsData, feeStats, paymentStats] =
        await Promise.all([
          feesResponse.ok ? feesResponse.json() : { data: { fees: [] } },
          paymentsResponse.ok
            ? paymentsResponse.json()
            : { data: { payments: [] } },
          assignmentsResponse.ok
            ? assignmentsResponse.json()
            : { data: { assignments: [] } },
          feeStatsResponse.ok
            ? feeStatsResponse.json()
            : { data: { statistics: {} } },
          paymentStatsResponse.ok
            ? paymentStatsResponse.json()
            : { data: { statistics: {} } },
        ]);

      setFees(feesData?.data?.data || []);
      setPayments(paymentsData?.data?.data || []);
      setAssignments(assignmentsData?.data?.data || []);
      setStatistics({
        fees: feeStats?.data?.statistics || {},
        payments: paymentStats?.data?.statistics || {},
      });
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  // Fee Management Functions
  const editFee = (fee) => {
    setEditingFee(fee);
    setFeeForm({
      name: fee.name || "",
      description: fee.description || "",
      category: fee.category || "tuition",
      amount: fee.amount || "",
      academicYear: fee.academicYear || "",
      semester: fee.semester || "annual",
      dueDate: fee.dueDate
        ? new Date(fee.dueDate).toISOString().split("T")[0]
        : "",
      lateFeeAmount: fee.lateFeeAmount || "",
      lateFeeDays: fee.lateFeeDays || 7,
      isActive: fee.isActive !== undefined ? fee.isActive : true,
    });
    setShowFeeModal(true);
  };

  const deleteFee = async (feeId) => {
    if (window.confirm("Are you sure you want to delete this fee?")) {
      try {
        const response = await authService.authFetch(
          `${API_BASE_URL}/api/v1/fees/${feeId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete fee");
        }

        await loadDashboardData(); // Reload data
      } catch (err) {
        console.error("Error deleting fee:", err);
        setError(err.message || "Failed to delete fee");
      }
    }
  };

  const handleFeeModalClose = () => {
    setShowFeeModal(false);
    setEditingFee(null);
    setFeeForm({
      name: "",
      description: "",
      category: "tuition",
      amount: "",
      academicYear: "",
      semester: "annual",
      dueDate: "",
      lateFeeAmount: "",
      lateFeeDays: 7,
      isActive: true,
    });
  };

  const handleFeeSubmit = async (feeData) => {
    try {
      // Validate required fields
      if (
        !feeData.name ||
        !feeData.category ||
        !feeData.amount ||
        !feeData.academicYear ||
        !feeData.dueDate
      ) {
        throw new Error("Please fill in all required fields");
      }

      const url = editingFee
        ? `${API_BASE_URL}/api/v1/fees/${editingFee._id}`
        : `${API_BASE_URL}/api/v1/fees`;
      const method = editingFee ? "PATCH" : "POST";

      const response = await authService.authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Failed to save fee");
      }

      await response.json();

      toast.success(
        editingFee ? "Fee updated successfully!" : "Fee created successfully!"
      );

      await loadDashboardData(); // Reload data
      await loadAllFees(); // Reload all fees for forms
      handleFeeModalClose();
    } catch (err) {
      console.error("Error saving fee:", err);
      toast.error(err.message || "Failed to save fee");
      setError(err.message || "Failed to save fee");
    }
  };

  // Load students for forms
  const loadStudents = async () => {
    try {
      const response = await authService.authFetch("/api/v1/students");
      if (response.ok) {
        const data = await response.json();

        setStudents(data.data?.data || []);
      }
    } catch (err) {
      console.error("Error loading students:", err);
      setStudents([]);
    }
  };

  // Load fee assignments for payment form
  const loadFeeAssignmentsForPayment = async () => {
    try {
      const response = await authService.authFetch("/api/v1/fee-assignments");
      if (response.ok) {
        const data = await response.json();

        return data.data?.data || [];
      }
    } catch (err) {
      console.error("Error loading fee assignments:", err);
      return [];
    }
    return [];
  };

  // Load classes for forms
  const loadClasses = async () => {
    try {
      const response = await authService.authFetch("/api/v1/classes");
      if (response.ok) {
        const data = await response.json();

        setClasses(data.data?.data || []);
      }
    } catch (err) {
      console.error("Error loading classes:", err);
      setClasses([]);
    }
  };

  // Load grades for forms
  const loadGrades = async () => {
    try {
      const response = await authService.authFetch("/api/v1/grades");
      if (response.ok) {
        const data = await response.json();

        setGrades(data.data?.data || []);
      }
    } catch (err) {
      console.error("Error loading grades:", err);
      setGrades([]);
    }
  };

  // Load all fees for forms
  const loadAllFees = async () => {
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fees?limit=1000`
      );
      if (response.ok) {
        const data = await response.json();

        setAllFees(data.data?.data || []);
      } else {
        setAllFees([]);
      }
    } catch (err) {
      console.error("Error loading fees:", err);
      setAllFees([]);
    }
  };

  // Form handlers
  const handleFeeFormChange = (field, value) => {
    setFeeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentFormChange = useCallback(
    (field, value) => {
      if (field.startsWith("bankDetails.")) {
        const bankField = field.split(".")[1];
        setPaymentForm((prev) => ({
          ...prev,
          bankDetails: { ...prev.bankDetails, [bankField]: value },
        }));
      } else {
        if (field === "student") {
          setPaymentForm((prev) => ({
            ...prev,
            [field]: value,
            feeAssignmentId: "",
            amount: "",
          }));
        } else if (field === "feeAssignmentId") {
          // Auto-populate payment amount when fee assignment is selected
          const selectedAssignment = feeAssignmentsForPayment.find(
            (assignment) => assignment._id === value
          );
          const autoAmount = selectedAssignment
            ? selectedAssignment.remainingAmount
            : "";

          setPaymentForm((prev) => ({
            ...prev,
            [field]: value,
            amount: autoAmount,
          }));
        } else {
          setPaymentForm((prev) => ({ ...prev, [field]: value }));
        }
      }
    },
    [feeAssignmentsForPayment]
  );

  const handleAssignmentFormChange = (field, value) => {
    setAssignmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBulkAssignmentFormChange = (field, value) => {
    if (
      field === "classIds" ||
      field === "gradeIds" ||
      field === "studentIds"
    ) {
      // Handle array fields
      setBulkAssignmentForm((prev) => ({ ...prev, [field]: value }));
    } else {
      setBulkAssignmentForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Modal handlers
  const handlePaymentModalOpen = async () => {
    setShowPaymentModal(true);
    // Load fee assignments when opening payment modal
    const assignments = await loadFeeAssignmentsForPayment();
    setFeeAssignmentsForPayment(assignments);
  };

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentForm({
      feeAssignmentId: "",
      student: "",
      amount: "",
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      bankDetails: {
        bankName: "",
        accountNumber: "",
        transactionId: "",
      },
    });
  };

  const handleAssignmentModalClose = () => {
    setShowAssignmentModal(false);
    setAssignmentForm({
      studentId: "",
      feeId: "",
      assignedAmount: "",
      dueDate: "",
      notes: "",
    });
  };

  const handleBulkAssignmentModalClose = () => {
    setShowBulkAssignmentModal(false);
    setBulkAssignmentForm({
      feeId: "",
      assignedAmount: "",
      dueDate: "",
      notes: "",
      assignTo: "all",
      classIds: [],
      gradeIds: [],
      studentIds: [],
    });
  };

  // Payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const selectedAssignment = feeAssignmentsForPayment.find(
      (assignment) => assignment._id === paymentForm.feeAssignmentId
    );

    if (
      selectedAssignment &&
      parseFloat(paymentForm.amount) > selectedAssignment.remainingAmount
    ) {
      toast.error(
        `Payment amount ($${paymentForm.amount}) exceeds remaining amount ($${selectedAssignment.remainingAmount})`
      );
      return;
    }

    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record payment");
      }

      toast.success("Payment recorded successfully!");
      await loadDashboardData();
      handlePaymentModalClose();
    } catch (err) {
      console.error("Error recording payment:", err);
      toast.error(err.message || "Failed to record payment");
      setError(err.message || "Failed to record payment");
    }
  };

  // Assignment submission
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fee-assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assignmentForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign fee");
      }

      await loadDashboardData();
      handleAssignmentModalClose();
    } catch (err) {
      console.error("Error assigning fee:", err);
      setError(err.message || "Failed to assign fee");
    }
  };

  // Bulk assignment submission
  const handleBulkAssignmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.authFetch(
        `${API_BASE_URL}/api/v1/fee-assignments/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkAssignmentForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign fees");
      }

      const result = await response.json();
      toast.success(result.message);

      if (result.data.errors && result.data.errors.length > 0) {
        console.warn("Some assignments failed:", result.data.errors);
        toast.warning(
          `${result.data.errors.length} assignments failed. Check console for details.`
        );
      }

      await loadDashboardData();
      handleBulkAssignmentModalClose();
    } catch (err) {
      console.error("Error assigning fees:", err);
      toast.error(err.message || "Failed to assign fees");
    }
  };

  const tabs = [
    { id: "overview", name: "Overview", icon: ChartBarIcon },
    { id: "fees", name: "Fee Management", icon: DocumentTextIcon },
    { id: "payments", name: "Payments", icon: CurrencyDollarIcon },
    { id: "assignments", name: "Fee Assignments", icon: DocumentTextIcon },
    { id: "reports", name: "Reports", icon: ChartBarIcon },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <span className="text-red-400 text-2xl">⚠️</span>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading finance data
            </h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionWrapper
      requiredPermission="view_finance"
      fallbackMessage="You don't have permission to access the Finance Management section. Only finance administrators can view this page."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Finance Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage fees, payments, and financial reports
            </p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Add Fee
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Fees
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.fees?.totalFees || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Collected
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(statistics.payments?.totalAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Overdue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {assignments ? assignments.length : 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Payments
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.payments?.totalPayments || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recent Fees
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {fees && fees.length > 0 ? (
                      fees.slice(0, 5).map((fee) => (
                        <div
                          key={fee._id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {fee.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {fee.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(fee.amount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Due: {formatDate(fee.dueDate)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No fees available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recent Payments
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {payments && payments.length > 0 ? (
                      payments.slice(0, 5).map((payment) => (
                        <div
                          key={payment._id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {payment.student?.name || "Unknown Student"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {payment.paymentMethod}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(payment.paymentDate)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No payments available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Overdue Assignments */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Overdue Fee Assignments
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments && assignments.length > 0 ? (
                      assignments.map((assignment) => (
                        <tr key={assignment._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {assignment.student?.name || "Unknown"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assignment.fee?.name || "Unknown Fee"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(assignment.remainingAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(assignment.dueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                assignment.status
                              )}`}
                            >
                              {assignment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleViewAssignment(assignment)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Assignment Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {assignment.status === "pending" && (
                              <button
                                onClick={() => handleEditAssignment(assignment)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit Assignment"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No overdue assignments
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fees" && (
          <div className="space-y-6">
            {/* Fee Management Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Fee Management
                </h2>
                <p className="text-gray-600">Create and manage school fees</p>
              </div>
              <button
                onClick={() => setShowFeeModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add New Fee
              </button>
              <button
                onClick={() => {
                  // Test with hardcoded data
                  const testFeeData = {
                    name: "Test Tuition Fee",
                    description: "Test fee for debugging",
                    category: "tuition",
                    amount: 1000,
                    academicYear: "2024-2025",
                    semester: "annual",
                    dueDate: "2024-12-31",
                    lateFeeAmount: 50,
                    lateFeeDays: 7,
                    isActive: true,
                  };
                  handleFeeSubmit(testFeeData);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ml-2"
              >
                Test Create Fee
              </button>
            </div>

            {/* Fee Categories Filter */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCategory === "all"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Categories
                </button>
                {[
                  "tuition",
                  "transport",
                  "meals",
                  "books",
                  "activities",
                  "exam",
                  "other",
                ].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      selectedCategory === category
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Fees Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Fees</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fees && fees.length > 0 ? (
                      fees
                        .filter(
                          (fee) =>
                            selectedCategory === "all" ||
                            fee.category === selectedCategory
                        )
                        .map((fee) => (
                          <tr key={fee._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {fee.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {fee.description}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                                {fee.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(fee.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(fee.dueDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  fee.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {fee.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => editFee(fee)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteFee(fee._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No fees found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <PaymentsPage
            onAddPayment={handlePaymentModalOpen}
            onExport={() => {
              // Export functionality can be added here
            }}
            onViewPayment={handleViewPayment}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
            onPrintInvoice={handlePrintReceipt}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === "assignments" && (
          <FeeAssignmentsPage
            onAddAssignment={() => setShowAssignmentModal(true)}
            onBulkAssign={() => setShowBulkAssignmentModal(true)}
            onExport={() => {
              // Export functionality can be added here
            }}
            onViewAssignment={handleViewAssignment}
            onEditAssignment={handleEditAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onRecordPayment={handleRecordPayment}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Reports Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Financial Reports
                </h2>
                <p className="text-gray-600">
                  View financial analytics and generate reports
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Export Report
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  disabled={reportLoading}
                >
                  <ChartBarIcon className="h-5 w-5" />
                  {reportLoading ? "Generating..." : "Generate Report"}
                </button>
              </div>
            </div>

            {/* Report Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Report Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type
                  </label>
                  <select
                    value={reportFilters.type}
                    onChange={(e) =>
                      handleReportFilterChange("type", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly Report</option>
                    <option value="quarterly">Quarterly Report</option>
                    <option value="annual">Annual Report</option>
                    <option value="fee_collection">
                      Fee Collection Report
                    </option>
                    <option value="overdue">Overdue Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) =>
                      handleReportFilterChange("startDate", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) =>
                      handleReportFilterChange("endDate", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleGenerateReport}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    disabled={reportLoading}
                  >
                    {reportLoading ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Revenue Trend (Last 12 Months)
                </h3>
                <div className="h-64 relative" style={{ minHeight: "256px" }}>
                  {reportLoading ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Loading chart data...</p>
                      </div>
                    </div>
                  ) : !reportInitialized ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 mb-2">
                          Click &quot;Generate Report&quot; to view revenue
                          trends
                        </p>
                        <button
                          onClick={handleGenerateReport}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Generate Report
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <Line
                        data={{
                          labels: reportData.revenueTrend.map(
                            (item) => item.month
                          ),
                          datasets: [
                            {
                              label: "Monthly Revenue",
                              data: reportData.revenueTrend.map(
                                (item) => item.amount
                              ),
                              borderColor: "rgb(59, 130, 246)",
                              backgroundColor: "rgba(59, 130, 246, 0.1)",
                              tension: 0.4,
                              fill: true,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          animation: {
                            duration: 0, // Disable animations to prevent movement
                          },
                          interaction: {
                            intersect: false,
                            mode: "index",
                          },
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  return `Revenue: $${context.parsed.y.toLocaleString()}`;
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: function (value) {
                                  return "$" + value.toLocaleString();
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Categories Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Fee Categories Distribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-48 relative" style={{ minHeight: "192px" }}>
                    {reportLoading ? (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500">Loading...</p>
                        </div>
                      </div>
                    ) : !reportInitialized ? (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">
                            Generate report to view fee categories
                          </p>
                        </div>
                      </div>
                    ) : reportData.feeCategories.length > 0 ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <Doughnut
                          data={{
                            labels: reportData.feeCategories.map(
                              (item) => item.name
                            ),
                            datasets: [
                              {
                                data: reportData.feeCategories.map(
                                  (item) => item.amount
                                ),
                                backgroundColor: [
                                  "rgba(59, 130, 246, 0.8)",
                                  "rgba(16, 185, 129, 0.8)",
                                  "rgba(245, 158, 11, 0.8)",
                                  "rgba(239, 68, 68, 0.8)",
                                  "rgba(139, 92, 246, 0.8)",
                                ],
                                borderWidth: 2,
                                borderColor: "#fff",
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: {
                              duration: 0, // Disable animations to prevent movement
                            },
                            plugins: {
                              legend: {
                                position: "bottom",
                                labels: {
                                  padding: 20,
                                  usePointStyle: true,
                                },
                              },
                              tooltip: {
                                callbacks: {
                                  label: function (context) {
                                    const label = context.label || "";
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce(
                                      (a, b) => a + b,
                                      0
                                    );
                                    const percentage = (
                                      (value / total) *
                                      100
                                    ).toFixed(1);
                                    return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                                  },
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">
                          No fee categories data available
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {reportData.feeCategories.map((category, index) => (
                      <div key={category.name}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{category.name}</span>
                          <span className="text-gray-900">
                            {formatCurrency(category.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${category.percentage}%`,
                              backgroundColor: [
                                "rgb(59, 130, 246)",
                                "rgb(16, 185, 129)",
                                "rgb(245, 158, 11)",
                                "rgb(239, 68, 68)",
                                "rgb(139, 92, 246)",
                              ][index % 5],
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods Analytics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Payment Methods Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    Payment Distribution
                  </h4>
                  <div className="h-48 relative" style={{ minHeight: "192px" }}>
                    {reportLoading ? (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500">Loading...</p>
                        </div>
                      </div>
                    ) : reportData.paymentMethods.length > 0 ? (
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <Bar
                          data={{
                            labels: reportData.paymentMethods.map(
                              (item) => item.method
                            ),
                            datasets: [
                              {
                                label: "Number of Payments",
                                data: reportData.paymentMethods.map(
                                  (item) => item.count
                                ),
                                backgroundColor: [
                                  "rgba(59, 130, 246, 0.8)",
                                  "rgba(16, 185, 129, 0.8)",
                                  "rgba(245, 158, 11, 0.8)",
                                  "rgba(239, 68, 68, 0.8)",
                                ],
                                borderColor: [
                                  "rgb(59, 130, 246)",
                                  "rgb(16, 185, 129)",
                                  "rgb(245, 158, 11)",
                                  "rgb(239, 68, 68)",
                                ],
                                borderWidth: 1,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: {
                              duration: 0, // Disable animations to prevent movement
                            },
                            interaction: {
                              intersect: false,
                              mode: "index",
                            },
                            plugins: {
                              legend: {
                                display: false,
                              },
                              tooltip: {
                                callbacks: {
                                  label: function (context) {
                                    return `${context.label}: ${context.parsed.y} payments`;
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  stepSize: 1,
                                },
                              },
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">
                          No payment methods data available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">
                    Payment Method Breakdown
                  </h4>
                  <div className="space-y-3">
                    {reportData.paymentMethods.map((method, index) => (
                      <div
                        key={method.method}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-3"
                            style={{
                              backgroundColor: [
                                "rgb(59, 130, 246)",
                                "rgb(16, 185, 129)",
                                "rgb(245, 158, 11)",
                                "rgb(239, 68, 68)",
                              ][index % 4],
                            }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700">
                            {method.method}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {method.count}
                          </div>
                          <div className="text-xs text-gray-500">
                            {method.percentage}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Reports */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Financial Activity
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(statistics.payments?.totalAmount || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {statistics.fees?.totalFees || 0}
                    </div>
                    <div className="text-sm text-gray-500">Total Fees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {assignments
                        ? assignments.filter((a) => a.status === "overdue")
                            .length
                        : 0}
                    </div>
                    <div className="text-sm text-gray-500">
                      Overdue Payments
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingFee ? "Edit Fee" : "Add New Fee"}
                </h3>
                <button
                  onClick={handleFeeModalClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFeeSubmit(feeForm);
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={feeForm.name}
                      onChange={(e) =>
                        handleFeeFormChange("name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={feeForm.category}
                      onChange={(e) =>
                        handleFeeFormChange("category", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="tuition">Tuition</option>
                      <option value="transport">Transport</option>
                      <option value="meals">Meals</option>
                      <option value="books">Books</option>
                      <option value="activities">Activities</option>
                      <option value="exam">Exam</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={feeForm.amount}
                      onChange={(e) =>
                        handleFeeFormChange("amount", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      required
                      value={feeForm.academicYear}
                      onChange={(e) =>
                        handleFeeFormChange("academicYear", e.target.value)
                      }
                      placeholder="e.g., 2024-2025"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester *
                    </label>
                    <select
                      required
                      value={feeForm.semester}
                      onChange={(e) =>
                        handleFeeFormChange("semester", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="first">First Semester</option>
                      <option value="second">Second Semester</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={feeForm.dueDate}
                      onChange={(e) =>
                        handleFeeFormChange("dueDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Fee Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeForm.lateFeeAmount}
                      onChange={(e) =>
                        handleFeeFormChange("lateFeeAmount", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Fee Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={feeForm.lateFeeDays}
                      onChange={(e) =>
                        handleFeeFormChange("lateFeeDays", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={feeForm.description}
                    onChange={(e) =>
                      handleFeeFormChange("description", e.target.value)
                    }
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={feeForm.isActive}
                    onChange={(e) =>
                      handleFeeFormChange("isActive", e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Active
                  </label>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleFeeModalClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingFee ? "Update Fee" : "Create Fee"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Assignment Modal */}
        {showBulkAssignmentModal && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border border-gray-200 w-11/12 md:w-3/4 lg:w-2/3 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Bulk Assign Fees
                </h3>
                <button
                  onClick={handleBulkAssignmentModalClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleBulkAssignmentSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee *
                    </label>
                    <select
                      required
                      value={bulkAssignmentForm.feeId}
                      onChange={(e) =>
                        handleBulkAssignmentFormChange("feeId", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Fee</option>
                      {allFees
                        .filter((fee) => fee.isActive)
                        .map((fee) => (
                          <option key={fee._id} value={fee._id}>
                            {fee.name} - ${fee.amount}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={bulkAssignmentForm.assignedAmount}
                      onChange={(e) =>
                        handleBulkAssignmentFormChange(
                          "assignedAmount",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={bulkAssignmentForm.dueDate}
                      onChange={(e) =>
                        handleBulkAssignmentFormChange(
                          "dueDate",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To *
                    </label>
                    <select
                      required
                      value={bulkAssignmentForm.assignTo}
                      onChange={(e) =>
                        handleBulkAssignmentFormChange(
                          "assignTo",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Students</option>
                      <option value="classes">Specific Classes</option>
                      <option value="grades">Specific Grades</option>
                      <option value="students">Specific Students</option>
                    </select>
                  </div>

                  {/* Conditional fields based on assignTo selection */}
                  {bulkAssignmentForm.assignTo === "classes" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Classes *
                      </label>
                      <select
                        multiple
                        required
                        value={bulkAssignmentForm.classIds}
                        onChange={(e) => {
                          const selectedOptions = Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          );
                          handleBulkAssignmentFormChange(
                            "classIds",
                            selectedOptions
                          );
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {classes.map((cls) => (
                          <option key={cls._id} value={cls._id}>
                            {cls.name} - {cls.grade?.name || "No Grade"}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Hold Ctrl/Cmd to select multiple classes
                      </p>
                    </div>
                  )}

                  {bulkAssignmentForm.assignTo === "grades" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Grades *
                      </label>
                      <select
                        multiple
                        required
                        value={bulkAssignmentForm.gradeIds}
                        onChange={(e) => {
                          const selectedOptions = Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          );
                          handleBulkAssignmentFormChange(
                            "gradeIds",
                            selectedOptions
                          );
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {grades.map((grade) => (
                          <option key={grade._id} value={grade._id}>
                            {grade.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Hold Ctrl/Cmd to select multiple grades
                      </p>
                    </div>
                  )}

                  {bulkAssignmentForm.assignTo === "students" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Students *
                      </label>
                      <select
                        multiple
                        required
                        value={bulkAssignmentForm.studentIds}
                        onChange={(e) => {
                          const selectedOptions = Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          );
                          handleBulkAssignmentFormChange(
                            "studentIds",
                            selectedOptions
                          );
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ height: "200px" }}
                      >
                        {students.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.name} ({student.studentId})
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Hold Ctrl/Cmd to select multiple students
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={bulkAssignmentForm.notes}
                      onChange={(e) =>
                        handleBulkAssignmentFormChange("notes", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional notes for this bulk assignment"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleBulkAssignmentModalClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Assign to All Selected
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Payment
                </h3>
                <button
                  onClick={handlePaymentModalClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handlePaymentSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student *
                    </label>
                    <select
                      required
                      value={paymentForm.student}
                      onChange={(e) =>
                        handlePaymentFormChange("student", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Student</option>
                      {students.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.name} ({student.studentId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Assignment *
                    </label>
                    <select
                      required
                      value={paymentForm.feeAssignmentId}
                      onChange={(e) =>
                        handlePaymentFormChange(
                          "feeAssignmentId",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Fee Assignment</option>
                      {(() => {
                        const filteredAssignments =
                          feeAssignmentsForPayment.filter((assignment) => {
                            return (
                              !paymentForm.student ||
                              assignment.student._id === paymentForm.student
                            );
                          });
                        return filteredAssignments.map((assignment) => (
                          <option key={assignment._id} value={assignment._id}>
                            {assignment.fee.name} - {assignment.student.name} -
                            ${assignment.remainingAmount}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={(() => {
                        const selectedAssignment =
                          feeAssignmentsForPayment.find(
                            (assignment) =>
                              assignment._id === paymentForm.feeAssignmentId
                          );
                        return selectedAssignment
                          ? selectedAssignment.remainingAmount
                          : undefined;
                      })()}
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        handlePaymentFormChange("amount", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter payment amount"
                    />
                    {paymentForm.feeAssignmentId &&
                      (() => {
                        const selectedAssignment =
                          feeAssignmentsForPayment.find(
                            (assignment) =>
                              assignment._id === paymentForm.feeAssignmentId
                          );
                        return selectedAssignment ? (
                          <p className="text-sm text-gray-500 mt-1">
                            Maximum amount: $
                            {selectedAssignment.remainingAmount}
                          </p>
                        ) : null;
                      })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      required
                      value={paymentForm.paymentMethod}
                      onChange={(e) =>
                        handlePaymentFormChange("paymentMethod", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <MemoizedInput
                      type="text"
                      value={paymentForm.referenceNumber}
                      onChange={(e) =>
                        handlePaymentFormChange(
                          "referenceNumber",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {paymentForm.paymentMethod === "bank_transfer" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={paymentForm.bankDetails?.bankName || ""}
                          onChange={(e) =>
                            handlePaymentFormChange(
                              "bankDetails.bankName",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={paymentForm.bankDetails?.accountNumber || ""}
                          onChange={(e) =>
                            handlePaymentFormChange(
                              "bankDetails.accountNumber",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          value={paymentForm.bankDetails?.transactionId || ""}
                          onChange={(e) =>
                            handlePaymentFormChange(
                              "bankDetails.transactionId",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <MemoizedTextarea
                    value={paymentForm.notes}
                    onChange={(e) =>
                      handlePaymentFormChange("notes", e.target.value)
                    }
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handlePaymentModalClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assignment Modal */}
        {showAssignmentModal && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign Fee to Student
                </h3>
                <button
                  onClick={handleAssignmentModalClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAssignmentSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student *
                    </label>
                    <select
                      required
                      value={assignmentForm.studentId}
                      onChange={(e) =>
                        handleAssignmentFormChange("studentId", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Student</option>
                      {students.map((student) => (
                        <option key={student._id} value={student._id}>
                          {student.name} ({student.studentId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee *
                    </label>
                    <select
                      required
                      value={assignmentForm.feeId}
                      onChange={(e) =>
                        handleAssignmentFormChange("feeId", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Fee</option>
                      {allFees
                        .filter((fee) => fee.isActive)
                        .map((fee) => (
                          <option key={fee._id} value={fee._id}>
                            {fee.name} - {formatCurrency(fee.amount)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={assignmentForm.assignedAmount}
                      onChange={(e) =>
                        handleAssignmentFormChange(
                          "assignedAmount",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={assignmentForm.dueDate}
                      onChange={(e) =>
                        handleAssignmentFormChange("dueDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={assignmentForm.notes}
                    onChange={(e) =>
                      handleAssignmentFormChange("notes", e.target.value)
                    }
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleAssignmentModalClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    Assign Fee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Assignment Modal */}
        {showViewAssignmentModal && selectedAssignment && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assignment Details
                </h3>
                <button
                  onClick={() => setShowViewAssignmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Student
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAssignment.student?.name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Student ID
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAssignment.student?.studentId ||
                        selectedAssignment.student?.username ||
                        "N/A"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fee Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAssignment.fee?.name || "Unknown Fee"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatCurrency(selectedAssignment.assignedAmount || 0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedAssignment.dueDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedAssignment.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : selectedAssignment.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedAssignment.status === "overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedAssignment.status}
                    </span>
                  </div>
                </div>
                {selectedAssignment.remainingAmount !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Remaining Amount
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatCurrency(selectedAssignment.remainingAmount)}
                    </p>
                  </div>
                )}
                {selectedAssignment.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAssignment.description}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowViewAssignmentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedAssignment.status === "pending" && (
                  <button
                    onClick={() => {
                      setShowViewAssignmentModal(false);
                      handleEditAssignment(selectedAssignment);
                    }}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Edit Assignment
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Payment Modal */}
        {showViewPaymentModal && selectedPayment && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Payment Details
                </h3>
                <button
                  onClick={() => setShowViewPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Student
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.student?.name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Student ID
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.student?.studentId || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fee Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.feeAssignment?.fee?.name ||
                        "Unknown Fee"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatCurrency(selectedPayment.amount || 0)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Method
                    </label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">
                      {selectedPayment.paymentMethod || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedPayment.paymentDate)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedPayment.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : selectedPayment.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedPayment.status}
                  </span>
                </div>
                {selectedPayment.reference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reference
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.reference}
                    </p>
                  </div>
                )}
                {selectedPayment.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.description}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowViewPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewPaymentModal(false);
                    handlePrintReceipt(selectedPayment);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice/Receipt Modal */}
        {showInvoiceModal && selectedPayment && (
          <div className="fixed inset-0 backdrop-blur-md overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border border-gray-200 w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-2xl rounded-lg bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Payment Receipt
                </h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Invoice Content */}
              <div
                id="invoice-content"
                className="bg-white p-6 border-2 border-gray-200"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    School Management System
                  </h1>
                  <p className="text-lg text-gray-600 mb-1">
                    Academic Excellence Since 2020
                  </p>
                  <p className="text-sm text-gray-500">
                    123 Education Street, Learning City, LC 12345
                  </p>
                  <p className="text-sm text-gray-500">
                    Phone: (555) 123-4567 | Email: admin@sms.edu
                  </p>
                </div>

                <div className="border-t-2 border-b-2 border-gray-300 py-4 mb-6">
                  <h2 className="text-2xl font-bold text-center text-gray-900">
                    PAYMENT RECEIPT
                  </h2>
                </div>

                {/* Receipt Details */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Student Information
                    </h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {selectedPayment.student?.name || "Unknown Student"}
                      </p>
                      <p>
                        <span className="font-medium">Student ID:</span>{" "}
                        {selectedPayment.student?.studentId ||
                          selectedPayment.student?.username ||
                          selectedPayment.student?.email?.split("@")[0] ||
                          "SMS-" +
                            (
                              selectedPayment.student?._id?.slice(-6) ||
                              "000000"
                            ).toUpperCase()}
                      </p>
                      <p>
                        <span className="font-medium">Class:</span>{" "}
                        {selectedPayment.student?.class?.name ||
                          selectedPayment.student?.className ||
                          "Class A"}
                      </p>
                      <p>
                        <span className="font-medium">Grade:</span>{" "}
                        {selectedPayment.student?.grade?.name ||
                          selectedPayment.student?.gradeName ||
                          "Grade 1"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Payment Information
                    </h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Receipt No:</span>{" "}
                        {selectedPayment._id?.slice(-8).toUpperCase() || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{" "}
                        {formatDate(selectedPayment.paymentDate)}
                      </p>
                      <p>
                        <span className="font-medium">Method:</span>{" "}
                        {selectedPayment.paymentMethod?.toUpperCase() || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {selectedPayment.status?.toUpperCase() || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Details */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Fee Details
                  </h3>
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-900">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-900">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-200">
                          <td className="px-4 py-2 text-gray-900">
                            {selectedPayment.feeAssignment?.fee?.name ||
                              "Fee Payment"}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {formatCurrency(selectedPayment.amount || 0)}
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 font-semibold text-gray-900">
                            Total Paid
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            {formatCurrency(selectedPayment.amount || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-300 pt-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Thank you for your payment!
                      </p>
                      <p className="text-xs text-gray-500">
                        This receipt serves as proof of payment for the
                        above-mentioned fee.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-2">
                        Authorized Signature
                      </p>

                      {/* Signature Display Area */}
                      <div className="border border-gray-300 rounded p-4 bg-white min-h-20 w-48 ml-auto mb-2">
                        {signatureType === "text" && (
                          <p className="text-sm font-semibold text-gray-800 text-center">
                            {signatureText}
                          </p>
                        )}
                        {signatureType === "upload" && signatureImage && (
                          <img
                            src={signatureImage}
                            alt="Signature"
                            className="max-h-16 w-full object-contain"
                          />
                        )}
                        {signatureType === "upload" && !signatureImage && (
                          <p className="text-xs text-gray-400 text-center">
                            Upload signature image
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        Finance Office
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Controls */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Signature Options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Text Signature Option */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="signatureType"
                        value="text"
                        checked={signatureType === "text"}
                        onChange={(e) =>
                          handleSignatureTypeChange(e.target.value)
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Text Signature
                      </span>
                    </label>
                    {signatureType === "text" && (
                      <input
                        type="text"
                        value={signatureText}
                        onChange={(e) =>
                          handleSignatureTextChange(e.target.value)
                        }
                        placeholder="Enter signature text"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Upload Signature Option */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="signatureType"
                        value="upload"
                        checked={signatureType === "upload"}
                        onChange={(e) =>
                          handleSignatureTypeChange(e.target.value)
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Upload Image
                      </span>
                    </label>
                    {signatureType === "upload" && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureImageUpload}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                      />
                    )}
                  </div>

                  {/* Clear Signature Option */}
                  <div className="flex items-end">
                    <button
                      onClick={handleClearSignature}
                      className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Clear Signature
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open(
                      "",
                      "",
                      "height=800,width=900"
                    );

                    printWindow.document.write(`
                    <html>
                      <head>
                        <title>Payment Receipt - School Management System</title>
                        <style>
                          @media print {
                            @page {
                              size: A4;
                              margin: 0.5in;
                            }
                          }
                          
                          body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                            color: #333;
                            line-height: 1.4;
                          }
                          
                          .receipt-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 3px solid #2563eb;
                            padding-bottom: 20px;
                          }
                          
                          .school-name {
                            font-size: 28px;
                            font-weight: bold;
                            color: #1e40af;
                            margin-bottom: 8px;
                          }
                          
                          .school-tagline {
                            font-size: 16px;
                            color: #64748b;
                            margin-bottom: 4px;
                          }
                          
                          .school-info {
                            font-size: 12px;
                            color: #6b7280;
                          }
                          
                          .receipt-title {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            color: #1f2937;
                            margin: 30px 0;
                            border-top: 2px solid #d1d5db;
                            border-bottom: 2px solid #d1d5db;
                            padding: 15px 0;
                          }
                          
                          .info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 40px;
                            margin-bottom: 30px;
                          }
                          
                          .info-section h3 {
                            font-size: 18px;
                            font-weight: bold;
                            color: #1f2937;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #e5e7eb;
                            padding-bottom: 5px;
                          }
                          
                          .info-section p {
                            margin: 8px 0;
                            font-size: 14px;
                          }
                          
                          .info-section span {
                            font-weight: 600;
                            color: #374151;
                          }
                          
                          .fee-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                            border: 2px solid #e5e7eb;
                          }
                          
                          .fee-table th {
                            background-color: #f9fafb;
                            padding: 12px;
                            text-align: left;
                            font-weight: bold;
                            color: #1f2937;
                            border-bottom: 2px solid #e5e7eb;
                          }
                          
                          .fee-table td {
                            padding: 12px;
                            border-bottom: 1px solid #e5e7eb;
                          }
                          
                          .fee-table .total-row {
                            background-color: #f3f4f6;
                            font-weight: bold;
                          }
                          
                          .receipt-footer {
                            border-top: 2px solid #e5e7eb;
                            padding-top: 20px;
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 40px;
                          }
                          
                          .thank-you {
                            font-size: 14px;
                            color: #374151;
                          }
                          
                          .signature-area {
                            text-align: right;
                          }
                          
                          .signature-box {
                            border: 2px solid #d1d5db;
                            border-radius: 8px;
                            padding: 20px;
                            margin: 10px 0;
                            min-height: 80px;
                            width: 200px;
                            margin-left: auto;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background-color: #fafafa;
                          }
                          
                          .signature-text {
                            font-weight: bold;
                            font-size: 14px;
                            color: #1f2937;
                          }
                          
                          .signature-label {
                            font-size: 12px;
                            color: #6b7280;
                            margin-bottom: 5px;
                          }
                          
                          .office-label {
                            font-size: 11px;
                            color: #9ca3af;
                            margin-top: 5px;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="receipt-header">
                          <div class="school-name">School Management System</div>
                          <div class="school-tagline">Academic Excellence Since 2020</div>
                          <div class="school-info">
                            123 Education Street, Learning City, LC 12345<br>
                            Phone: (555) 123-4567 | Email: admin@sms.edu
                          </div>
                        </div>
                        
                        <div class="receipt-title">PAYMENT RECEIPT</div>
                        
                        <div class="info-grid">
                          <div class="info-section">
                            <h3>Student Information</h3>
                            <p><span>Name:</span> ${
                              selectedPayment.student?.name || "Unknown Student"
                            }</p>
                            <p><span>Student ID:</span> ${
                              selectedPayment.student?.studentId ||
                              selectedPayment.student?.username ||
                              selectedPayment.student?.email?.split("@")[0] ||
                              "SMS-" +
                                (
                                  selectedPayment.student?._id?.slice(-6) ||
                                  "000000"
                                ).toUpperCase()
                            }</p>
                            <p><span>Class:</span> ${
                              selectedPayment.student?.class?.name ||
                              selectedPayment.student?.className ||
                              "Class A"
                            }</p>
                            <p><span>Grade:</span> ${
                              selectedPayment.student?.grade?.name ||
                              selectedPayment.student?.gradeName ||
                              "Grade 1"
                            }</p>
                          </div>
                          
                          <div class="info-section">
                            <h3>Payment Information</h3>
                            <p><span>Receipt No:</span> ${
                              selectedPayment._id?.slice(-8).toUpperCase() ||
                              "N/A"
                            }</p>
                            <p><span>Date:</span> ${formatDate(
                              selectedPayment.paymentDate
                            )}</p>
                            <p><span>Method:</span> ${
                              selectedPayment.paymentMethod?.toUpperCase() ||
                              "N/A"
                            }</p>
                            <p><span>Status:</span> ${
                              selectedPayment.status?.toUpperCase() || "N/A"
                            }</p>
                          </div>
                        </div>
                        
                        <table class="fee-table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th style="text-align: right;">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>${
                                selectedPayment.feeAssignment?.fee?.name ||
                                "Fee Payment"
                              }</td>
                              <td style="text-align: right;">${formatCurrency(
                                selectedPayment.amount || 0
                              )}</td>
                            </tr>
                            <tr class="total-row">
                              <td><strong>Total Paid</strong></td>
                              <td style="text-align: right;"><strong>${formatCurrency(
                                selectedPayment.amount || 0
                              )}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                        
                        <div class="receipt-footer">
                          <div class="thank-you">
                            <p><strong>Thank you for your payment!</strong></p>
                            <p>This receipt serves as proof of payment for the above-mentioned fee.</p>
                          </div>
                          <div class="signature-area">
                            <div class="signature-label">Authorized Signature</div>
                            <div class="signature-box">
                              <div class="signature-text">${
                                signatureType === "text"
                                  ? signatureText
                                  : signatureType === "upload" && signatureImage
                                  ? '<img src="' +
                                    signatureImage +
                                    '" style="max-height: 60px; max-width: 180px; object-fit: contain;" />'
                                  : ""
                              }</div>
                            </div>
                            <div class="office-label">Finance Office</div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `);

                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Payment Confirmation Modal */}
        {showDeletePaymentModal && (
          <div className="fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  Delete Payment
                </h3>

                {/* Message */}
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete this payment? This action
                  cannot be undone.
                </p>

                {/* Payment Details */}
                {paymentToDelete && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between mb-2">
                        <span>Student:</span>
                        <span className="font-medium">
                          {paymentToDelete.student?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Amount:</span>
                        <span className="font-medium">
                          ${paymentToDelete.amount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Method:</span>
                        <span className="font-medium capitalize">
                          {paymentToDelete.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeletePaymentModal(false);
                      setPaymentToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeletePayment}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Assignment Confirmation Modal */}
        {showDeleteAssignmentModal && (
          <div className="fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  Delete Fee Assignment
                </h3>

                {/* Message */}
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete this fee assignment? This
                  action cannot be undone.
                </p>

                {/* Assignment Details */}
                {assignmentToDelete && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between mb-2">
                        <span>Student:</span>
                        <span className="font-medium">
                          {assignmentToDelete.student?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Fee:</span>
                        <span className="font-medium">
                          {assignmentToDelete.fee?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Amount:</span>
                        <span className="font-medium">
                          ${assignmentToDelete.totalAmount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Due Date:</span>
                        <span className="font-medium">
                          {assignmentToDelete.dueDate
                            ? new Date(
                                assignmentToDelete.dueDate
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteAssignmentModal(false);
                      setAssignmentToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteAssignment}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionWrapper>
  );
};

export default Finance;
