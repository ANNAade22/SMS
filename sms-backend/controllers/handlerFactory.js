const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // Filter out _id field to prevent validation errors
    const { _id, ...updateData } = req.body;
    const doc = await Model.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // Filter out _id field to prevent validation errors
    const { _id, ...createData } = req.body;
    const doc = await Model.create(createData);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// exports.getOne = (Model, popOptions) =>
//   catchAsync(async (req, res, next) => {
//     let query = Model.findById(req.params.id);
//     if (popOptions) query = query.populate(popOptions);
//     const doc = await query;

//     if (!doc) {
//       return next(new AppError('No document found with that ID', 404));
//     }

//     res.status(200).json({
//       status: 'success',
//       data: {
//         data: doc,
//       },
//     });
//   });
exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    // If multiple populate options, apply each separately
    if (popOptions && Array.isArray(popOptions)) {
      popOptions.forEach((opt) => {
        query = query.populate(opt);
      });
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// exports.getOne = (Model, populateOptions) =>
//   catchAsync(async (req, res, next) => {
//     let query = Model.findById(req.params.id);

//     if (populateOptions) {
//       populateOptions.forEach(opt => {
//         query = query.populate(opt);
//       });
//     }

//     const doc = await query;

//     if (!doc) {
//       return next(new AppError('No document found with that ID', 404));
//     }

//     res.status(200).json({
//       status: 'success',
//       data: {
//         data: doc,
//       },
//     });
//   });

// exports.getAll = (Model) =>
//   catchAsync(async (req, res, next) => {
//     // To allow for nested GET reviews on tour (hack)
//     let filter = {};
//     // if (req.params.tourId) filter = { tour: req.params.tourId };
//     // if (req.params.classId) filter = { class: req.params.classId };
//     // if (req.params.parentId) filter = { class: req.params.parentId };
//     //   const filter = req.params.classId ? { class: req.params.classId } : {};
//     // const subjects = await Subject.find(filter);

//     const features = new APIFeatures(Model.find(filter), req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();
//     // const doc = await features.query.explain();
//     const doc = await features.query;

//     // SEND RESPONSE
//     res.status(200).json({
//       status: 'success',
//       results: doc.length,
//       data: {
//         data: doc,
//       },
//     });
//   });

// exports.getAll = (Model, popOptions) =>
//   catchAsync(async (req, res, next) => {
//     let query = Model.find();

//     if (popOptions && Array.isArray(popOptions)) {
//       popOptions.forEach((opt) => {
//         query = query.populate(opt);
//       });
//     }

//     const features = new APIFeatures(query, req.query)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();

//     const doc = await features.query;

//     res.status(200).json({
//       status: 'success',
//       results: doc.length,
//       data: {
//         data: doc,
//       },
//     });
//   });

exports.getAll = (Model, populateOptions, selectFields) =>
  catchAsync(async (req, res, next) => {
    // Build the query with populate options first
    let query = Model.find();

    // Apply populate options if provided
    if (populateOptions && Array.isArray(populateOptions)) {
      populateOptions.forEach((option) => {
        query = query.populate(option);
      });
    }

    // Apply default field selection if provided (can be overridden by query params via APIFeatures.limitFields)
    if (selectFields) {
      query = query.select(selectFields);
    }

    // Apply API features
    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await features.query.lean({ virtuals: true });

    // Get total count for pagination
    const total = await Model.countDocuments();

    res.status(200).json({
      status: 'success',
      results: docs.length,
      total,
      data: {
        data: docs,
      },
    });
  });
