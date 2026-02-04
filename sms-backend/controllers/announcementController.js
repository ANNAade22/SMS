const Announcement = require('../models/announcementModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Helper function to determine if user can see announcement based on audience
const isAnyAdmin = (role) =>
  role === 'super_admin' || role === 'school_admin' || role.endsWith('_admin');

const canUserSeeAnnouncement = (announcement, user) => {
  const { audience } = announcement;
  const { role } = user;

  // Admin can see all announcements
  if (isAnyAdmin(role)) return true;

  // Teachers can see their own announcements and announcements for teachers
  if (role === 'teacher') {
    return (
      audience === 'Teachers' ||
      audience === 'School Staff' ||
      audience === 'All Users' ||
      (announcement.createdBy &&
        ((typeof announcement.createdBy === 'string' &&
          announcement.createdBy === user._id.toString()) ||
          (announcement.createdBy._id &&
            announcement.createdBy._id.toString() === user._id.toString())))
    );
  }

  // Students can see announcements for students
  if (role === 'student') {
    return (
      audience === 'Students' ||
      audience === 'All Students' ||
      audience === 'All Users'
    );
  }

  // Parents can see announcements for parents
  if (role === 'parent') {
    return (
      audience === 'Parents' ||
      audience === 'All Parents' ||
      audience === 'All Users'
    );
  }

  return false;
};

// Get all announcements for the current user
exports.getAllAnnouncements = catchAsync(async (req, res, next) => {
  // Build base query
  let query = Announcement.find({ status: { $ne: 'Archived' } })
    .select('title audience status isPinned createdAt class subject createdBy')
    .populate('createdBy', 'username email role')
    .populate('class', 'name grade')
    .populate('subject', 'name')
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();

  // Apply API features (filtering, sorting, pagination)
  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const announcements = await features.query;

  // Filter announcements based on user's role and audience
  const filteredAnnouncements = announcements.filter((announcement) =>
    canUserSeeAnnouncement(announcement, req.user),
  );

  res.status(200).json({
    status: 'success',
    results: filteredAnnouncements.length,
    data: {
      announcements: filteredAnnouncements,
    },
  });
});

// Get single announcement
exports.getAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id)
    .populate('createdBy', 'name email role')
    .populate('class', 'name grade')
    .populate('subject', 'name');

  if (!announcement) {
    return next(new AppError('No announcement found with that ID', 404));
  }

  // Check if user can see this announcement
  if (!canUserSeeAnnouncement(announcement, req.user)) {
    return next(
      new AppError('You do not have permission to view this announcement', 403),
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      announcement,
    },
  });
});

// Create new announcement
exports.createAnnouncement = catchAsync(async (req, res, next) => {
  // Add createdBy field
  req.body.createdBy = req.user._id;

  // Validate audience based on user role
  const { audience } = req.body;
  const role = req.user.role;

  if (
    role === 'teacher' &&
    !['Teachers', 'School Staff', 'All Users'].includes(audience)
  ) {
    return next(
      new AppError(
        'Teachers can only create announcements for Teachers, School Staff, or All Users',
        403,
      ),
    );
  }

  let newAnnouncement;
  try {
    newAnnouncement = await Announcement.create(req.body);
  } catch (error) {
    console.error('Error creating announcement:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    throw error;
  }

  const announcement = await Announcement.findById(newAnnouncement._id)
    .populate('createdBy', 'name email role')
    .populate('class', 'name grade')
    .populate('subject', 'name');

  res.status(201).json({
    status: 'success',
    data: {
      announcement,
    },
  });
});

// Update announcement
exports.updateAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    return next(new AppError('No announcement found with that ID', 404));
  }

  // Check if user can update this announcement
  if (
    announcement.createdBy.toString() !== req.user._id.toString() &&
    !isAnyAdmin(req.user.role)
  ) {
    return next(
      new AppError(
        'You do not have permission to update this announcement',
        403,
      ),
    );
  }

  const updatedAnnouncement = await Announcement.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('createdBy', 'name email role')
    .populate('class', 'name grade')
    .populate('subject', 'name');

  res.status(200).json({
    status: 'success',
    data: {
      announcement: updatedAnnouncement,
    },
  });
});

// Delete announcement
exports.deleteAnnouncement = catchAsync(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    return next(new AppError('No announcement found with that ID', 404));
  }

  // Check if user can delete this announcement
  if (
    announcement.createdBy.toString() !== req.user._id.toString() &&
    !isAnyAdmin(req.user.role)
  ) {
    return next(
      new AppError(
        'You do not have permission to delete this announcement',
        403,
      ),
    );
  }

  await Announcement.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Toggle pin status
exports.togglePin = catchAsync(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement) {
    return next(new AppError('No announcement found with that ID', 404));
  }

  // Check if user can modify this announcement
  if (
    announcement.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(
      new AppError(
        'You do not have permission to modify this announcement',
        403,
      ),
    );
  }

  const updatedAnnouncement = await Announcement.findByIdAndUpdate(
    req.params.id,
    { isPinned: !announcement.isPinned },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('createdBy', 'name email role')
    .populate('class', 'name grade')
    .populate('subject', 'name');

  res.status(200).json({
    status: 'success',
    data: {
      announcement: updatedAnnouncement,
    },
  });
});

// Get audience options based on user role
exports.getAudienceOptions = catchAsync(async (req, res, next) => {
  let options = [];

  switch (req.user.role) {
    case 'admin':
      options = [
        'All Users',
        'School Staff',
        'Administrative Staff',
        'Teachers',
        'Students',
        'Parents',
        'All Students',
        'All Teachers',
        'All Parents',
      ];
      break;
    case 'teacher':
      options = ['Teachers', 'School Staff', 'All Users'];
      break;
    case 'student':
      options = ['Students', 'All Students', 'All Users'];
      break;
    case 'parent':
      options = ['Parents', 'All Parents', 'All Users'];
      break;
    default:
      options = ['All Users'];
  }

  res.status(200).json({
    status: 'success',
    data: {
      audienceOptions: options,
    },
  });
});
