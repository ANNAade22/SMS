const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const User = require('../models/userModel');
const Session = require('../models/sessionModel');

(async () => {
  try {
    const uri = process.env.DATABASE_LOCAL || process.env.DATABASE;
    if (!uri) {
      console.error(
        'No database connection string found (DATABASE_LOCAL or DATABASE).',
      );
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to database:', uri);

    const superCount = await User.countDocuments({ role: 'super_admin' });
    if (superCount === 0) {
      console.error('No super_admin users found. Aborting to avoid lockout.');
      await mongoose.disconnect();
      process.exit(1);
    }

    const totalBefore = await User.countDocuments();
    const delUsersRes = await User.deleteMany({ role: { $ne: 'super_admin' } });
    const totalAfter = await User.countDocuments();

    // Clean up sessions for the removed users (role is stored on sessions)
    const delSessionsRes = await Session.deleteMany({
      role: { $ne: 'super_admin' },
    });

    console.log(`Users total before: ${totalBefore}`);
    console.log(`Users deleted (non-super_admin): ${delUsersRes.deletedCount}`);
    console.log(`Users remaining (super_admin only): ${totalAfter}`);
    console.log(
      `Sessions deleted (non-super_admin): ${delSessionsRes.deletedCount}`,
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error pruning users:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
})();
