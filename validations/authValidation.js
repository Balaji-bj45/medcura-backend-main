const Joi = require("joi");

exports.loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).required(),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

exports.resetPasswordSchema = Joi.object({
  token: Joi.string().min(20).required(),
  password: Joi.string().min(8).required(),
});
