const User = require('../models/userModel');

const startupCheck = async () => {
  try {
    console.log('🚀 Starting application startup checks...');

    // Check if super admin exists (server is already connected)
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
    } else {
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
    }

    console.log('✅ All startup checks completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Startup check failed:', error);
    return false;
  }
};

module.exports = startupCheck;
