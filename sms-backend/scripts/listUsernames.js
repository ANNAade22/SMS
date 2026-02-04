const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '..', 'config.env') });

const DB =
  process.env.DATABASE_LOCAL ||
  process.env.DATABASE ||
  'mongodb://localhost:27017/SMS';

const User = require('../models/userModel');

(async () => {
  try {
    await mongoose.connect(DB);
    const users = await User.find({}, 'username -_id').lean();
    users.forEach((u) => console.log(u.username));
    console.log(`Total: ${users.length}`);
  } catch (err) {
    console.error('Error listing usernames:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
