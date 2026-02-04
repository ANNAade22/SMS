// controllers/studentController.js
const mongoose = require('mongoose');
const Student = require('../models/studentModel');
const Parent = require('../models/parentModel.js');
const User = require('../models/userModel');
const Class = require('../models/classModel');
const Grade = require('../models/gradeModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllStudents = factory.getAll(Student, [
  { path: 'parent', select: 'name email phone' },
  { path: 'class', select: 'name' },
  // Provide grade name for frontend
  { path: 'grade', select: 'name' },
]);

exports.getStudent = factory.getOne(Student, [
  { path: 'parent', select: 'name email phone' },
  { path: 'class', select: 'name' },
  { path: 'grade', select: 'level name' },
]);

exports.createStudent = factory.createOne(Student);

// Get current parent's children
exports.getMyChildren = catchAsync(async (req, res, next) => {
  const parentId = req.user.parentProfile;

  if (!parentId) {
    return next(new AppError('No parent profile found for this user', 404));
  }

  const students = await Student.find({ parent: parentId })
    .populate('parent', 'name email phone')
    .populate('class', 'name')
    .populate('grade', 'name');

  res.status(200).json({
    status: 'success',
    data: { data: students },
  });
});

// Get current teacher's students
exports.getMyStudents = catchAsync(async (req, res, next) => {
  const teacherId = req.user.teacherProfile;

  if (!teacherId) {
    return next(new AppError('No teacher profile found for this user', 404));
  }

  // First, get the classes supervised by this teacher
  const classes = await Class.find({ supervisor: teacherId }).select('_id');
  const classIds = classes.map((cls) => cls._id);

  if (classIds.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: { data: [] },
    });
  }

  // Then get all students in those classes
  const students = await Student.find({ class: { $in: classIds } })
    .populate('parent', 'name email phone')
    .populate('class', 'name')
    .populate('grade', 'name');

  res.status(200).json({
    status: 'success',
    data: { data: students },
  });
});

// Get current student's own profile
exports.getMyProfile = catchAsync(async (req, res, next) => {
  const studentId = req.user.studentProfile;

  if (!studentId) {
    return next(new AppError('No student profile found for this user', 404));
  }

  const student = await Student.findById(studentId)
    .populate('parent', 'name email phone')
    .populate('class', 'name')
    .populate('grade', 'name');

  if (!student) {
    return next(new AppError('Student profile not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: student },
  });
});

// Update current student's own profile
exports.updateMyProfile = catchAsync(async (req, res, next) => {
  const studentId = req.user.studentProfile;

  if (!studentId) {
    return next(new AppError('No student profile found for this user', 404));
  }

  // Filter out fields that students shouldn't be able to update
  const allowedFields = [
    'name',
    'surname',
    'address',
    'sex',
    'birthday',
    'phone',
    'bloodType',
  ];
  const updateData = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return next(new AppError('No valid fields to update', 400));
  }

  const student = await Student.findByIdAndUpdate(studentId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('parent', 'name email phone')
    .populate('class', 'name')
    .populate('grade', 'name');

  if (!student) {
    return next(new AppError('Student profile not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: student },
  });
});

// Prevent immutable field updates like username and maintain Class.students membership
exports.updateStudent = async (req, res, next) => {
  try {
    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(req.body, 'username')
    ) {
      delete req.body.username;
    }

    const { id } = req.params;
    const before = await Student.findById(id).select('class');
    if (!before) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No document found with that ID' });
    }

    const doc = await Student.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No document found with that ID' });
    }

    const prevClass = before.class ? String(before.class) : null;
    const nextClass = doc.class ? String(doc.class) : null;
    if (prevClass && nextClass && prevClass !== nextClass) {
      await Class.updateOne(
        { _id: prevClass },
        { $pull: { students: doc._id } },
      ).catch(() => {});
      await Class.updateOne(
        { _id: nextClass },
        { $addToSet: { students: doc._id } },
      ).catch(() => {});
    } else if (!prevClass && nextClass) {
      await Class.updateOne(
        { _id: nextClass },
        { $addToSet: { students: doc._id } },
      ).catch(() => {});
    } else if (prevClass && !nextClass) {
      await Class.updateOne(
        { _id: prevClass },
        { $pull: { students: doc._id } },
      ).catch(() => {});
    }

    // Best-effort: de-duplicate any historical duplicates in the new class
    if (nextClass) {
      await Class.updateOne({ _id: nextClass }, [
        {
          $set: {
            students: { $setUnion: ['$students', '$students'] },
          },
        },
      ]).catch(() => {});
    }

    return res.status(200).json({ status: 'success', data: { data: doc } });
  } catch (e) {
    return next(e);
  }
};

// Delete student and remove from Class.students
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Student.findByIdAndDelete(id);
    if (!doc) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No document found with that ID' });
    }
    if (doc.class) {
      await Class.updateOne(
        { _id: doc.class },
        { $pull: { students: doc._id } },
      ).catch(() => {});
    }
    return res.status(204).json({ status: 'success', data: null });
  } catch (e) {
    return next(e);
  }
};

// Internal helper: validate bulk students payload; returns { errors, normalized }
async function validateBulkStudents(students) {
  const errors = [];
  const normalized = students.map((s, idx) => ({
    idx,
    raw: s,
    username: s.username ? String(s.username).toLowerCase().trim() : '',
    email: s.email ? String(s.email).toLowerCase().trim() : '',
    phone: s.phone ? String(s.phone).trim() : '',
    name: s.name,
    surname: s.surname,
    address: s.address,
    sex: s.sex,
    birthday: s.birthday,
    parentId: s.parentId,
    classId: s.classId,
    gradeId: s.gradeId,
    bloodType: s.bloodType,
  }));

  const required = [
    'username',
    'name',
    'surname',
    'email',
    'address',
    'sex',
    'birthday',
    'parentId',
    'classId',
    'gradeId',
  ];
  normalized.forEach((s) => {
    const missing = required.filter((f) => !s[f] && s[f] !== 0);
    if (missing.length) {
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: `Missing: ${missing.join(', ')}`,
      });
    }
  });

  // In-file duplicates
  const seenUser = new Set();
  const seenEmail = new Set();
  const seenPhone = new Set();
  normalized.forEach((s) => {
    if (s.username) {
      const k = s.username;
      if (seenUser.has(k))
        errors.push({
          row: s.idx + 1,
          username: s.username,
          error: 'Duplicate username in file',
        });
      else seenUser.add(k);
    }
    if (s.email) {
      const k = s.email;
      if (seenEmail.has(k))
        errors.push({
          row: s.idx + 1,
          username: s.username,
          error: 'Duplicate email in file',
        });
      else seenEmail.add(k);
    }
    if (s.phone) {
      const k = s.phone;
      if (seenPhone.has(k))
        errors.push({
          row: s.idx + 1,
          username: s.username,
          error: 'Duplicate phone in file',
        });
      else seenPhone.add(k);
    }
  });

  // Validate formats before DB checks (avoid CastError)
  const isValidId = (v) => mongoose.Types.ObjectId.isValid(String(v));
  normalized.forEach((s) => {
    if (s.parentId && !isValidId(s.parentId)) {
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Invalid parentId format',
      });
    }
    if (s.classId && !isValidId(s.classId)) {
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Invalid classId format',
      });
    }
    if (s.gradeId && !isValidId(s.gradeId)) {
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Invalid gradeId format',
      });
    }
    if (s.birthday) {
      const d = new Date(s.birthday);
      if (Number.isNaN(d.getTime())) {
        errors.push({
          row: s.idx + 1,
          username: s.username,
          error: 'Invalid birthday format (YYYY-MM-DD)',
        });
      }
    }
    // Email format (mirror userModel regex to avoid mismatch at write time)
    if (s.email) {
      const emailOk = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
        String(s.email),
      );
      if (!emailOk) {
        errors.push({
          row: s.idx + 1,
          username: s.username,
          error: 'Invalid email format',
        });
      }
    }
  });

  // DB duplicates and references (only query valid IDs)
  const usernames = normalized.map((s) => s.username).filter(Boolean);
  const emails = normalized.map((s) => s.email).filter(Boolean);
  const phones = normalized.map((s) => s.phone).filter(Boolean);
  const parentIds = normalized
    .map((s) => s.parentId)
    .filter((v) => v && isValidId(v));
  const classIds = normalized
    .map((s) => s.classId)
    .filter((v) => v && isValidId(v));
  const gradeIds = normalized
    .map((s) => s.gradeId)
    .filter((v) => v && isValidId(v));

  const [
    existingUsers,
    existingStudents,
    existingParents,
    existingClasses,
    existingGrades,
  ] = await Promise.all([
    User.find({
      $or: [{ username: { $in: usernames } }, { email: { $in: emails } }],
    })
      .select('username email')
      .lean(),
    Student.find({
      $or: [
        { username: { $in: usernames } },
        { email: { $in: emails } },
        phones.length ? { phone: { $in: phones } } : null,
      ].filter(Boolean),
    })
      .select('username email phone')
      .lean(),
    Parent.find({ _id: { $in: parentIds } })
      .select('_id')
      .lean(),
    Class.find({ _id: { $in: classIds } })
      .select('_id')
      .lean(),
    Grade.find({ _id: { $in: gradeIds } })
      .select('_id')
      .lean(),
  ]);

  const existingUsernames = new Set([
    ...existingUsers.map((u) => String(u.username).toLowerCase()),
    ...existingStudents.map((s) => String(s.username).toLowerCase()),
  ]);
  const existingEmails = new Set([
    ...existingUsers.map((u) => String(u.email).toLowerCase()),
    ...existingStudents.map((s) => String(s.email).toLowerCase()),
  ]);
  const existingPhones = new Set(
    existingStudents.map((s) => String(s.phone || '')),
  );
  const foundParents = new Set(existingParents.map((p) => String(p._id)));
  const foundClasses = new Set(existingClasses.map((c) => String(c._id)));
  const foundGrades = new Set(existingGrades.map((g) => String(g._id)));

  normalized.forEach((s) => {
    if (s.username && existingUsernames.has(s.username))
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Username already exists',
      });
    if (s.email && existingEmails.has(s.email))
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Email already exists',
      });
    if (s.phone && existingPhones.has(s.phone))
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Phone already exists',
      });
    if (
      s.parentId &&
      isValidId(s.parentId) &&
      !foundParents.has(String(s.parentId))
    )
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Parent not found',
      });
    if (
      s.classId &&
      isValidId(s.classId) &&
      !foundClasses.has(String(s.classId))
    )
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Class not found',
      });
    if (
      s.gradeId &&
      isValidId(s.gradeId) &&
      !foundGrades.has(String(s.gradeId))
    )
      errors.push({
        row: s.idx + 1,
        username: s.username,
        error: 'Grade not found',
      });
  });

  return { errors, normalized };
}

// Bulk create students with associated user accounts (default password)
// Unified endpoint: decides whether to link based on presence of existing user & absence of password
exports.createOrLinkStudent = async (req, res, next) => {
  try {
    const { username, password, linkExisting } = req.body;
    if (username && (!password || linkExisting)) {
      // attempt link path (reuse existing handler)
      return exports.linkExistingStudentUser(req, res, next);
    }
    return res.status(400).json({
      status: 'fail',
      message:
        'Direct student creation disabled here. Provide existing student username without password (or set linkExisting=true) to link.',
    });
  } catch (e) {
    return next(e);
  }
};
exports.bulkCreateStudents = async (req, res) => {
  const { students } = req.body;
  const atomicParam = req.query.atomic ?? req.body?.atomic;
  const atomic =
    atomicParam === undefined ? true : String(atomicParam) !== 'false';

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Provide non-empty students array',
    });
  }

  // Generate strong random password per student (no shared default)
  const length = parseInt(process.env.TEMP_PASSWORD_LENGTH || '14', 10);
  const genPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*?-';
    const all = upper + lower + digits + symbols;
    const pick = (set) => set[Math.floor(Math.random() * set.length)];
    let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
    for (let i = pwd.length; i < length; i += 1) pwd += pick(all);
    return pwd
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  };

  // Pre-validate entire batch for atomicity
  const { errors, normalized } = await validateBulkStudents(students);

  if (errors.length) {
    return res.status(200).json({
      status: 'fail',
      created: 0,
      failed: errors.length,
      successes: [],
      errors,
      message: 'Validation failed. No records created.',
    });
  }

  const successes = [];

  // Try transactional create if supported
  let session;
  if (atomic) {
    try {
      session = await mongoose.startSession();
      await session.withTransaction(
        async () => {
          for (let i = 0; i < normalized.length; i += 1) {
            const s = normalized[i];
            const tempPassword = genPassword();

            const [user] = await User.create(
              [
                {
                  username: s.username,
                  email: s.email,
                  password: tempPassword,
                  role: 'student',
                  mustChangePassword: true,
                },
              ],
              { session },
            );

            const [studentDoc] = await Student.create(
              [
                {
                  username: s.username,
                  name: s.name,
                  surname: s.surname,
                  email: s.email,
                  address: s.address,
                  sex: s.sex,
                  birthday: new Date(s.birthday),
                  parent: s.parentId,
                  class: s.classId,
                  grade: s.gradeId,
                  phone: s.phone || undefined,
                  bloodType: s.bloodType || undefined,
                },
              ],
              { session },
            );

            await User.updateOne(
              { _id: user._id },
              { $set: { studentProfile: studentDoc._id } },
              { session },
            );

            if (studentDoc.class) {
              await Class.updateOne(
                { _id: studentDoc.class },
                { $addToSet: { students: studentDoc._id } },
                { session },
              );
            }

            successes.push({
              username: s.username,
              email: s.email,
              password: tempPassword,
              studentId: studentDoc._id,
            });
          }
        },
        { writeConcern: { w: 'majority' } },
      );
    } catch (err) {
      if (session) session.endSession();
      // If transactions unsupported (e.g., standalone mongo), fallback to non-transactional path
      const unsupported =
        /Transaction numbers are only allowed|Replica set|withTransaction is not a function/i.test(
          String(err && err.message),
        );
      if (!unsupported) {
        return res.status(500).json({
          status: 'error',
          message: 'Bulk create failed during transaction',
          error: err.message,
        });
      }
      // Non-transactional best-effort create (pre-validated so should succeed)
      // Enhanced: track created artifacts precisely for reliable rollback
      const createdRecords = [];
      try {
        for (let i = 0; i < normalized.length; i += 1) {
          const s = normalized[i];
          const tempPassword = genPassword();
          const user = await User.create({
            username: s.username,
            email: s.email,
            password: tempPassword,
            role: 'student',
            mustChangePassword: true,
          });
          // Track created user immediately to allow rollback even if student create fails
          createdRecords.push({ userId: user._id, username: s.username });

          const studentDoc = await Student.create({
            username: s.username,
            name: s.name,
            surname: s.surname,
            email: s.email,
            address: s.address,
            sex: s.sex,
            birthday: new Date(s.birthday),
            parent: s.parentId,
            class: s.classId,
            grade: s.gradeId,
            phone: s.phone || undefined,
            bloodType: s.bloodType || undefined,
          });

          // Update tracking with student info
          createdRecords[createdRecords.length - 1].studentId = studentDoc._id;
          createdRecords[createdRecords.length - 1].classId = studentDoc.class
            ? String(studentDoc.class)
            : null;

          await User.updateOne(
            { _id: user._id },
            { $set: { studentProfile: studentDoc._id } },
          );
          if (studentDoc.class) {
            await Class.updateOne(
              { _id: studentDoc.class },
              { $addToSet: { students: studentDoc._id } },
            ).catch(() => {});
          }

          successes.push({
            username: s.username,
            email: s.email,
            password: tempPassword,
            studentId: studentDoc._id,
          });
        }
      } catch (nonTxnErr) {
        let rollbackError = null;
        try {
          // Delete any created students
          const studentIds = createdRecords
            .map((r) => r.studentId)
            .filter(Boolean);
          if (studentIds.length) {
            const createdStudents = await Student.find({
              _id: { $in: studentIds },
            })
              .select('_id class')
              .lean();
            const classMap = new Map();
            createdStudents.forEach((st) => {
              if (st.class) {
                const key = String(st.class);
                if (!classMap.has(key)) classMap.set(key, []);
                classMap.get(key).push(st._id);
              }
            });
            await Student.deleteMany({ _id: { $in: studentIds } });
            const pulls = [];
            for (const [cid, ids] of classMap.entries()) {
              pulls.push(
                Class.updateOne(
                  { _id: cid },
                  { $pull: { students: { $in: ids } } },
                ),
              );
            }
            await Promise.all(pulls);
          }
          // Delete any created users (even those without a student)
          const userIds = createdRecords.map((r) => r.userId).filter(Boolean);
          if (userIds.length) {
            await User.deleteMany({ _id: { $in: userIds } });
          }
        } catch (rbErr) {
          rollbackError = rbErr;
        }

        if (rollbackError) {
          return res.status(500).json({
            status: 'error',
            message:
              'Bulk create failed and could not ensure atomicity on this MongoDB setup',
            error: `${nonTxnErr.message} | rollback: ${rollbackError.message}`,
          });
        }
        // Rolled back successfully: report as validation-style failure for UI
        // Try to extract a hint of which row failed from the error message
        let errRow = null;
        let errUser = null;
        if (nonTxnErr && nonTxnErr.message) {
          const m =
            /index: (?:username_1|email_1|phone_1).* dup key.*: \{ (?:username|email|phone): \"([^\"]+)/i.exec(
              nonTxnErr.message,
            );
          if (m && m[1]) {
            errUser = String(m[1]);
            const idx = normalized.findIndex(
              (r) =>
                r.username === errUser ||
                r.email === errUser ||
                r.phone === errUser,
            );
            if (idx >= 0) errRow = normalized[idx].idx + 1;
          }
        }
        return res.status(200).json({
          status: 'fail',
          created: 0,
          failed: normalized.length,
          successes: [],
          errors: [
            {
              row: errRow,
              username: errUser,
              error: nonTxnErr.message,
            },
          ],
          message: 'Bulk create failed; all changes rolled back.',
        });
      }
      // Success without transaction path falls through
      return res.status(201).json({
        status: 'success',
        created: successes.length,
        failed: 0,
        successes,
        errors: [],
      });
    } finally {
      if (session) session.endSession();
    }

    // Transactional success
    return res.status(201).json({
      status: 'success',
      created: successes.length,
      failed: 0,
      successes,
      errors: [],
    });
  }

  // Non-atomic legacy behavior if explicitly requested
  const successesLegacy = [];
  const errorsLegacy = [];
  for (let i = 0; i < normalized.length; i += 1) {
    const s = normalized[i];
    try {
      const tempPassword = genPassword();
      const user = await User.create({
        username: s.username,
        email: s.email,
        password: tempPassword,
        role: 'student',
        mustChangePassword: true,
      });
      const studentDoc = await Student.create({
        username: s.username,
        name: s.name,
        surname: s.surname,
        email: s.email,
        address: s.address,
        sex: s.sex,
        birthday: new Date(s.birthday),
        parent: s.parentId,
        class: s.classId,
        grade: s.gradeId,
        phone: s.phone || undefined,
        bloodType: s.bloodType || undefined,
      });
      await User.findByIdAndUpdate(user._id, {
        studentProfile: studentDoc._id,
      });
      if (studentDoc.class) {
        await Class.updateOne(
          { _id: studentDoc.class },
          { $addToSet: { students: studentDoc._id } },
        ).catch(() => {});
      }
      successesLegacy.push({
        username: s.username,
        email: s.email,
        password: tempPassword,
        studentId: studentDoc._id,
      });
    } catch (e) {
      errorsLegacy.push({
        row: s.idx + 1,
        username: s.username,
        error: e.message,
      });
    }
  }
  return res.status(200).json({
    status: 'success',
    created: successesLegacy.length,
    failed: errorsLegacy.length,
    successes: successesLegacy,
    errors: errorsLegacy,
  });
};

// Validate a bulk payload without writing anything
exports.bulkPreflightStudents = async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Provide non-empty students array' });
  }
  const { errors } = await validateBulkStudents(students);
  if (errors.length) {
    return res.status(200).json({
      status: 'fail',
      created: 0,
      failed: errors.length,
      successes: [],
      errors,
    });
  }
  return res.status(200).json({
    status: 'success',
    created: 0,
    failed: 0,
    successes: [],
    errors: [],
  });
};

// Link an already-created student user (role=student) to a new student profile
exports.linkExistingStudentUser = async (req, res, next) => {
  try {
    const {
      username,
      name,
      surname,
      address,
      sex,
      birthday,
      parentId,
      classId,
      gradeId,
      phone,
      bloodType,
    } = req.body;

    if (!username) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'username required' });
    }
    const user = await User.findOne({ username, role: 'student' }).select(
      '+studentProfile',
    );
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Student user not found' });
    }
    if (user.studentProfile) {
      return res.status(400).json({
        status: 'fail',
        message: 'User already linked to a student profile',
      });
    }

    const requiredMap = { name, classId, gradeId };
    const missingFields = Object.entries(requiredMap)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);
    if (missingFields.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields',
        missingFields,
      });
    }

    // Validate parent/class/grade existence (best-effort)
    const Parent = require('../models/parentModel');
    const Class = require('../models/classModel');
    const Grade = require('../models/gradeModel');
    const [parentDoc, classDoc, gradeDoc] = await Promise.all([
      parentId
        ? Parent.findById(parentId).select('_id')
        : Promise.resolve(null),
      Class.findById(classId).select('_id'),
      Grade.findById(gradeId).select('_id'),
    ]);
    if (parentId && !parentDoc) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Parent not found' });
    }
    if (!classDoc) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Class not found' });
    }
    if (!gradeDoc) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Grade not found' });
    }

    // Create student profile (email sourced from user to avoid mismatch)
    const studentPayload = {
      username,
      name,
      email: user.email,
      class: classId,
      grade: gradeId,
    };
    if (surname) studentPayload.surname = surname;
    if (address) studentPayload.address = address;
    if (sex) studentPayload.sex = sex;
    if (birthday) studentPayload.birthday = new Date(birthday);
    if (phone) studentPayload.phone = phone;
    if (bloodType) studentPayload.bloodType = bloodType;
    if (parentId) studentPayload.parent = parentId;
    let student;
    try {
      student = await Student.create(studentPayload);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          status: 'fail',
          message: 'Duplicate key error',
          duplicateFields: Object.keys(err.keyPattern || {}),
        });
      }
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          status: 'fail',
          message: 'Validation failed',
          errors: Object.values(err.errors).map((e) => e.message),
        });
      }
      throw err;
    }

    // Link on User
    user.studentProfile = student._id;
    await user.save({ validateModifiedOnly: true });

    // Also add to Class.students for occupancy tracking
    if (student.class) {
      await Class.updateOne(
        { _id: student.class },
        { $addToSet: { students: student._id } },
      ).catch(() => {});
      // Dedup in case of legacy duplicates
      await Class.updateOne({ _id: student.class }, [
        {
          $set: { students: { $setUnion: ['$students', '$students'] } },
        },
      ]).catch(() => {});
    }

    return res.status(201).json({ status: 'success', data: { student } });
  } catch (e) {
    return next(e);
  }
};
