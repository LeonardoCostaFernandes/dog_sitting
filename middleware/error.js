const ErrorResponse = require('../utils/errorResponse');
const errorHandler = (err, req, res, next) => {

	//operador spread ... assume todas as propriedades do err
	let error = { ...err };
	error=new ErrorResponse(err.message,err.statusCode);
	// Mongoose bad ObjectId - erro CastError
	if (err.name === 'CastError') {
		const message = `Booking not found withh id of ${err.value}`;
		error = new ErrorResponse(message, 404);
	}

	// Mongoose duplicate key
	if (err.code === 11000) {
		const message = 'Duplicate field value entered';
		error = new ErrorResponse(message, 400);
	}

		// Mongoose validation error
	if (err.name === 'ValidationError') {
		const message = Object.values(err.errors).map(val => val.message);
		error = new ErrorResponse(message, 400);
	}

	res.status(error.statusCode || 500).json({
		success: false,
		error: error.message || 'Server Error'
	});
};
module.exports=errorHandler;