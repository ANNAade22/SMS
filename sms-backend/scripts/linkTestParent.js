const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/userModel');
const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');
const Class = require('../models/classModel');
const Grade = require('../models/gradeModel');
const Lesson = require('../models/lessonModel');
const Teacher = require('../models/teacherModel');
const Subject = require('../models/subjectModel');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const DB =
  process.env.DATABASE_LOCAL ||
  process.env.DATABASE ||
  'mongodb://localhost:27017/SMS';

async function linkTestData() {
  try {
    await mongoose.connect(DB);
    console.log('Connected to database');

    // Find test parent user
    const parentUser = await User.findOne({ username: 'parent1' });
    if (!parentUser) {
      console.log('parent1 user not found');
      return;
    }

    // Create or find parent profile and link
    let parent = await Parent.findOne({ username: parentUser._id });
    if (!parent) {
      parent = await Parent.create({
        username: parentUser._id,
        name: 'Test Parent',
        surname: 'One',
        email: parentUser.email,
        phone: '+1234567890',
        address: '123 Test St',
      });
      console.log('Created parent:', parent._id);
    }
    // Update user with parentProfile
    parentUser.parentProfile = parent._id;
    await parentUser.save();
    console.log('Linked parent profile to user');

    // Find or create a test class and grade
    let grade = await Grade.findOne({ name: 'المستوى الأول' });
    if (!grade) {
      grade = await Grade.create({ name: 'المستوى الأول' });
      console.log('Created grade:', grade._id);
    }
    let testClass = await Class.findOne({ name: '1A' });
    if (!testClass) {
      testClass = await Class.create({
        name: '1A',
        capacity: 30,
        grade: grade._id,
      });
      console.log('Created class:', testClass._id);
    }

    // Find or create test student user
    let studentUser = await User.findOne({ username: 'student1' });
    if (!studentUser) {
      studentUser = await User.create({
        name: 'Test Student',
        email: 'student1@sms.com',
        username: 'student1',
        password: 'Password123!',
        role: 'student',
        isActive: true,
        emailVerified: true,
      });
      console.log('Created student user:', studentUser._id);
    }

    // Create or find student profile and link to parent
    let student = await Student.findOne({ username: 'student1' });
    if (!student) {
      student = await Student.create({
        username: 'student1',
        name: 'Test',
        surname: 'Student',
        email: studentUser.email,
        phone: '+1234567891',
        address: '123 Test St',
        bloodType: 'O+',
        sex: 'MALE',
        birthday: new Date('2010-01-01'),
        parent: parent._id,
        class: testClass._id,
        grade: grade._id,
      });
      console.log('Created student:', student._id);
    } else {
      // Update student parent if not set
      if (!student.parent) {
        student.parent = parent._id;
        await student.save();
        console.log('Updated student parent link');
      }
    }
    // Link student profile to user
    studentUser.studentProfile = student._id;
    await studentUser.save();
    console.log('Linked student profile to user');

    // Create some weekly lessons for this class (current week Mon-Fri)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const teacher = await Teacher.findOne(); // Any teacher
    if (!teacher) {
      console.log('No teacher found, skipping lessons');
    } else {
      const testSubjects = await require('../models/subjectModel')
        .find({})
        .limit(3);
      for (let i = 0; i < days.length; i++) {
        const lessonDate = new Date(monday);
        lessonDate.setDate(lessonDate.getDate() + i);
        lessonDate.setHours(9 + i, 0, 0, 0);
        const endTime = new Date(lessonDate);
        endTime.setHours(10 + i, 0, 0, 0);
        const subject = testSubjects[i % testSubjects.length];
        await Lesson.create({
          name: `${subject.name} Lesson`,
          day: days[i],
          startTime: lessonDate,
          endTime: endTime,
          subject: subject._id,
          classId: testClass._id,
          teacher: teacher._id,
        });
      }
      console.log('Created 5 weekly lessons for test class');
    }

    console.log('Linking completed successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

linkTestData();
