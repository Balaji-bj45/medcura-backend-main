const Joi = require("joi");

const addressBaseSchema = {
  type: Joi.string().valid("Home", "Work", "Others"),
  label: Joi.string().trim().max(60).allow(""),
  line1: Joi.string().trim().max(160),
  line2: Joi.string().trim().max(160).allow(""),
  city: Joi.string().trim().max(80),
  state: Joi.string().trim().max(80),
  postalCode: Joi.string().trim().max(20),
  country: Joi.string().trim().max(80),
  phone: Joi.string().trim().max(20).allow(""),
  isDefault: Joi.boolean(),
};

exports.sendOtpSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  purpose: Joi.string().valid("login", "signup").default("login"),
  fullName: Joi.string()
    .trim()
    .min(2)
    .max(80)
    .when("purpose", {
      is: "signup",
      then: Joi.required(),
      otherwise: Joi.optional().allow(""),
    }),
});

exports.verifyOtpSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string().trim().pattern(/^\d{6}$/).required(),
  purpose: Joi.string().valid("login", "signup").default("login"),
  fullName: Joi.string().trim().min(2).max(80).optional().allow(""),
});

exports.googleAuthSchema = Joi.object({
  credential: Joi.string().trim().required(),
});

exports.customerRegisterSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).required(),
});

exports.customerLoginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).required(),
});

exports.customerForgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

exports.customerResetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(20).required(),
  password: Joi.string().min(8).required(),
});

exports.updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(80).required(),
});

exports.addAddressSchema = Joi.object({
  ...addressBaseSchema,
  type: addressBaseSchema.type.required(),
  line1: addressBaseSchema.line1.required(),
  city: addressBaseSchema.city.required(),
  state: addressBaseSchema.state.required(),
  postalCode: addressBaseSchema.postalCode.required(),
  country: addressBaseSchema.country.required(),
});

exports.updateAddressSchema = Joi.object({
  ...addressBaseSchema,
}).min(1);
