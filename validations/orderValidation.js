const Joi = require("joi");

exports.checkoutSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  paymentMethod: Joi.string().trim().optional(),
});
