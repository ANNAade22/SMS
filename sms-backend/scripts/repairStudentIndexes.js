/*
  Repairs Student collection indexes relevant to bulk upload stability.
  - Ensures `phone` has a sparse unique index to avoid duplicate key errors for null/blank values
*/
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env from project root config.env
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const Student = require('../models/studentModel');

async function main() {
  const uri = process.env.DATABASE_LOCAL || process.env.DATABASE || '';
  if (!uri) {
    console.error('DATABASE_LOCAL (or DATABASE) not set in config.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const coll = Student.collection;
  let indexes = [];
  try {
    // Preferred detailed index listing
    indexes = await coll.listIndexes().toArray();
  } catch (_) {
    // Fallback (less detailed)
    indexes = await coll.indexes();
  }

  const pretty = (ix) => ({
    name: ix.name,
    key: ix.key,
    unique: ix.unique,
    sparse: ix.sparse,
  });
  console.log('Current indexes on students:', indexes.map(pretty));

  const phoneIdx = indexes.find(
    (ix) => (ix.key && ix.key.phone === 1) || ix.name === 'phone_1',
  );

  if (phoneIdx && phoneIdx.unique && phoneIdx.sparse === true) {
    console.log('phone_1 index already unique and sparse. No changes needed.');
    await mongoose.disconnect();
    return;
  }

  if (phoneIdx) {
    console.log('Dropping existing phone index:', pretty(phoneIdx));
    await coll.dropIndex(phoneIdx.name || 'phone_1').catch((e) => {
      console.warn('Warning: dropIndex failed (may not exist):', e.message);
    });
  }

  console.log('Creating sparse unique index on phone...');
  await coll.createIndex({ phone: 1 }, { unique: true, sparse: true });

  const after = await coll.listIndexes().toArray();
  console.log('Indexes after repair:', after.map(pretty));

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('Index repair failed:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
