const Event = require('../models/eventModel');
const Student = require('../models/studentModel');
const Class = require('../models/classModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Helper function to process audience and extract class if needed
const processAudience = (audience) => {
  const processedData = { audience };

  if (audience && audience.startsWith('class_')) {
    const classId = audience.replace('class_', '');
    processedData.class = classId;
    // Keep the original audience value for display purposes
  } else {
    processedData.class = null;
  }

  return processedData;
};

exports.getAllEvents = catchAsync(async (req, res, next) => {
  try {
    // Build base query
    let query = Event.find();

    // Filter by user role
    if (req.user.role === 'student') {
      // Resolve student's class from their profile to avoid casting undefined
      let classId = null;
      if (req.user.studentProfile) {
        const stu = await Student.findById(req.user.studentProfile).select(
          'class',
        );
        classId = stu?.class || null;
      }
      const generalAudience = [
        'All Students',
        'Students & Parents',
        'All (Teachers, Students & Parents)',
        'All',
        'All Users',
        'All Staff',
        'School Community',
      ];
      const orConditions = [
        { class: null },
        { audience: { $in: generalAudience } },
      ];
      if (classId) orConditions.unshift({ class: classId });
      query = Event.find().or(orConditions);
    } else if (req.user.role === 'parent') {
      // Parents can see events for their children's classes or general events
      query = query.or([
        {
          audience: {
            $in: [
              'All Parents',
              'Students & Parents',
              'All (Teachers, Students & Parents)',
              'All',
              'All Users',
              'All Staff',
              'School Community',
            ],
          },
        },
        { audience: { $regex: '^class_', $options: 'i' } }, // Any class-specific events (could be refined by children's classes)
      ]);
    } else if (req.user.role === 'teacher') {
      // Teachers can see all events
      query = query;
    }

    // Execute query
    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const events = await features.query
      .select(
        'title description startTime endTime location category audience status class createdBy createdAt',
      )
      .populate('class', 'name grade section')
      .lean();

    // Send response
    res.status(200).json({
      status: 'success',
      results: events.length,
      data: {
        data: events,
      },
    });
  } catch (error) {
    console.error('Error in getAllEvents:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

exports.getEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate(
    'class',
    'name grade section',
  );

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: event,
    },
  });
});

exports.createEvent = catchAsync(async (req, res, next) => {
  // Add createdBy field
  req.body.createdBy = req.user.id;

  // Process audience field
  if (req.body.audience) {
    const processedData = processAudience(req.body.audience);
    req.body = { ...req.body, ...processedData };
  }

  const newEvent = await Event.create(req.body);

  const event = await Event.findById(newEvent._id).populate(
    'class',
    'name grade section',
  );

  res.status(201).json({
    status: 'success',
    data: {
      data: event,
    },
  });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  // Process audience field
  if (req.body.audience) {
    const processedData = processAudience(req.body.audience);
    req.body = { ...req.body, ...processedData };
  }

  const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('class', 'name grade section');

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: event,
    },
  });
});

exports.deleteEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findByIdAndDelete(req.params.id);

  if (!event) {
    return next(new AppError('No event found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getAudienceOptions = catchAsync(async (req, res, next) => {
  // Import required models
  const Class = require('../models/classModel');
  const Teacher = require('../models/teacherModel');
  const Student = require('../models/studentModel');
  const Parent = require('../models/parentModel');

  // Fetch all classes
  const classes = await Class.find()
    .select('_id name grade section')
    .populate('grade', 'name')
    .sort('name');

  // Fetch all teachers
  const teachers = await Teacher.find().select('_id name surname').sort('name');

  // Fetch all students
  const students = await Student.find().select('_id name surname').sort('name');

  // Fetch all parents
  const parents = await Parent.find().select('_id name surname').sort('name');

  // Format the response
  const audienceOptions = {
    general: [
      { value: 'All Teachers', label: 'All Teachers', type: 'general' },
      { value: 'All Students', label: 'All Students', type: 'general' },
      { value: 'All Parents', label: 'All Parents', type: 'general' },
      {
        value: 'Teachers & Parents',
        label: 'Teachers & Parents',
        type: 'general',
      },
      {
        value: 'All',
        label: 'All (Teachers, Students & Parents)',
        type: 'general',
      },
    ],
    classes: classes.map((cls) => ({
      value: `class_${cls._id}`,
      label: `${cls.name} (${cls.grade?.name || 'N/A'} - ${cls.section})`,
      type: 'class',
      classId: cls._id,
      className: cls.name,
      grade: cls.grade?.name,
      section: cls.section,
    })),
    teachers: teachers.map((teacher) => ({
      value: `teacher_${teacher._id}`,
      label: `${teacher.name} ${teacher.surname}`,
      type: 'individual',
      userId: teacher._id,
      userType: 'teacher',
    })),
    students: students.map((student) => ({
      value: `student_${student._id}`,
      label: `${student.name} ${student.surname}`,
      type: 'individual',
      userId: student._id,
      userType: 'student',
    })),
    parents: parents.map((parent) => ({
      value: `parent_${parent._id}`,
      label: `${parent.name} ${parent.surname}`,
      type: 'individual',
      userId: parent._id,
      userType: 'parent',
    })),
  };

  res.status(200).json({
    status: 'success',
    data: {
      data: audienceOptions,
    },
  });
});
