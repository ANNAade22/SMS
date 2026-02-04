// scripts/backfillSubjectCapacity.js
// One-off script to set a default capacity on existing Subject documents
// Usage: node scripts/backfillSubjectCapacity.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Subject = require('../models/subjectModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_LOCAL;

async function run() {
  try {
    await mongoose.connect(DB);
    console.log('Connected to DB');

    const result = await Subject.updateMany(
      { $or: [{ capacity: { $exists: false } }, { capacity: null }] },
      { $set: { capacity: 35 } },
    );

    console.log(`Matched: ${result.matchedCount || result.n || 0}`);
    console.log(`Modified: ${result.modifiedCount || result.nModified || 0}`);
    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
