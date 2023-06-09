const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const geocoder = require('../utils/geocoder');

const path = require('path');

// @desc      Register user
// @route     POST /api/v1/auth/register
// @access    Public
exports.register = asyncHandler(async (req, res, next) => {
 const { name, role, email, nif, password, address, phone } = req.body;

 // Create user
 const user = await User.create({
  name,
  role,
  email,
  address,
  phone,
  nif,
  password
 });

  sendTokenResponse(user, 200, res);
});

// @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
 const { email, password } = req.body;

 // Validate emil & password
 if (!email || !password) {
  return next(new ErrorResponse('Please provide an email and password', 400));
 }

 // Check for user
 const user = await User.findOne({ email }).select('+password');

 if (!user) {
  return next(new ErrorResponse('Invalid credentials', 401));
 }

 // Check if password matches
 const isMatch = await user.matchPassword(password);

 if (!isMatch) {
  return next(new ErrorResponse('Invalid credentials', 401));
 }

 console.log(user);
 console.log('user');
 sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
 // Create token
 const token = user.getSignedJwtToken();

 //res.status(200).json({ success: true, token });
 
 const options = {
  expires: new Date(
   Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
  ),
  httpOnly: true
 };

 if (process.env.NODE_ENV === 'production') {
  options.secure = true;
 }

 res
  .status(statusCode)
  .cookie('token', token, options)
  .json({
   success: true,
   token
  });
};

// @desc      Get current logged in user
// @route     POST /api/v1/auth/me
// @access    Private
exports.getMe = asyncHandler(async (req, res, next) => {
 
 const user = await User.findById(req.user.id);

 res.status(200).json({
  success: true,
  data: user
 });
});

// @desc      Log user out / clear cookie
// @route     GET /api/v1/auth/logout
// @access    Private
exports.logout = asyncHandler(async (req, res, next) => {
 res.cookie('token', 'none', {
  expires: new Date(Date.now() + 10 * 1000),
  httpOnly: true
 });

 res.status(200).json({
  success: true,
  data: {}
 });
});

// @desc      Upload photo for user
// @route     PUT /api/v1/:id/photo
// @access    Private
exports.authPhotoUpload = asyncHandler(async (req, res, next) => {
 console.log(req.params.id);
 const auth = await User.findById(req.params.id);
 console.log(auth);
 if (!auth) {
  return next(
   new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
   );
 }

 if (!req.files) {
  return next(new ErrorResponse(`Please upload a file`, 400));
 }

 const file = req.files.file;

 // Make sure the image is a photo
 if (!file.mimetype.startsWith('image')) {
  return next(new ErrorResponse(`Please upload an image file`, 400));
 }

 // Check filesize
 if (file.size > process.env.MAX_FILE_UPLOAD) {
  return next(
   new ErrorResponse(
    `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
    400
   )
  );
 }
 
 // Create custom filename
 file.name = `photo_${auth._id}${path.parse(file.name).ext}`;

 file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
  if (err) {
    console.error(err);
    return next(new ErrorResponse(`Problem with file upload`, 500));
  }

  await User.findByIdAndUpdate(req.params.id, { photo: file.name });

  res.status(200).json({
   success: true,
   data: file.name
  });
 });
 
});

// @desc      Update user
// @route     PUT /api/v1/auth/:id
// @access    Private
exports.updateUser = asyncHandler(async (req, res, next) => {
	console.log("Entering updateUser function");
	const { name, role, email, nif, password, address, phone } = req.body;
	console.log("Request body: ", req.body);

	let user = await User.findById(req.params.id);
	console.log("User found by ID: ", user);

	if (!user) {
		console.log("User not found with id of ", req.params.id);
		return next(
			new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
		);
	}

	// Make sure user is the owner
	if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
		console.log("Not authorized to update this user");
		return next(
			new ErrorResponse(`Not authorized to update this user`, 401)
		);
	}

	user = await User.findByIdAndUpdate(
		req.params.id,
		{
			name,
			role,
			email,
			nif,
			password,
			address,
			phone
		},
		{
			new: true,
			runValidators: true
		}
	);
	console.log("User updated: ", user);

	res.status(200).json({
		success: true,
		data: user
	});
});