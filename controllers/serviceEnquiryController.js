const enquiryService = require("../services/serviceEnquiryService");
const {
  createEnquirySchema,
  updateStatusSchema,
} = require("../validations/serviceValidation");
const { successResponse } = require("../utils/apiResponse");

exports.create = async (req, res, next) => {
  try {
    const { error } = createEnquirySchema.validate(req.body);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const enquiry = await enquiryService.createEnquiry(req.body);

    return successResponse(res, 201, enquiry, "Enquiry submitted");
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const enquiries = await enquiryService.getAllEnquiries();
    return successResponse(res, 200, enquiries, "Enquiries fetched");
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { error } = updateStatusSchema.validate(req.body);
    if (error)
      throw { statusCode: 400, message: error.details[0].message };

    const updated = await enquiryService.updateStatus(
      req.params.id,
      req.body.status
    );

    return successResponse(res, 200, updated, "Status updated");
  } catch (err) {
    next(err);
  }
};
