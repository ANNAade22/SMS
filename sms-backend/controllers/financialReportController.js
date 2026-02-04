const mongoose = require('mongoose');
const Fee = require('../models/feeModel');
const FeeAssignment = require('../models/feeAssignmentModel');
const Payment = require('../models/paymentModel');
const Student = require('../models/studentModel');
const Class = require('../models/classModel');
const financialAuditLogger = require('../utils/financialAuditLogger');

// Get comprehensive financial dashboard data
exports.getFinancialDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, classId, gradeId } = req.query;

    // Set default date range (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    // Build filters
    let studentFilter = {};
    if (classId) studentFilter.class = classId;
    if (gradeId) studentFilter.grade = gradeId;

    // Get total fees collected
    const totalFeesCollected = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get outstanding fees
    const outstandingFees = await FeeAssignment.aggregate([
      {
        $match: {
          remainingAmount: { $gt: 0 },
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get fees by category
    const feesByCategory = await FeeAssignment.aggregate([
      {
        $match: {
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'fees',
          localField: 'fee',
          foreignField: '_id',
          as: 'feeInfo',
        },
      },
      {
        $unwind: '$feeInfo',
      },
      {
        $group: {
          _id: '$feeInfo.category',
          totalAssigned: { $sum: '$feeInfo.amount' },
          totalCollected: {
            $sum: { $subtract: ['$feeInfo.amount', '$remainingAmount'] },
          },
          totalOutstanding: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get payment trends (last 12 months)
    const paymentTrends = await Payment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Get overdue fees
    const overdueFees = await FeeAssignment.aggregate([
      {
        $match: {
          dueDate: { $lt: new Date() },
          remainingAmount: { $gt: 0 },
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      {
        $unwind: '$studentInfo',
      },
      {
        $lookup: {
          from: 'fees',
          localField: 'fee',
          foreignField: '_id',
          as: 'feeInfo',
        },
      },
      {
        $unwind: '$feeInfo',
      },
      {
        $addFields: {
          daysOverdue: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$dueDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOverdue: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
          avgDaysOverdue: { $avg: '$daysOverdue' },
        },
      },
    ]);

    // Get payment methods distribution
    const paymentMethods = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get class-wise financial summary
    const classSummary = await FeeAssignment.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      {
        $unwind: '$studentInfo',
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'studentInfo.class',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      {
        $unwind: '$classInfo',
      },
      {
        $group: {
          _id: '$classInfo.name',
          totalAssigned: { $sum: '$feeAmount' },
          totalCollected: {
            $sum: { $subtract: ['$feeAmount', '$remainingAmount'] },
          },
          totalOutstanding: { $sum: '$remainingAmount' },
          studentCount: { $addToSet: '$student' },
        },
      },
      {
        $addFields: {
          studentCount: { $size: '$studentCount' },
        },
      },
    ]);

    // Log the report generation
    await financialAuditLogger.logReportAction(
      'GENERATED',
      req.user,
      'dashboard',
      {
        startDate: start,
        endDate: end,
        classId,
        gradeId,
      },
    );

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalFeesCollected: totalFeesCollected[0]?.total || 0,
          totalPayments: totalFeesCollected[0]?.count || 0,
          outstandingFees: outstandingFees[0]?.total || 0,
          outstandingCount: outstandingFees[0]?.count || 0,
          overdueFees: overdueFees[0]?.totalOverdue || 0,
          overdueCount: overdueFees[0]?.count || 0,
          avgDaysOverdue: overdueFees[0]?.avgDaysOverdue || 0,
        },
        feesByCategory,
        paymentTrends,
        paymentMethods,
        classSummary,
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error getting financial dashboard:', error);
    next(error);
  }
};

// Get detailed financial report
exports.getDetailedReport = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      reportType = 'comprehensive',
      classId,
      gradeId,
      feeCategory,
      format = 'json',
    } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let reportData = {};

    switch (reportType) {
      case 'revenue':
        reportData = await generateRevenueReport(start, end, classId, gradeId);
        break;
      case 'outstanding':
        reportData = await generateOutstandingReport(classId, gradeId);
        break;
      case 'overdue':
        reportData = await generateOverdueReport(classId, gradeId);
        break;
      case 'student':
        reportData = await generateStudentReport(start, end, classId, gradeId);
        break;
      case 'comprehensive':
      default:
        reportData = await generateComprehensiveReport(
          start,
          end,
          classId,
          gradeId,
          feeCategory,
        );
        break;
    }

    // Log the report generation
    await financialAuditLogger.logReportAction(
      'GENERATED',
      req.user,
      reportType,
      {
        startDate: start,
        endDate: end,
        classId,
        gradeId,
        feeCategory,
        format,
      },
    );

    if (format === 'csv') {
      const csv = convertToCSV(reportData, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="financial-report-${reportType}-${Date.now()}.csv"`,
      );
      return res.send(csv);
    }

    res.status(200).json({
      status: 'success',
      data: {
        reportType,
        generatedAt: new Date(),
        dateRange: { start, end },
        ...reportData,
      },
    });
  } catch (error) {
    console.error('Error generating detailed report:', error);
    next(error);
  }
};

// Generate revenue report
async function generateRevenueReport(startDate, endDate, classId, gradeId) {
  const payments = await Payment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'completed',
      },
    },
    {
      $lookup: {
        from: 'feeassignments',
        localField: 'feeAssignment',
        foreignField: '_id',
        as: 'assignment',
      },
    },
    {
      $unwind: '$assignment',
    },
    {
      $lookup: {
        from: 'fees',
        localField: 'assignment.fee',
        foreignField: '_id',
        as: 'fee',
      },
    },
    {
      $unwind: '$fee',
    },
    {
      $lookup: {
        from: 'students',
        localField: 'assignment.student',
        foreignField: '_id',
        as: 'student',
      },
    },
    {
      $unwind: '$student',
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          category: '$fee.category',
          method: '$paymentMethod',
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.date': 1 },
    },
  ]);

  return { payments };
}

// Generate outstanding fees report
async function generateOutstandingReport(classId, gradeId) {
  const outstanding = await FeeAssignment.aggregate([
    {
      $match: {
        remainingAmount: { $gt: 0 },
        isActive: true,
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'student',
      },
    },
    {
      $unwind: '$student',
    },
    {
      $lookup: {
        from: 'fees',
        localField: 'fee',
        foreignField: '_id',
        as: 'fee',
      },
    },
    {
      $unwind: '$fee',
    },
    {
      $lookup: {
        from: 'classes',
        localField: 'student.class',
        foreignField: '_id',
        as: 'class',
      },
    },
    {
      $unwind: '$class',
    },
    {
      $group: {
        _id: {
          studentId: '$student._id',
          studentName: '$student.name',
          className: '$class.name',
        },
        totalOutstanding: { $sum: '$remainingAmount' },
        fees: {
          $push: {
            feeName: '$fee.name',
            category: '$fee.category',
            amount: '$fee.amount',
            remaining: '$remainingAmount',
            dueDate: '$dueDate',
          },
        },
      },
    },
    {
      $sort: { totalOutstanding: -1 },
    },
  ]);

  return { outstanding };
}

// Generate overdue fees report
async function generateOverdueReport(classId, gradeId) {
  const overdue = await FeeAssignment.aggregate([
    {
      $match: {
        dueDate: { $lt: new Date() },
        remainingAmount: { $gt: 0 },
        isActive: true,
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'student',
      },
    },
    {
      $unwind: '$student',
    },
    {
      $lookup: {
        from: 'fees',
        localField: 'fee',
        foreignField: '_id',
        as: 'fee',
      },
    },
    {
      $unwind: '$fee',
    },
    {
      $addFields: {
        daysOverdue: {
          $floor: {
            $divide: [
              { $subtract: [new Date(), '$dueDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: {
          studentId: '$student._id',
          studentName: '$student.name',
          studentCode: '$student.studentCode',
        },
        totalOverdue: { $sum: '$remainingAmount' },
        maxDaysOverdue: { $max: '$daysOverdue' },
        fees: {
          $push: {
            feeName: '$fee.name',
            category: '$fee.category',
            amount: '$fee.amount',
            remaining: '$remainingAmount',
            dueDate: '$dueDate',
            daysOverdue: '$daysOverdue',
          },
        },
      },
    },
    {
      $sort: { maxDaysOverdue: -1, totalOverdue: -1 },
    },
  ]);

  return { overdue };
}

// Generate student financial report
async function generateStudentReport(startDate, endDate, classId, gradeId) {
  const students = await Student.aggregate([
    {
      $lookup: {
        from: 'feeassignments',
        localField: '_id',
        foreignField: 'student',
        as: 'assignments',
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'student',
        as: 'payments',
      },
    },
    {
      $addFields: {
        totalAssigned: {
          $sum: {
            $map: {
              input: '$assignments',
              as: 'assignment',
              in: '$$assignment.feeAmount',
            },
          },
        },
        totalPaid: {
          $sum: {
            $map: {
              input: '$payments',
              as: 'payment',
              in: {
                $cond: [
                  { $eq: ['$$payment.status', 'completed'] },
                  '$$payment.amount',
                  0,
                ],
              },
            },
          },
        },
        totalOutstanding: {
          $sum: {
            $map: {
              input: '$assignments',
              as: 'assignment',
              in: {
                $cond: [
                  { $eq: ['$$assignment.isActive', true] },
                  '$$assignment.remainingAmount',
                  0,
                ],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        studentCode: 1,
        email: 1,
        totalAssigned: 1,
        totalPaid: 1,
        totalOutstanding: 1,
        paymentRate: {
          $cond: [
            { $gt: ['$totalAssigned', 0] },
            {
              $multiply: [{ $divide: ['$totalPaid', '$totalAssigned'] }, 100],
            },
            0,
          ],
        },
      },
    },
    {
      $sort: { totalOutstanding: -1 },
    },
  ]);

  return { students };
}

// Generate comprehensive report
async function generateComprehensiveReport(
  startDate,
  endDate,
  classId,
  gradeId,
  feeCategory,
) {
  const [revenueData, outstandingData, overdueData, studentData] =
    await Promise.all([
      generateRevenueReport(startDate, endDate, classId, gradeId),
      generateOutstandingReport(classId, gradeId),
      generateOverdueReport(classId, gradeId),
      generateStudentReport(startDate, endDate, classId, gradeId),
    ]);

  return {
    ...revenueData,
    ...outstandingData,
    ...overdueData,
    ...studentData,
  };
}

// Convert data to CSV format
function convertToCSV(data, reportType) {
  let csv = '';

  switch (reportType) {
    case 'revenue':
      csv = 'Date,Category,Payment Method,Amount,Count\n';
      data.payments.forEach((payment) => {
        csv += `${payment._id.date},${payment._id.category},${payment._id.method},${payment.totalAmount},${payment.count}\n`;
      });
      break;
    case 'outstanding':
      csv = 'Student Name,Class,Total Outstanding,Fee Details\n';
      data.outstanding.forEach((student) => {
        const feeDetails = student.fees
          .map((fee) => `${fee.feeName}: $${fee.remaining}`)
          .join('; ');
        csv += `"${student._id.studentName}","${student._id.className}",${student.totalOutstanding},"${feeDetails}"\n`;
      });
      break;
    case 'overdue':
      csv =
        'Student Name,Student Code,Total Overdue,Max Days Overdue,Fee Details\n';
      data.overdue.forEach((student) => {
        const feeDetails = student.fees
          .map(
            (fee) =>
              `${fee.feeName}: $${fee.remaining} (${fee.daysOverdue} days)`,
          )
          .join('; ');
        csv += `"${student._id.studentName}","${student._id.studentCode}",${student.totalOverdue},${student.maxDaysOverdue},"${feeDetails}"\n`;
      });
      break;
    case 'student':
      csv =
        'Student Name,Student Code,Email,Total Assigned,Total Paid,Total Outstanding,Payment Rate\n';
      data.students.forEach((student) => {
        csv += `"${student.name}","${student.studentCode}","${student.email}",${student.totalAssigned},${student.totalPaid},${student.totalOutstanding},${student.paymentRate.toFixed(2)}%\n`;
      });
      break;
    default:
      csv = 'Report Type,Data\n';
      csv += `Generated,${new Date().toISOString()}\n`;
  }

  return csv;
}

// Get financial analytics
exports.getFinancialAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'monthly' } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Revenue trends
    const revenueTrends = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            day: period === 'daily' ? { $dayOfMonth: '$paymentDate' } : null,
          },
          totalRevenue: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          avgPayment: { $avg: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    // Fee collection efficiency
    const collectionEfficiency = await FeeAssignment.aggregate([
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: '$feeAmount' },
          totalCollected: {
            $sum: { $subtract: ['$feeAmount', '$remainingAmount'] },
          },
          totalOutstanding: { $sum: '$remainingAmount' },
        },
      },
      {
        $addFields: {
          collectionRate: {
            $multiply: [
              { $divide: ['$totalCollected', '$totalAssigned'] },
              100,
            ],
          },
        },
      },
    ]);

    // Payment method analysis
    const paymentMethodAnalysis = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    // Overdue analysis
    const overdueAnalysis = await FeeAssignment.aggregate([
      {
        $match: {
          dueDate: { $lt: new Date() },
          remainingAmount: { $gt: 0 },
          isActive: true,
        },
      },
      {
        $addFields: {
          daysOverdue: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$dueDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ['$daysOverdue', 7] }, then: '1-7 days' },
                { case: { $lte: ['$daysOverdue', 30] }, then: '8-30 days' },
                { case: { $lte: ['$daysOverdue', 90] }, then: '31-90 days' },
              ],
              default: '90+ days',
            },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$remainingAmount' },
          avgDaysOverdue: { $avg: '$daysOverdue' },
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        revenueTrends,
        collectionEfficiency: collectionEfficiency[0] || {
          totalAssigned: 0,
          totalCollected: 0,
          totalOutstanding: 0,
          collectionRate: 0,
        },
        paymentMethodAnalysis,
        overdueAnalysis,
        period,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    console.error('Error getting financial analytics:', error);
    next(error);
  }
};
