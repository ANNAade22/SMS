/* eslint-disable */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const ClassModel = require('../models/classModel');
const Subject = require('../models/subjectModel');

// Use separate test DB
const TEST_DB =
  process.env.DATABASE_TEST || 'mongodb://localhost:27017/SMS_test_counts';

beforeAll(async () => {
  await mongoose.connect(TEST_DB, {});
  // Seed minimal docs
  await Promise.all([
    Student.create({
      username: 'stud1',
      name: 'Stud',
      surname: 'One',
      email: 'stud1@example.com',
      phone: '1001',
      address: 'Addr',
      sex: 'MALE',
      birthday: new Date('2010-01-01'),
      parent: new mongoose.Types.ObjectId(),
      class: new mongoose.Types.ObjectId(),
      grade: new mongoose.Types.ObjectId(),
    }),
    Teacher.create({
      name: 'Teach',
      surname: 'One',
      userId: new mongoose.Types.ObjectId(),
      email: 'teach1@example.com',
      phone: '2001',
      address: 'Addr',
      bloodType: 'A+',
      sex: 'MALE',
      birthday: new Date('1990-01-01'),
    }),
    ClassModel.create({
      name: 'ClassA',
      capacity: 30,
      grade: new mongoose.Types.ObjectId(),
    }),
    Subject.create({
      name: 'Math',
      grade: '10',
    }),
  ]);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

function expectCountResponse(res) {
  expect([200, 204]).toContain(res.statusCode);
  if (res.statusCode === 200) {
    expect(res.body).toHaveProperty('total');
    expect(typeof res.body.total).toBe('number');
  }
  expect(res.headers).toHaveProperty('x-total-count');
}

describe('Count endpoints', () => {
  test('GET /api/v1/students/count', async () => {
    const res = await request(app).get('/api/v1/students/count');
    expectCountResponse(res);
    // Second call should hit cache
    const res2 = await request(app).get('/api/v1/students/count');
    expect(res2.headers['x-cache']).toBeDefined();
  });
  test('GET /api/v1/teachers/count', async () => {
    const res = await request(app).get('/api/v1/teachers/count');
    expectCountResponse(res);
  });
  test('GET /api/v1/classes/count', async () => {
    const res = await request(app).get('/api/v1/classes/count');
    expectCountResponse(res);
  });
  test('GET /api/v1/subjects/count', async () => {
    const res = await request(app).get('/api/v1/subjects/count');
    expectCountResponse(res);
  });
  test('HEAD /api/v1/teachers/count', async () => {
    const res = await request(app).head('/api/v1/teachers/count');
    expect([204]).toContain(res.statusCode);
    expect(res.headers).toHaveProperty('x-total-count');
  });
  test('GET /api/v1/users/count (no auth - should still succeed or be restricted based on config)', async () => {
    const res = await request(app).get('/api/v1/users/count');
    // Depending on middleware, may be 401 if protection added later
    if (res.statusCode === 401) return; // acceptable
    expectCountResponse(res);
  });
});
