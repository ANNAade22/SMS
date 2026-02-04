const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const User = require('../models/userModel');
const Teacher = require('../models/teacherModel');

(async () => {
  try {
    const uri = process.env.DATABASE_LOCAL || process.env.DATABASE;
    await mongoose.connect(uri);
    console.log('Connected:', uri);

    const username = process.env.TEST_TEACHER_USERNAME || 'teacher1';
    const email = process.env.TEST_TEACHER_EMAIL || 'teacher1@school.com';
    const password = process.env.TEST_TEACHER_PASSWORD || 'Password123!';

    // Ensure user exists (role teacher)
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        email,
        password,
        role: 'teacher',
        department: 'academic',
      });
      console.log('Created teacher user:', username);
    } else {
      // Ensure role is teacher
      if (user.role !== 'teacher') {
        user.role = 'teacher';
        await user.save();
      }
      console.log('Teacher user exists:', username);
    }

    // Ensure Teacher profile exists
    let teacher = await Teacher.findOne({ userId: user._id });
    if (!teacher) {
      teacher = await Teacher.create({
        name: 'John',
        surname: 'Doe',
        userId: user._id,
        email,
        phone: '580000001',
        address: '123 Teacher Rd, City',
        bloodType: 'O+',
        sex: 'MALE',
        birthday: new Date('1985-05-15'),
        subjects: [],
        lessons: [],
        classes: [],
      });
      console.log('Created Teacher profile for:', username);
    } else {
      console.log('Teacher profile exists for:', username);
    }

    console.log('Done. Test teacher credentials:');
    console.log('  username:', username);
    console.log('  password:', password);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed teacher error:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
})();
