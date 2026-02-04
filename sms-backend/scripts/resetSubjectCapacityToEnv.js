// scripts/resetSubjectCapacityToEnv.js
// Resets capacity for all subjects to the current env default (SUBJECT_DEFAULT_CAPACITY or 35)
// Usage: npm run subject:reset-capacity

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Subject = require('../models/subjectModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_LOCAL;
const TARGET = Number(process.env.SUBJECT_DEFAULT_CAPACITY || 35);

async function run() {
  try {
    await mongoose.connect(DB);
    console.log('Connected. Setting all subject capacities to', TARGET);

    const res = await Subject.updateMany({}, { $set: { capacity: TARGET } });
    console.log(`Matched: ${res.matchedCount || res.n}`);
    console.log(`Modified: ${res.modifiedCount || res.nModified}`);
    console.log('Done.');
  } catch (err) {
    console.error('Reset error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
