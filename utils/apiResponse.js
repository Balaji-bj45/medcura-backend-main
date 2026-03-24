exports.successResponse = (res, status, data, message) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

exports.errorResponse = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};
