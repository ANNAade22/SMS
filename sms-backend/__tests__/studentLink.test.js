const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Student = require('../models/studentModel');
const Class = require('../models/classModel');
const Grade = require('../models/gradeModel');

// NOTE: Assumes a test database connection is established in app.js / test setup.
// If not, adapt to create a fresh connection here.

describe('Student linking unified endpoint', () => {
  let clazz;
  let grade;
  let user;

  beforeAll(async () => {
    // Create minimal class & grade docs
    clazz = await Class.create({ name: 'Test Class A' });
    grade = await Grade.create({ name: 'المستوى الأول' });
    user = await User.create({
      username: 'linkuser1',
      email: 'l1@example.com',
      password: 'TempPass123!',
      role: 'student',
    });
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ username: /linkuser/ }),
      Student.deleteMany({ username: /linkuser/ }),
      Class.deleteMany({ _id: clazz?._id }),
      Grade.deleteMany({ _id: grade?._id }),
    ]);
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  });

  test('returns 400 with missingFields when required omitted', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .send({ username: 'linkuser1', linkExisting: true });
    expect(res.status).toBe(400);
    expect(res.body.missingFields).toEqual(
      expect.arrayContaining(['name', 'classId', 'gradeId']),
    );
  });

  test('successfully links existing student user', async () => {
    const res = await request(app).post('/api/v1/students').send({
      username: 'linkuser1',
      name: 'Alpha',
      classId: clazz._id.toString(),
      gradeId: grade._id.toString(),
      linkExisting: true,
    });
    expect(res.status).toBe(201);
    expect(res.body?.data?.student?.username).toBe('linkuser1');
  });

  test('second link attempt fails with already linked message', async () => {
    const res = await request(app).post('/api/v1/students').send({
      username: 'linkuser1',
      name: 'Beta',
      classId: clazz._id.toString(),
      gradeId: grade._id.toString(),
      linkExisting: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already linked/i);
  });
});
