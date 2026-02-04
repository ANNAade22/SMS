const Teacher = require('../models/teacherModel.js');
const Subject = require('../models/subjectModel.js');
const Class = require('../models/classModel.js');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync.js');
const factory = require('./handlerFactory.js');

// Get single teacher with optional population
exports.getTeacher = factory.getOne(Teacher, ['subjects', 'classes']);

// Get the current logged-in user's Teacher profile
exports.getMe = catchAsync(async (req, res, next) => {
  const teacher = await Teacher.findOne({ userId: req.user.id }).populate([
    { path: 'subjects', select: 'name' },
    {
      path: 'classes',
      select: 'name grade students',
      populate: { path: 'grade', select: 'name' },
    },
  ]);

  if (!teacher) {
    // Graceful fallback: build a minimal profile from the User document
    const user = req.user;
    const fallbackProfile = {
      name: user?.profile?.firstName || user?.username || 'Teacher',
      surname: user?.profile?.lastName || '',
      email: user?.email || '',
      phone: user?.profile?.phone || '',
      address: user?.profile?.address || '',
      bloodType: '',
      sex: '',
      birthday: null,
      salary: null,
      hireDate: null,
      qualification: '',
      subjects: [],
      classes: [],
    };

    return res.status(200).json({
      status: 'success',
      data: { data: fallbackProfile, fallback: true },
    });
  }

  res.status(200).json({
    status: 'success',
    data: { data: teacher },
  });
});

// Get teacher's classes and subjects for assignment creation
exports.getTeacherClassesAndSubjects = catchAsync(async (req, res, next) => {
  const teacher = await Teacher.findOne({ userId: req.user.id }).populate([
    { path: 'subjects', select: 'name _id' },
    {
      path: 'classes',
      select: 'name grade _id',
      populate: { path: 'grade', select: 'name' },
    },
  ]);

  if (!teacher) {
    return res.status(404).json({
      status: 'fail',
      message: 'Teacher profile not found',
    });
  }

  // Format the response for easier frontend consumption
  const response = {
    classes: teacher.classes.map((cls) => ({
      _id: cls._id,
      name: cls.name,
      grade: cls.grade?.name || 'N/A',
      displayName: `${cls.name} - ${cls.grade?.name || 'N/A'}`,
    })),
    subjects: teacher.subjects.map((subj) => ({
      _id: subj._id,
      name: subj.name,
    })),
  };

  res.status(200).json({
    status: 'success',
    data: response,
  });
});

// Get all teachers with filtering, sorting, and pagination
exports.getAllTeachers = catchAsync(async (req, res, next) => {
  let filter = {};

  // Search filter
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { surname: regex }, { email: regex }];
  }

  // Class filter
  if (req.query.classes) {
    const classDoc = await Class.findOne({ name: req.query.classes });
    if (classDoc) {
      filter.classes = classDoc._id;
    }
  }

  // Get total before pagination
  const total = await Teacher.countDocuments(filter);

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Sorting
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    const [field, order] = req.query.sort.split(':');
    sort = { [field]: order === 'desc' ? -1 : 1 };
  }

  // Fetch teachers
  const teachers = await Teacher.find(filter)
    .populate([
      { path: 'subjects', select: 'name' },
      { path: 'classes', select: 'name' },
      {
        path: 'userId',
        select: 'isActive active username',
        model: 'User',
      },
    ])
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select(
      'name surname email phone subjects classes userId createdAt hireDate qualification experience',
    )
    .lean();

  // Also include classes where the teacher is set as supervisor
  const teacherIds = teachers.map((t) => t._id);
  if (teacherIds.length > 0) {
    const supervisorClasses = await Class.find({
      supervisor: { $in: teacherIds },
    })
      .select('name supervisor')
      .lean();

    const byTeacher = supervisorClasses.reduce((acc, c) => {
      const key = String(c.supervisor);
      if (!acc[key]) acc[key] = [];
      if (c.name) acc[key].push(c.name);
      return acc;
    }, {});

    teachers.forEach((t) => {
      const existing = Array.isArray(t.classes)
        ? t.classes
            .map((c) => (typeof c === 'string' ? c : c?.name))
            .filter(Boolean)
        : [];
      const extra = byTeacher[String(t._id)] || [];
      const merged = Array.from(new Set([...existing, ...extra]));
      // Replace with simple string array for consistent client rendering
      t.classes = merged;
    });
  }

  // Return JSON response
  res.status(200).json({
    status: 'success',
    results: teachers.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: {
      data: teachers,
    },
  });
});

// Factory CRUD operations
exports.createTeacher = factory.createOne(Teacher);
exports.updateTeacher = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // Normalize experience to a number if provided
  if (data.experience !== undefined) {
    const num = Number(data.experience);
    data.experience = Number.isNaN(num) ? undefined : num;
  }

  // Map subject/subjects provided as names to Subject IDs
  let subjectIds;
  if (Array.isArray(data.subjects) && data.subjects.length > 0) {
    const names = data.subjects.filter((s) => typeof s === 'string');
    if (names.length > 0) {
      const subjects = await Subject.find({ name: { $in: names } }).select(
        '_id',
      );
      subjectIds = subjects.map((s) => s._id);
    }
  } else if (data.subject && typeof data.subject === 'string') {
    const subj = await Subject.findOne({ name: data.subject }).select('_id');
    subjectIds = subj ? [subj._id] : undefined;
  }

  if (subjectIds) {
    data.subjects = subjectIds;
  }
  delete data.subject; // ensure only 'subjects' persists

  // Map classes provided as names to Class IDs
  if (Array.isArray(data.classes) && data.classes.length > 0) {
    const names = data.classes.filter((c) => typeof c === 'string');
    if (names.length > 0) {
      const classes = await Class.find({ name: { $in: names } }).select('_id');
      data.classes = classes.map((c) => c._id);
    }
  }

  const updated = await Teacher.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return res
      .status(404)
      .json({ status: 'fail', message: 'No teacher found with that ID' });
  }

  res.status(200).json({ status: 'success', data: { data: updated } });
});
exports.deleteTeacher = factory.deleteOne(Teacher);

// Create or link a Teacher to an existing User by username (admin flow)
exports.createOrLinkTeacher = async (req, res, next) => {
  try {
    const {
      username,
      name,
      surname,
      address,
      sex,
      birthday,
      phone,
      bloodType,
      department,
      qualification,
      experience,
      hireDate,
    } = req.body || {};

    if (!username) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'username is required to link' });
    }
    if (!name || !surname || !address) {
      return res.status(400).json({
        status: 'fail',
        message: 'name, surname and address are required',
      });
    }
    if (!sex) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'sex is required' });
    }
    if (!birthday) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'birthday is required' });
    }
    if (!bloodType) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'bloodType is required' });
    }

    const user = await User.findOne({ username }).select('id email role');
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }
    if (user.role !== 'teacher') {
      return res.status(400).json({
        status: 'fail',
        message: 'User is not a teacher account',
      });
    }

    const existing = await Teacher.findOne({ userId: user.id }).select('_id');
    if (existing) {
      return res.status(409).json({
        status: 'fail',
        message: 'Teacher profile already exists for this user',
      });
    }

    // Parse dates and normalize enums
    const parseDate = (d) => {
      try {
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? undefined : dt;
      } catch {
        return undefined;
      }
    };
    // Resolve subject IDs if subject/subjects provided
    let subjectIds;
    if (Array.isArray(req.body?.subjects) && req.body.subjects.length > 0) {
      const names = req.body.subjects.filter((s) => typeof s === 'string');
      if (names.length > 0) {
        const subjects = await Subject.find({ name: { $in: names } }).select(
          '_id',
        );
        subjectIds = subjects.map((s) => s._id);
      }
    } else if (req.body?.subject && typeof req.body.subject === 'string') {
      const subj = await Subject.findOne({ name: req.body.subject }).select(
        '_id',
      );
      subjectIds = subj ? [subj._id] : undefined;
    }

    // Resolve class IDs if classes provided
    let classIds;
    if (Array.isArray(req.body?.classes) && req.body.classes.length > 0) {
      const classNames = req.body.classes.filter((c) => typeof c === 'string');
      if (classNames.length > 0) {
        const classes = await Class.find({ name: { $in: classNames } }).select(
          '_id',
        );
        classIds = classes.map((c) => c._id);
      }
    }

    const teacherDoc = await Teacher.create({
      name,
      surname,
      userId: user.id,
      email: user.email, // source email from User to avoid duplicates
      phone: phone || undefined,
      address,
      bloodType,
      sex: String(sex).toUpperCase(),
      birthday: parseDate(birthday),
      qualification: qualification || undefined,
      experience:
        typeof experience === 'number'
          ? experience
          : experience
            ? Number(experience)
            : undefined,
      hireDate: parseDate(hireDate),
      subjects: subjectIds,
      classes: classIds,
      // Optional fields
      // department is not in schema explicitly; keep in payload if model later supports
    });

    res.status(201).json({ status: 'success', data: { data: teacherDoc } });
  } catch (e) {
    next(e);
  }
};
