const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PasswordPolicy = require('./models/passwordPolicyModel');
const startupCheck = require('./scripts/startupCheck');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

// Use the local database connection
const DB = process.env.DATABASE_LOCAL;

mongoose.connect(DB).then(async () => {
  console.log('DB connection successful!');

  // Create default password policy if it doesn't exist
  try {
    const existingPolicy = await PasswordPolicy.findOne({
      name: 'Default Policy',
    });
    if (!existingPolicy) {
      await PasswordPolicy.create({
        name: 'Default Policy',
        description: 'Default password policy for all users',
        isActive: true,
        rules: {
          minLength: 8,
          maxLength: 128,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          preventCommonPasswords: true,
          preventSequentialChars: true,
          preventRepeatedChars: true,
          maxRepeatedChars: 3,
          preventPersonalInfo: true,
          passwordHistory: 5,
          expiryDays: 90,
        },
        applicableRoles: [], // Empty array means applies to all roles
      });
      console.log('Default password policy created!');
    }
  } catch (error) {
    console.log('Error creating default password policy:', error.message);
  }

  // Run startup checks including super admin verification
  try {
    const startupSuccess = await startupCheck();
    if (!startupSuccess) {
      console.log('⚠️  Startup checks failed, but continuing...');
    }
  } catch (error) {
    console.log('Error during startup checks:', error.message);
  }
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
