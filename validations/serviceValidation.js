const Joi = require("joi");

exports.createEnquirySchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.string().min(8).required(),
  email: Joi.string().email().allow("").optional(),
  serviceType: Joi.string().required(),
  message: Joi.string().allow("").optional(),
});

exports.updateStatusSchema = Joi.object({
  status: Joi.string().valid("New", "Contacted", "Closed").required(),
});
