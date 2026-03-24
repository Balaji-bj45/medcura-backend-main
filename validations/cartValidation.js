const Joi = require("joi");

exports.addToCartSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
});

exports.updateQuantitySchema = Joi.object({
  quantity: Joi.number().min(1).required(),
});
