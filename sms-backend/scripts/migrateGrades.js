require('dotenv').config();
const mongoose = require('mongoose');
const Grade = require('../models/gradeModel');

// Grade mapping from old level to new Arabic names
const gradeMapping = {
  1: 'المستوى الأول',
  2: 'المستوى الثاني',
  3: 'المستوى الثالث',
  4: 'المستوى الرابع',
  5: 'المستوى الخامس',
  6: 'المستوى السادس',
  7: 'المستوى السابع',
  8: 'المستوى الثامن',
};

async function migrateGrades() {
  try {
    const uri = process.env.DATABASE_LOCAL || process.env.DATABASE;
    if (!uri) throw new Error('No DB connection string found.');

    await mongoose.connect(uri);
    console.log('Connected to database');

    // Find all existing grades
    const existingGrades = await Grade.find();
    console.log(`Found ${existingGrades.length} existing grades`);

    if (existingGrades.length === 0) {
      console.log('No grades to migrate');
      return;
    }

    // Check if grades already have the new structure
    const hasNewStructure = existingGrades.some((g) => g.name && !g.level);

    if (hasNewStructure) {
      console.log('Grades already migrated to new structure');
      return;
    }

    console.log('Migrating grades to new structure...');

    // Drop the entire grades collection to remove old indexes
    await Grade.collection.drop();
    console.log('Dropped grades collection');

    // Create new grades with Arabic names
    const newGrades = [];
    for (const [level, arabicName] of Object.entries(gradeMapping)) {
      newGrades.push({ name: arabicName });
    }

    const createdGrades = await Grade.create(newGrades);
    console.log(
      `Created ${createdGrades.length} new grades with Arabic names:`,
    );
    createdGrades.forEach((g) => console.log(`  - ${g.name}`));

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateGrades();
}

module.exports = migrateGrades;
