const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('../models/userModel');
const ensureSuperAdmin = require('./ensureSuperAdmin');

const clearDatabaseWithSuperAdmin = async () => {
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

    console.log('Connected to MongoDB for database clearing...');

    // Store super admin data before clearing
    const superAdmin = await User.findOne({ role: 'super_admin' });
    let superAdminData = null;

    if (superAdmin) {
      superAdminData = {
        username: superAdmin.username,
        email: superAdmin.email,
        password: superAdmin.password, // Keep the hashed password
        role: superAdmin.role,
        department: superAdmin.department,
        permissions: superAdmin.permissions,
        profile: superAdmin.profile,
        isActive: superAdmin.isActive,
        mustChangePassword: superAdmin.mustChangePassword,
        createdAt: superAdmin.createdAt,
      };
      console.log('✅ Super admin data backed up');
    }

    // Get all collection names
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((col) => col.name);

    console.log('🗑️  Clearing database collections...');

    // Clear all collections except system collections
    for (const collectionName of collectionNames) {
      if (!collectionName.startsWith('system.')) {
        await mongoose.connection.db.collection(collectionName).drop();
        console.log(`✅ Cleared collection: ${collectionName}`);
      }
    }

    // Recreate super admin
    if (superAdminData) {
      console.log('🔄 Restoring super admin...');
      await User.create(superAdminData);
      console.log('✅ Super admin restored successfully');
    } else {
      console.log('⚠️  No super admin found, creating new one...');
      await ensureSuperAdmin();
    }

    console.log(
      '✅ Database cleared successfully while preserving super admin!',
    );
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run if called directly
if (require.main === module) {
  clearDatabaseWithSuperAdmin()
    .then(() => {
      console.log('Database clearing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database clearing failed:', error);
      process.exit(1);
    });
}

module.exports = clearDatabaseWithSuperAdmin;
