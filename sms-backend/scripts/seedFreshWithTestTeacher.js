const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const User = require('../models/userModel');
const Teacher = require('../models/teacherModel');
const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');
const Grade = require('../models/gradeModel');
const Class = require('../models/classModel');
const Subject = require('../models/subjectModel');
const Lesson = require('../models/lessonModel');
const Assignment = require('../models/assignmentModel');
const Result = require('../models/resultModel');

const randDate = (fromY, toY) => {
  const start = new Date(`${fromY}-01-01`).getTime();
  const end = new Date(`${toY}-12-31`).getTime();
  return new Date(start + Math.random() * (end - start));
};

(async () => {
  let conn;
  try {
    const uri = process.env.DATABASE_LOCAL || process.env.DATABASE;
    if (!uri) throw new Error('No DB connection string found.');
    conn = await mongoose.connect(uri);
    console.log('Connected:', uri);

    // Drop DB
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped');

    // 1) Grades
    const grades = await Grade.create([
      { name: 'المستوى الأول' },
      { name: 'المستوى الثاني' },
      { name: 'المستوى الثالث' },
      { name: 'المستوى الرابع' },
      { name: 'المستوى الخامس' },
    ]);

    // 2) Classes (two per grade)
    const classDocs = [];
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

    for (const g of grades) {
      const levelNum = gradeNumberMap[g.name];
      classDocs.push(
        { name: `G${levelNum}-A`, capacity: 30, grade: g._id },
        { name: `G${levelNum}-B`, capacity: 30, grade: g._id },
      );
    }
    const classes = await Class.create(classDocs);

    const classByName = Object.fromEntries(classes.map((c) => [c.name, c]));

    // 3) Users: super_admin and teacher1 and one parent user
    const superadmin = await User.create({
      username: process.env.SUPER_ADMIN_USERNAME || 'superadmin',
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@school.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'Password123!',
      role: 'super_admin',
      department: 'general',
      profile: { firstName: 'Super', lastName: 'Admin' },
    });

    const teacherUser = await User.create({
      username: process.env.TEST_TEACHER_USERNAME || 'teacher1',
      email: process.env.TEST_TEACHER_EMAIL || 'teacher1@school.com',
      password: process.env.TEST_TEACHER_PASSWORD || 'Password123!',
      role: 'teacher',
      department: 'academic',
      profile: { firstName: 'John', lastName: 'Doe' },
    });

    const parentUser = await User.create({
      username: 'par10001',
      email: 'parent1@school.com',
      password: 'Password123!',
      role: 'parent',
      department: 'general',
      profile: { firstName: 'Mary', lastName: 'Smith' },
    });

    // 4) Teacher profile for teacher1
    const teacherProfile = await Teacher.create({
      name: 'John',
      surname: 'Doe',
      userId: teacherUser._id,
      email: teacherUser.email,
      phone: '580000001',
      address: '123 Teacher Rd, City',
      bloodType: 'O+',
      sex: 'MALE',
      birthday: new Date('1985-05-15'),
      subjects: [],
      lessons: [],
      classes: [],
    });

    // 5) Parent profile
    const parentProfile = await Parent.create({
      name: 'Mary',
      surname: 'Smith',
      username: parentUser._id,
      email: parentUser.email,
      phone: '5900000001',
      address: '456 Parent Ave, Town',
      students: [],
    });

    // 6) Assign teacher1 as supervisor of G1-A
    const mainClass = classByName['G1-A'];
    await Class.findByIdAndUpdate(mainClass._id, {
      supervisor: teacherProfile._id,
    });

    // 7) Subjects (assign teacher)
    const subjects = await Subject.create([
      {
        name: 'Mathematics',
        grade: 'المستوى الأول',
        teachers: [teacherProfile._id],
      },
      {
        name: 'English',
        grade: 'المستوى الأول',
        teachers: [teacherProfile._id],
      },
      { name: 'Science', grade: 'المستوى الأول', teachers: [] },
    ]);

    // 8) Students (20 students in G1-A)
    const studentsPayload = Array.from({ length: 20 }, (_, i) => ({
      username: `stu${10000 + i}`,
      name: `Student${i + 1}`,
      surname: `Test`,
      email: `student${i + 1}@school.com`,
      phone: `570000${String(100 + i).slice(-3)}`,
      address: `${300 + i} Student St, Village`,
      sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
      birthday: randDate(2013, 2017),
      parent: parentProfile._id,
      class: mainClass._id,
      grade: grades[0]._id,
    }));
    const students = await Student.create(studentsPayload);

    // Link students to class and parent
    await Class.findByIdAndUpdate(mainClass._id, {
      $addToSet: { students: { $each: students.map((s) => s._id) } },
    });
    await Parent.findByIdAndUpdate(parentProfile._id, {
      $addToSet: { students: { $each: students.map((s) => s._id) } },
    });

    // 9) Lessons for teacher1 in mainClass
    const weekdays = ['Monday', 'Wednesday', 'Friday'];
    const lessons = await Lesson.create([
      {
        name: 'Mathematics - Mon',
        subject: subjects.find((s) => s.name === 'Mathematics')._id,
        classId: mainClass._id,
        teacher: teacherProfile._id,
        day: 'Monday',
        startTime: new Date('2025-01-05T08:00:00Z'),
        endTime: new Date('2025-01-05T09:00:00Z'),
      },
      {
        name: 'English - Wed',
        subject: subjects.find((s) => s.name === 'English')._id,
        classId: mainClass._id,
        teacher: teacherProfile._id,
        day: 'Wednesday',
        startTime: new Date('2025-01-07T10:00:00Z'),
        endTime: new Date('2025-01-07T11:00:00Z'),
      },
    ]);

    // Link lessons to class and subjects
    for (const lesson of lessons) {
      await Class.findByIdAndUpdate(lesson.classId, {
        $addToSet: { lessons: lesson._id },
      });
      await Subject.findByIdAndUpdate(lesson.subject, {
        $addToSet: { lessons: lesson._id },
      });
    }

    // 10) Assignments for lessons
    const assignments = await Assignment.create(
      lessons.map((l, i) => ({
        title: `Assignment ${i + 1}`,
        description: `Complete the work for ${i === 0 ? 'Mathematics' : 'English'}.`,
        lesson: l._id,
        subject: l.subject,
        classId: l.classId,
        teacher: l.teacher,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        totalPoints: 100,
        status: 'Published',
      })),
    );

    // Link assignments back to their lessons (optional but useful)
    for (const a of assignments) {
      await Lesson.findByIdAndUpdate(a.lesson, {
        $addToSet: { assignments: a._id },
      });
    }

    // 11) Results for first 5 students on first assignment
    const firstAssignment = assignments[0];
    await Result.create(
      students.slice(0, 5).map((s, idx) => ({
        assessmentTitle: firstAssignment.title,
        class: mainClass._id,
        subject: firstAssignment.subject,
        student: s._id,
        grade: 'المستوى الأول',
        section: 'A',
        examType: 'Assignment',
        date: new Date(),
        score: 70 + idx,
        totalMarks: 100,
        status: 'Graded',
        remarks: idx % 2 === 0 ? 'Good work' : 'Needs improvement',
        assignment: firstAssignment._id,
      })),
    );

    console.log('Seeding complete.');
    console.log('Teacher test account:');
    console.log('  username:', teacherUser.username);
    console.log(
      '  password:',
      process.env.TEST_TEACHER_PASSWORD || 'Password123!',
    );
    console.log('Main class:', mainClass.name, 'Students:', students.length);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed fresh error:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
})();
