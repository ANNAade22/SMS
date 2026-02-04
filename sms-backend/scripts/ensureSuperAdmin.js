const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const User = require('../models/userModel');

const ensureSuperAdmin = async () => {
  try {
    // Use the same database connection as server.js
    const DB = process.env.DATABASE_LOCAL || process.env.DATABASE;

    if (!DB) {
      throw new Error(
        'Database connection string not found in environment variables',
      );
    }

    // Connect to MongoDB
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for super admin check...');

    // Check if super admin exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log(
        '✅ Super admin already exists:',
        existingSuperAdmin.username,
      );

      // Ensure super admin has all permissions
      if (
        !existingSuperAdmin.permissions ||
        existingSuperAdmin.permissions.length === 0
      ) {
        existingSuperAdmin.permissions = ['*']; // All permissions
        await existingSuperAdmin.save();
        console.log('✅ Updated super admin permissions');
      }

      return existingSuperAdmin;
    }

    // Create super admin if it doesn't exist
    console.log('⚠️  Super admin not found. Creating new super admin...');

    const superAdminData = {
      username: process.env.SUPER_ADMIN_USERNAME || 'superadmin',
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@school.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!',
      role: 'super_admin',
      department: 'general',
      permissions: ['*'], // All permissions
      profile: {
        firstName: 'Super',
        lastName: 'Admin',
        phone: process.env.SUPER_ADMIN_PHONE || '',
      },
      isActive: true,
      mustChangePassword: false,
    };

    const superAdmin = await User.create(superAdminData);

    console.log('✅ Super admin created successfully!');
    console.log('Username:', superAdmin.username);
    console.log('Email:', superAdmin.email);
    console.log('Password:', superAdminData.password);
    console.log('⚠️  Please change the password after first login!');

    return superAdmin;
  } catch (error) {
    console.error('❌ Error ensuring super admin:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run if called directly
if (require.main === module) {
  ensureSuperAdmin()
    .then(() => {
      console.log('Super admin check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Super admin check failed:', error);
      process.exit(1);
    });
}

module.exports = ensureSuperAdmin;
