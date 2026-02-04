const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Import all models
const User = require('../models/userModel');
const Teacher = require('../models/teacherModel');
const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');
const Class = require('../models/classModel');
const Grade = require('../models/gradeModel');
const Subject = require('../models/subjectModel');
const Lesson = require('../models/lessonModel');
const Assignment = require('../models/assignmentModel');
const Result = require('../models/resultModel');
const Event = require('../models/eventModel');
const Announcement = require('../models/announcementModel');
const Exam = require('../models/examModel');
const AuditLog = require('../models/auditLogModel');
const SecurityEvent = require('../models/securityEventModel');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const DB =
  process.env.DATABASE_LOCAL ||
  process.env.DATABASE ||
  'mongodb://localhost:27017/SMS';

// Utility functions
const range = (n) => Array.from({ length: n }, (_, i) => i);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randDate = (fromY, toY) => {
  const start = new Date(`${fromY}-01-01`).getTime();
  const end = new Date(`${toY}-12-31`).getTime();
  return new Date(start + Math.random() * (end - start));
};

// Sample data arrays
const firstNamesMale = [
  'Liam',
  'Noah',
  'Oliver',
  'Elijah',
  'James',
  'William',
  'Benjamin',
  'Lucas',
  'Henry',
  'Alexander',
  'David',
  'Ethan',
  'Michael',
  'Daniel',
  'Jacob',
];

const firstNamesFemale = [
  'Olivia',
  'Emma',
  'Ava',
  'Charlotte',
  'Sophia',
  'Amelia',
  'Isabella',
  'Mia',
  'Evelyn',
  'Harper',
  'Camila',
  'Gianna',
  'Abigail',
  'Luna',
  'Ella',
];

const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
];

const subjectsList = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
];

const departments = [
  'academic',
  'examination',
  'finance',
  'student_affairs',
  'it',
];

const auditActions = [
  'LOGIN',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PROFILE_UPDATE',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_DELETE',
  'PERMISSION_GRANT',
  'PERMISSION_REVOKE',
];

const securityEventTypes = [
  'BRUTE_FORCE_ATTEMPT',
  'MULTIPLE_FAILED_LOGINS',
  'UNUSUAL_LOGIN_TIME',
  'SUSPICIOUS_ACTIVITY',
  'RATE_LIMIT_EXCEEDED',
];

async function seedAllModels() {
  try {
    await mongoose.connect(DB);
    console.log('Connected to database');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Teacher.deleteMany({}),
      Parent.deleteMany({}),
      Student.deleteMany({}),
      Class.deleteMany({}),
      Grade.deleteMany({}),
      Subject.deleteMany({}),
      Lesson.deleteMany({}),
      Assignment.deleteMany({}),
      Result.deleteMany({}),
      Event.deleteMany({}),
      Announcement.deleteMany({}),
      Exam.deleteMany({}),
      AuditLog.deleteMany({}),
      SecurityEvent.deleteMany({}),
    ]);

    console.log('Creating seed data...');

    // 1. Create Grades
    console.log('Creating grades...');
    const arabicGrades = [
      'المستوى الأول',
      'المستوى الثاني',
      'المستوى الثالث',
      'المستوى الرابع',
      'المستوى الخامس',
    ];
    const grades = await Grade.create(arabicGrades.map((name) => ({ name })));

    // 2. Create Classes
    console.log('Creating classes...');
    const classes = [];
    const gradeNumberMap = {
      'المستوى الأول': 1,
      'المستوى الثاني': 2,
      'المستوى الثالث': 3,
      'المستوى الرابع': 4,
      'المستوى الخامس': 5,
      'المستوى السادس': 6,
      'المستوى السابع': 7,
      'المستوى الثامن': 8,
    };

    for (const grade of grades) {
      const levelNum = gradeNumberMap[grade.name];
      classes.push(
        await Class.create({
          name: `${levelNum}A`,
          capacity: 30,
          grade: grade._id,
        }),
        await Class.create({
          name: `${levelNum}B`,
          capacity: 30,
          grade: grade._id,
        }),
      );
    }
    const allClasses = classes.flat();

    // 3. Create Admin Users
    console.log('Creating admin users...');
    const adminUsers = await User.create([
      {
        name: 'Super Admin',
        email: 'superadmin@sms.com',
        username: 'superadmin',
        password: 'Password123!',
        role: 'super_admin',
        department: 'it',
        isActive: true,
        emailVerified: true,
      },
      {
        name: 'School Admin',
        email: 'schooladmin@sms.com',
        username: 'schooladmin',
        password: 'Password123!',
        role: 'school_admin',
        department: 'academic',
        isActive: true,
        emailVerified: true,
      },
    ]);

    // 4. Create Teacher Users
    console.log('Creating teacher users...');
    const teacherUsers = await User.create(
      range(10).map((i) => ({
        name: `${pick(firstNamesMale)} ${pick(lastNames)}`,
        email: `teacher${i + 1}@sms.com`,
        username: `teacher${i + 1}`,
        password: 'Password123!',
        role: 'teacher',
        department: pick(departments),
        isActive: true,
        emailVerified: true,
      })),
    );

    // 5. Create Parent Users
    console.log('Creating parent users...');
    const parentUsers = await User.create(
      range(20).map((i) => ({
        name: `${pick(firstNamesMale)} ${pick(lastNames)}`,
        email: `parent${i + 1}@sms.com`,
        username: `parent${i + 1}`,
        password: 'Password123!',
        role: 'parent',
        department: 'student_affairs',
        isActive: true,
        emailVerified: true,
      })),
    );

    // 6. Create Student Users
    console.log('Creating student users...');
    const studentUsers = await User.create(
      range(100).map((i) => ({
        name: `${pick([...firstNamesMale, ...firstNamesFemale])} ${pick(lastNames)}`,
        email: `student${i + 1}@sms.com`,
        username: `student${i + 1}`,
        password: 'Password123!',
        role: 'student',
        department: 'academic',
        isActive: true,
        emailVerified: true,
      })),
    );

    // 7. Create Teachers
    console.log('Creating teachers...');
    const teachers = await Teacher.create(
      teacherUsers.map((user, i) => {
        const nameParts = (user.name || 'John Doe').split(' ');
        const firstName = nameParts[0] || 'John';
        const lastName = nameParts[1] || 'Doe';
        return {
          userId: user._id,
          name: firstName,
          surname: lastName,
          email: user.email,
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          address: `${Math.floor(Math.random() * 999) + 1} Main St, City, State`,
          bloodType: pick(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
          sex: pick(['MALE', 'FEMALE']),
          birthday: randDate(1980, 1995),
          qualification: "Master's Degree",
          hireDate: randDate(2010, 2023),
        };
      }),
    );

    // 8. Create Parents
    console.log('Creating parents...');
    const parents = await Parent.create(
      parentUsers.map((user, i) => {
        const nameParts = (user.name || 'Jane Doe').split(' ');
        const firstName = nameParts[0] || 'Jane';
        const lastName = nameParts[1] || 'Doe';
        return {
          username: user._id,
          name: firstName,
          surname: lastName,
          email: user.email,
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          address: `${Math.floor(Math.random() * 999) + 1} Oak St, City, State`,
        };
      }),
    );

    // 9. Create Students
    console.log('Creating students...');
    const students = await Student.create(
      studentUsers.map((user, i) => {
        const nameParts = (user.name || 'Alex Student').split(' ');
        const firstName = nameParts[0] || 'Alex';
        const lastName = nameParts[1] || 'Student';
        return {
          username: user.username,
          name: firstName,
          surname: lastName,
          email: user.email,
          phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          address: `${Math.floor(Math.random() * 999) + 1} Elm St, City, State`,
          bloodType: pick(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
          sex: pick(['MALE', 'FEMALE']),
          birthday: randDate(2005, 2015),
          parent: pick(parents)._id,
          class: pick(allClasses)._id,
          grade: pick(grades)._id,
        };
      }),
    );

    // 10. Create Subjects
    console.log('Creating subjects...');
    const subjects = await Subject.create(
      subjectsList.map((subject) => ({
        name: subject,
        code: subject.substring(0, 3).toUpperCase(),
        description: `${subject} course for students`,
        grade: pick(grades)._id,
      })),
    );

    // 11. Create Lessons
    console.log('Creating lessons...');
    const lessons = [];
    for (const teacher of teachers) {
      for (let i = 0; i < 5; i++) {
        const subject = pick(subjects);
        const lessonClass = pick(allClasses);
        const startHour = Math.floor(Math.random() * 8) + 8; // 8 AM to 4 PM
        const endHour = startHour + 1;
        const today = new Date();
        today.setHours(startHour, 0, 0, 0);
        const endTime = new Date(today);
        endTime.setHours(endHour, 0, 0, 0);

        lessons.push({
          name: `${subject.name} Lesson`,
          teacher: teacher._id,
          subject: subject._id,
          classId: lessonClass._id,
          day: pick(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
          startTime: today,
          endTime: endTime,
        });
      }
    }
    const createdLessons = await Lesson.create(lessons);

    // 12. Create Assignments
    console.log('Creating assignments...');
    const assignments = [];
    for (const lesson of createdLessons.slice(0, 20)) {
      const startDate = new Date();
      const dueDate = new Date(
        Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
      );
      assignments.push({
        title: `Assignment for ${lesson.day}`,
        description: 'Complete the exercises from chapter 5',
        lesson: lesson._id,
        teacher: lesson.teacher,
        classId: lesson.classId,
        subject: lesson.subject,
        startDate: startDate,
        dueDate: dueDate,
        totalPoints: 100,
        status: 'Published',
      });
    }
    await Assignment.create(assignments);

    // 13. Create Results
    console.log('Creating results...');
    const results = [];
    for (const student of students.slice(0, 50)) {
      for (const subject of subjects.slice(0, 5)) {
        const score = Math.floor(Math.random() * 100) + 1;
        results.push({
          assessmentTitle: `${subject.name} ${pick(['Mid-term', 'Final', 'Quiz'])} Assessment`,
          student: student._id,
          subject: subject._id,
          class: student.class,
          examType: pick(['Quiz', 'Midterm', 'Final', 'Assignment', 'Project']),
          score: score,
          totalMarks: 100,
          grade:
            score >= 90
              ? 'A'
              : score >= 80
                ? 'B'
                : score >= 70
                  ? 'C'
                  : score >= 60
                    ? 'D'
                    : 'F',
          section: 'A',
          status: 'Graded',
          remarks: pick([
            'Excellent work',
            'Good effort',
            'Needs improvement',
            'Well done',
          ]),
          date: randDate(2024, 2024),
        });
      }
    }
    await Result.create(results);

    // 14. Create Exams
    console.log('Creating exams...');
    const exams = [];
    for (const subject of subjects.slice(0, 10)) {
      const startTime = new Date(
        Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
      );
      const duration = Math.floor(Math.random() * 120) + 60; // 60-180 minutes
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      exams.push({
        title: `${subject.name} ${pick(['Mid-term', 'Final', 'Quiz'])} Exam`,
        type: pick(['Quiz', 'Midterm', 'Final', 'Assignment', 'Project']),
        subject: subject._id,
        classId: pick(allClasses)._id,
        teacher: pick(teachers)._id,
        startTime: startTime,
        endTime: endTime,
        totalMarks: 100,
        description: 'Answer all questions. Show your work clearly.',
        roomNumber: `Room ${Math.floor(Math.random() * 50) + 101}`,
      });
    }
    await Exam.create(exams);

    // 15. Create Events
    console.log('Creating events...');
    const eventDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const eventStart1 = new Date(eventDate1);
    eventStart1.setHours(14, 0, 0, 0);
    const eventEnd1 = new Date(eventDate1);
    eventEnd1.setHours(18, 0, 0, 0);

    const eventDate2 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const eventStart2 = new Date(eventDate2);
    eventStart2.setHours(9, 0, 0, 0);
    const eventEnd2 = new Date(eventDate2);
    eventEnd2.setHours(15, 0, 0, 0);

    await Event.create([
      {
        title: 'Parent-Teacher Meeting',
        description: 'Annual parent-teacher conference',
        startTime: eventStart1,
        endTime: eventEnd1,
        location: 'School Auditorium',
        category: 'Meeting',
        audience: 'All Parents and Teachers',
        status: 'Upcoming',
        createdBy: adminUsers[0]._id,
      },
      {
        title: 'Science Fair',
        description: 'Annual science fair for grades 3-5',
        startTime: eventStart2,
        endTime: eventEnd2,
        location: 'School Gym',
        category: 'Curriculum',
        audience: 'Students and Teachers',
        status: 'Upcoming',
        createdBy: pick(teachers)._id,
      },
    ]);

    // 16. Create Announcements
    console.log('Creating announcements...');
    await Announcement.create([
      {
        title: 'School Holiday Notice',
        content: 'School will be closed on Monday due to public holiday.',
        priority: 'High',
        audience: 'All Users',
        status: 'Published',
        createdBy: adminUsers[0]._id,
        isPinned: true,
      },
      {
        title: 'New Library Books Available',
        content:
          'New collection of science books has been added to the library.',
        priority: 'Medium',
        audience: 'All Students',
        status: 'Published',
        createdBy: pick(teachers)._id,
      },
    ]);

    // 17. Create Audit Logs
    console.log('Creating audit logs...');
    const auditLogs = [];
    for (let i = 0; i < 50; i++) {
      auditLogs.push({
        user: pick([
          ...adminUsers,
          ...teacherUsers,
          ...parentUsers,
          ...studentUsers,
        ])._id,
        action: pick(auditActions),
        resource: pick(['USER', 'SESSION', 'PROFILE', 'SYSTEM']),
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: randDate(2024, 2024),
        details: {
          description: `User performed ${pick(auditActions).toLowerCase()} action`,
          success: Math.random() > 0.1,
        },
      });
    }
    await AuditLog.create(auditLogs);

    // 18. Create Security Events
    console.log('Creating security events...');
    const securityEvents = [];
    for (let i = 0; i < 20; i++) {
      securityEvents.push({
        type: pick(securityEventTypes),
        severity: pick(['LOW', 'MEDIUM', 'HIGH']),
        user: pick([...adminUsers, ...teacherUsers])._id,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: {
          country: 'United States',
          city: pick([
            'New York',
            'Los Angeles',
            'Chicago',
            'Houston',
            'Phoenix',
          ]),
        },
        deviceInfo: pick(['Desktop', 'Mobile', 'Tablet']),
        timestamp: randDate(2024, 2024),
        details: {
          description: `Security event: ${pick(securityEventTypes).toLowerCase()}`,
          riskScore: Math.floor(Math.random() * 100),
        },
      });
    }
    await SecurityEvent.create(securityEvents);

    console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
    console.log(`Grades: ${grades.length}`);
    console.log(`Classes: ${allClasses.length}`);
    console.log(
      `Users: ${adminUsers.length + teacherUsers.length + parentUsers.length + studentUsers.length}`,
    );
    console.log(`Teachers: ${teachers.length}`);
    console.log(`Parents: ${parents.length}`);
    console.log(`Students: ${students.length}`);
    console.log(`Subjects: ${subjects.length}`);
    console.log(`Lessons: ${createdLessons.length}`);
    console.log(`Assignments: ${assignments.length}`);
    console.log(`Results: ${results.length}`);
    console.log(`Exams: ${exams.length}`);
    console.log(`Events: 2`);
    console.log(`Announcements: 2`);
    console.log(`Audit Logs: ${auditLogs.length}`);
    console.log(`Security Events: ${securityEvents.length}`);

    console.log('\n=== TEST ACCOUNTS ===');
    console.log('Super Admin: superadmin / Password123!');
    console.log('School Admin: schooladmin / Password123!');
    console.log('Teacher: teacher1 / Password123!');
    console.log('Parent: parent1 / Password123!');
    console.log('Student: student1 / Password123!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the seeding
if (require.main === module) {
  seedAllModels();
}

module.exports = { seedAllModels };
