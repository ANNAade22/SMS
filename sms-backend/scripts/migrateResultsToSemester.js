const mongoose = require('mongoose');
const Result = require('../models/resultModel');
const Semester = require('../models/semesterModel');
require('dotenv').config({ path: './config.env' });

const migrateResultsToSemester = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_LOCAL);
    console.log('Connected to MongoDB');

    // Create a legacy semester for existing data
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    const legacySemester = await Semester.findOneAndUpdate(
      {
        semester: 'Semester 1',
        academicYear: academicYear,
      },
      {
        semester: 'Semester 1',
        academicYear: academicYear,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear + 1}-01-31`),
        status: 'Completed',
        isActive: false,
        description: 'Legacy semester for migrated data',
        createdBy: new mongoose.Types.ObjectId(), // Dummy admin ID
      },
      { upsert: true, new: true },
    );

    console.log('Created/Updated legacy semester:', legacySemester);

    // Update all existing results to include semester information
    const updateResult = await Result.updateMany(
      {
        $or: [
          { semester: { $exists: false } },
          { academicYear: { $exists: false } },
        ],
      },
      {
        $set: {
          semester: 'Semester 1',
          academicYear: academicYear,
          isActive: false, // Mark as legacy
          gradingPeriod: 'Continuous Assessment',
        },
      },
    );

    console.log(
      `Updated ${updateResult.modifiedCount} results with semester information`,
    );

    // Create current active semester
    const activeSemester = await Semester.findOneAndUpdate(
      {
        semester: 'Semester 2',
        academicYear: academicYear,
      },
      {
        semester: 'Semester 2',
        academicYear: academicYear,
        startDate: new Date(`${currentYear + 1}-02-01`),
        endDate: new Date(`${currentYear + 1}-06-30`),
        status: 'Active',
        isActive: true,
        description: 'Current active semester',
        createdBy: new mongoose.Types.ObjectId(), // Dummy admin ID
      },
      { upsert: true, new: true },
    );

    console.log('Created/Updated active semester:', activeSemester);

    // Get statistics
    const totalResults = await Result.countDocuments();
    const legacyResults = await Result.countDocuments({ isActive: false });
    const activeResults = await Result.countDocuments({ isActive: true });

    console.log('\nMigration Summary:');
    console.log(`Total results: ${totalResults}`);
    console.log(`Legacy results: ${legacyResults}`);
    console.log(`Active results: ${activeResults}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrateResultsToSemester();
